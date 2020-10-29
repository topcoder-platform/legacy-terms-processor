/**
 * This service provides functions for handling the resource terms of use
 */

const _ = require('lodash')
const Joi = require('@hapi/joi')
const logger = require('../common/logger')
const helper = require('../common/helper')
const { InformixTableNames } = require('../constants')
const informixService = require('../services/InformixService')
const config = require('config')

/**
 * Handles the create resource terms of use message.
 *
 * @param {Object} message The kakfa event message to handle
 */
async function create (message) {
  const payload = message.payload
  // get informix connection
  const connection = await helper.getInformixConnection()
  try {
    await connection.beginTransactionAsync()

    // Check if the specified terms of use ids exist in the database
    await informixService.validateTermsOfUseIds(connection, payload.termsOfUseIds)

    // Get the resource role from the database by resource role name (tag)
    const resourceRole = await informixService.ensureExists(connection, InformixTableNames.ResourceRoles, {
      name: payload.tag
    })
    const resourceRoleId = resourceRole.resource_role_id

    // validate duplicate resource terms
    const existingResourceTerms = await informixService.getExistingResourceTerms(connection, Number(payload.referenceId), resourceRoleId, payload.termsOfUseIds)
    if (existingResourceTerms.length > 0) {
      throw Error(`The following resource terms already exist ${helper.toString(existingResourceTerms)}`)
    }

    const createdAt = helper.convertDateToInformixFormat(payload.created)

    // create resource terms
    const promises = payload.termsOfUseIds.map(termsOfUseId => {
      informixService.insertRecord(connection, InformixTableNames.ProjectRoleTermsOfUseXref, {
        project_id: Number(payload.referenceId),
        resource_role_id: resourceRoleId,
        terms_of_use_id: termsOfUseId,
        create_date: createdAt,
        modify_date: createdAt
      })
    })

    await Promise.all(promises)

    // commit the transaction
    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error('Error in processing create terms of use event')
    await connection.rollbackTransactionAsync()
    await helper.sendEmail(_.assign({
      subject: config.EMAIL_SUBJECTS.RESOURCE_TERMS,
      toAddress: config.ERROR_EMAIL_RECIPIENT,
      fromAddress: config.ERROR_EMAIL_SENDER,
      message: e.message
    }, payload))
    throw e
  } finally {
    await connection.closeAsync()
  }
}

create.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      reference: Joi.string(),
      referenceId: Joi.string().regex(/^\d+$/).required(),
      tag: Joi.string().required(),
      termsOfUseIds: Joi.array().items(Joi.id().required()).unique().min(1).required(),
      created: Joi.date().required()
    }).unknown(true).required()
  }).unknown(true).required()
}

/**
 * Handles the update resource terms message.
 *
 * @param {Object} message The kakfa event message to handle
 */
async function update (message) {
  const payload = message.payload
  // get informix connection
  const connection = await helper.getInformixConnection()
  try {
    await connection.beginTransactionAsync()

    // Check if the specified terms of use ids exist in the database
    await informixService.validateTermsOfUseIds(connection, payload.termsOfUseIds)

    // Get the resource role from the database by resource role name (tag)
    const resourceRole = await informixService.ensureExists(connection, InformixTableNames.ResourceRoles, {
      name: payload.tag
    })
    const resourceRoleId = resourceRole.resource_role_id

    // Get the existing resource terms
    const existingResourceTerms = await informixService.getExistingResourceTerms(connection, Number(payload.referenceId), resourceRoleId)
    const existingResourceTermsIds = _.map(existingResourceTerms, r => Number(r.terms_of_use_id))

    const termsToAddIds = _.difference(payload.termsOfUseIds, existingResourceTermsIds)
    const termsToRemoveIds = _.difference(existingResourceTermsIds, payload.termsOfUseIds)

    const removeTermsPromises = termsToRemoveIds.map(id => {
      informixService.deleteRecords(connection, InformixTableNames.ProjectRoleTermsOfUseXref, {
        project_id: Number(payload.referenceId),
        resource_role_id: resourceRoleId,
        terms_of_use_id: id
      })
    })

    await Promise.all(removeTermsPromises)

    // add new resource terms of use
    const addTermsPromises = termsToAddIds.map(termsOfUseId => {
      informixService.insertRecord(connection, InformixTableNames.ProjectRoleTermsOfUseXref, {
        project_id: Number(payload.referenceId),
        resource_role_id: resourceRoleId,
        terms_of_use_id: termsOfUseId,
        create_date: helper.convertDateToInformixFormat(payload.created),
        modify_date: helper.convertDateToInformixFormat(payload.updated)
      })
    })

    await Promise.all(addTermsPromises)

    // commit the transaction
    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error('Error in processing update terms of use event')
    await connection.rollbackTransactionAsync()
    await helper.sendEmail(_.assign({
      subject: config.EMAIL_SUBJECTS.RESOURCE_TERMS,
      toAddress: config.ERROR_EMAIL_RECIPIENT,
      fromAddress: config.ERROR_EMAIL_SENDER,
      message: e.message
    }, payload))
    throw e
  } finally {
    await connection.closeAsync()
  }
}

update.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      reference: Joi.string(),
      referenceId: Joi.string().regex(/^\d+$/).required(),
      tag: Joi.string().required(),
      termsOfUseIds: Joi.array().items(Joi.id().required()).unique().min(1).required(),
      created: Joi.date().required(),
      updated: Joi.date().required()
    }).unknown(true).required()
  }).unknown(true).required()
}

/**
 * Handles the delete resource terms message.
 *
 * @param {Object} message The kakfa event message to handle
 */
async function remove (message) {
  const payload = message.payload
  // get informix connection
  const connection = await helper.getInformixConnection()
  try {
    await connection.beginTransactionAsync()

    // Check if the specified terms of use ids exist in the database
    await informixService.validateTermsOfUseIds(connection, payload.termsOfUseIds)

    // Get the resource role from the database by resource role name (tag)
    const resourceRole = await informixService.ensureExists(connection, InformixTableNames.ResourceRoles, {
      name: payload.tag
    })
    const resourceRoleId = resourceRole.resource_role_id

    const promises = payload.termsOfUseIds.map(id => {
      informixService.deleteRecords(connection, InformixTableNames.ProjectRoleTermsOfUseXref, {
        project_id: Number(payload.referenceId),
        resource_role_id: resourceRoleId,
        terms_of_use_id: id
      })
    })

    await Promise.all(promises)

    // commit the transaction
    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error('Error in processing delete terms of use event')
    await connection.rollbackTransactionAsync()
    await helper.sendEmail(_.assign({
      subject: config.EMAIL_SUBJECTS.RESOURCE_TERMS,
      toAddress: config.ERROR_EMAIL_RECIPIENT,
      fromAddress: config.ERROR_EMAIL_SENDER,
      message: e.message
    }, payload))
    throw e
  } finally {
    await connection.closeAsync()
  }
}

remove.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      reference: Joi.string(),
      referenceId: Joi.string().regex(/^\d+$/).required(),
      tag: Joi.string().required(),
      termsOfUseIds: Joi.array().items(Joi.id().required()).unique().min(1).required()
    }).unknown(true).required()
  }).unknown(true).required()
}

module.exports = {
  create,
  update,
  remove
}

logger.buildService(module.exports)
