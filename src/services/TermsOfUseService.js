/**
 * This service provides fuctions for handling the terms of use related messages
 */

const logger = require('../common/logger')
const helper = require('../common/helper')
const { InformixTableNames, AgreeabilityTypes } = require('../constants')
const informixService = require('./InformixService')
const Joi = require('@hapi/joi')
const _ = require('lodash')
const config = require('config')

/**
 * Handles the create terms of use message.
 *
 * @param {Object} message The kakfa event message to handle
 */
async function create (message) {
  const termsOfUse = message.payload
  // get informix connection
  const connection = await helper.getInformixConnection()
  try {
    await connection.beginTransactionAsync()

    // validate the terms of use data
    await validateTermsOfUse(connection, termsOfUse, false)

    // convert the date to Informix format
    const creationDate = helper.convertDateToInformixFormat(termsOfUse.created)

    await informixService.insertRecord(connection, 'common_oltp:terms_of_use', {
      terms_of_use_id: termsOfUse.id,
      terms_text: { DataType: 'TEXT', Data: termsOfUse.text },
      terms_of_use_type_id: termsOfUse.typeId,
      create_date: creationDate,
      modify_date: creationDate,
      title: termsOfUse.title,
      url: termsOfUse.url,
      terms_of_use_agreeability_type_id: termsOfUse.agreeabilityTypeId
    })

    if (!_.isNil(termsOfUse.docusignTemplateId) && termsOfUse.agreeabilityTypeId === AgreeabilityTypes.Docusignable.id) {
      await informixService.insertRecord(connection, InformixTableNames.TermsOfUseDocusignTemplateXref, {
        terms_of_use_id: termsOfUse.id,
        docusign_template_id: termsOfUse.docusignTemplateId
      })
    }

    // commit the transaction
    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error('Error in processing create terms of use event')
    await connection.rollbackTransactionAsync()
    await helper.sendEmail(_.assign({
      subject: config.EMAIL_SUBJECTS.TERMS_OF_USE,
      toAddress: config.ERROR_EMAIL_RECIPIENT,
      fromAddress: config.ERROR_EMAIL_SENDER,
      message: e.message
    }, termsOfUse))
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
      id: Joi.id().required(),
      text: Joi.string().default(null),
      typeId: Joi.id().required(),
      created: Joi.date(),
      updated: Joi.date(),
      title: Joi.string().required(),
      url: Joi.string().default(null),
      agreeabilityTypeId: Joi.id().required(),
      docusignTemplateId: Joi.when('agreeabilityTypeId', {
        is: AgreeabilityTypes.Docusignable.id,
        then: Joi.string().required(),
        otherwise: Joi.string()
      })
    }).unknown(true).required()
  }).unknown(true).required()
}

/**
 * Perform validation on terms of use data
 * @params {Object} termsOfUse the terms of use
 */
async function validateTermsOfUse (connection, termsOfUse, isUpdate) {
  // Ensure that terms of use to update exists in the database in case of update
  if (isUpdate) {
    await informixService.ensureExists(connection, InformixTableNames.TermsOfUse, { terms_of_use_id: termsOfUse.id })
  }

  await informixService.ensureExists(connection, InformixTableNames.TermsOfUseAgreeabilityType, {
    terms_of_use_agreeability_type_id: termsOfUse.agreeabilityTypeId
  })

  await informixService.ensureExists(connection, InformixTableNames.TermsOfUseType, {
    terms_of_use_type_id: termsOfUse.typeId
  })
}

/**
 * Handles the update terms of use message.
 *
 * @param {Object} message The kakfa event message to handle
 */
async function update (message) {
  const termsOfUse = message.payload
  // get informix connection
  const connection = await helper.getInformixConnection()
  try {
    await connection.beginTransactionAsync()

    // validate terms of use data
    await validateTermsOfUse(connection, termsOfUse, true)

    // Get the existing docusign template Xref for this terms of use
    let docusignTemplateXref = await informixService.searchRecords(connection,
      InformixTableNames.TermsOfUseDocusignTemplateXref, { terms_of_use_id: termsOfUse.id })

    docusignTemplateXref = docusignTemplateXref.length > 0 ? docusignTemplateXref[0] : null

    if (!_.isUndefined(termsOfUse.docusignTemplateId) && termsOfUse.agreeabilityTypeId === AgreeabilityTypes.Docusignable.id) {
      if (_.isNull(docusignTemplateXref)) {
        // We create a new record in docusign template Xref table
        await informixService.insertRecord(connection, InformixTableNames.TermsOfUseDocusignTemplateXref, {
          terms_of_use_id: termsOfUse.id,
          docusign_template_id: termsOfUse.docusignTemplateId
        })
      } else {
        // The docusign templateXref record exist, we update it
        await informixService.updateRecord(connection, InformixTableNames.TermsOfUseDocusignTemplateXref,
          { docusign_template_id: termsOfUse.docusignTemplateId }, { terms_of_use_id: termsOfUse.id })
      }
    } else {
      // docusignTemplateId is not provided in the payload
      // This means that if there is docusign template xref record it should be remove
      if (!_.isNull(docusignTemplateXref)) {
        // We remove the docusign template Xref record
        await informixService.deleteRecords(connection, InformixTableNames.TermsOfUseDocusignTemplateXref, {
          terms_of_use_id: termsOfUse.id
        })
      }
    }

    // Update the terms_of_use record
    await informixService.updateRecord(connection, 'common_oltp:terms_of_use', {
      terms_text: { DataType: 'TEXT', Data: termsOfUse.text },
      terms_of_use_type_id: termsOfUse.typeId,
      title: termsOfUse.title,
      url: termsOfUse.url,
      terms_of_use_agreeability_type_id: termsOfUse.agreeabilityTypeId,
      create_date: helper.convertDateToInformixFormat(termsOfUse.created),
      modify_date: helper.convertDateToInformixFormat(termsOfUse.updated)
    }, { terms_of_use_id: termsOfUse.id })

    // commit the transaction
    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error('Error in processing update terms of use event')
    await connection.rollbackTransactionAsync()
    await helper.sendEmail(_.assign({
      subject: config.EMAIL_SUBJECTS.TERMS_OF_USE,
      toAddress: config.ERROR_EMAIL_RECIPIENT,
      fromAddress: config.ERROR_EMAIL_SENDER,
      message: e.message
    }, termsOfUse))
    throw e
  } finally {
    await connection.closeAsync()
  }
}

update.schema = create.schema

/**
 * Handles the delete terms of use message.
 *
 * @param {Object} message The kakfa event message to handle
 */
async function remove (message) {
  const whereCondition = { terms_of_use_id: message.payload.termsOfUseId }

  // get informix connection
  const connection = await helper.getInformixConnection()
  try {
    await connection.beginTransactionAsync()

    // Check if the terms of use to delete actually exists
    await informixService.ensureExists(connection, InformixTableNames.TermsOfUse, whereCondition)

    // delete the docusign template Xref records for the terms of of use if present
    await informixService.deleteRecords(connection, InformixTableNames.TermsOfUseDocusignTemplateXref, whereCondition)

    // cleanup terms of use dependency table
    await informixService.deleteRecords(connection, InformixTableNames.TermsOfUseDependency, {
      dependency_terms_of_use_id: message.payload.termsOfUseId
    })
    await informixService.deleteRecords(connection, InformixTableNames.TermsOfUseDependency, {
      dependent_terms_of_use_id: message.payload.termsOfUseId
    })

    // Clean the ProjectRoleTermsOfUseXref table
    await informixService.deleteRecords(connection, InformixTableNames.ProjectRoleTermsOfUseXref, whereCondition)

    // clean the UserTermsOfUseXref table
    await informixService.deleteRecords(connection, InformixTableNames.UserTermsOfUseXref, whereCondition)

    // clean the UserTermsOfUseBanXref
    await informixService.deleteRecords(connection, InformixTableNames.UserTermsOfUseBanXref, whereCondition)

    // Delete the terms of use record
    await informixService.deleteRecords(connection, InformixTableNames.TermsOfUse, whereCondition)

    // commit the transaction
    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error('Error in processing update terms of use event')
    await connection.rollbackTransactionAsync()
    await helper.sendEmail(_.assign({
      subject: config.EMAIL_SUBJECTS.TERMS_OF_USE,
      toAddress: config.ERROR_EMAIL_RECIPIENT,
      fromAddress: config.ERROR_EMAIL_SENDER,
      message: e.message
    }, { termsOfUseId: message.payload.termsOfUseId }))
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
      termsOfUseId: Joi.id().required()
    }).unknown(true).required()
  }).unknown(true).required()
}

module.exports = {
  create,
  update,
  remove
}

logger.buildService(module.exports)
