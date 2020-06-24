/**
 * This service provides functions for handling user terms of use messages
 */

const _ = require('lodash')
const Joi = require('@hapi/joi')
const logger = require('../common/logger')
const helper = require('../common/helper')
const { InformixTableNames, AgreeabilityTypes } = require('../constants')
const informixService = require('../services/InformixService')
const config = require('config')

/**
 * Handles the agree terms of use message.
 *
 * @param {Object} message The kakfa event message to handle
 */
async function agreeTermsOfUse (message) {
  const whereCondition = { terms_of_use_id: message.payload.termsOfUseId }

  // get informix connection
  const connection = await helper.getInformixConnection()
  try {
    await connection.beginTransactionAsync()

    // Get the terms of use from the database
    const termsOfUse = await informixService.ensureExists(connection, InformixTableNames.TermsOfUse, whereCondition)

    if (Number(termsOfUse.terms_of_use_agreeability_type_id) !== AgreeabilityTypes.ElectronicallyAgreeable.id) {
      throw Error(`The term with id ${message.payload.termsOfUseId} is not electronically agreeable.`)
    }

    // Check if the user has already agreed to the terms
    const agreedRecords = await informixService.searchRecords(connection, InformixTableNames.UserTermsOfUseXref,
      _.assign(whereCondition, { user_id: message.payload.userId }))

    if (agreedRecords.length > 0) {
      throw Error(`User with id ${message.payload.userId} has already agreed to terms with id ${message.payload.termsOfUseId}`)
    }

    // Check if user has agreed to all dependent terms of use
    const termsDependencies = await informixService.getTermsOfUseDependency(connection, message.payload.termsOfUseId, message.payload.userId)
    for (let dependency of termsDependencies) {
      if (_.isUndefined(dependency.user_id)) {
        throw Error(`You can't agree to this terms of use before you have agreed to all the dependencies terms of use.`)
      }
    }

    // Check whether the user is banned
    const ban = await informixService.searchRecords(connection, InformixTableNames.UserTermsOfUseBanXref, {
      ...whereCondition, ...{ user_id: message.payload.userId }
    })

    if (ban.length > 0) {
      throw Error(`User with id ${message.payload.userId} is banned from agreeing to terms with id ${message.payload.termsOfUseId}`)
    }

    // Insert the record to user terms of use Xref table to make user agreed to terms
    const createdAt = helper.convertDateToInformixFormat(message.payload.created)
    await informixService.insertRecord(connection, InformixTableNames.UserTermsOfUseXref, {
      user_id: message.payload.userId,
      terms_of_use_id: message.payload.termsOfUseId,
      create_date: createdAt,
      modify_date: createdAt
    })

    // commit the transaction
    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error('Error in processing create terms of use event')
    await connection.rollbackTransactionAsync()
    await helper.sendEmail(_.assign({
      subject: config.EMAIL_SUBJECTS.USER_TERMS_OF_USE,
      toAddress: config.ERROR_EMAIL_RECIPIENT,
      fromAddress: config.ERROR_EMAIL_SENDER,
      message: e.message
    }, message.payload))
    throw e
  } finally {
    await connection.closeAsync()
  }
}

agreeTermsOfUse.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      userId: Joi.id().required(),
      termsOfUseId: Joi.string().required(),
      created: Joi.date()
    }).unknown(true).required()
  }).unknown(true).required()
}

module.exports = {
  agreeTermsOfUse
}

logger.buildService(module.exports)
