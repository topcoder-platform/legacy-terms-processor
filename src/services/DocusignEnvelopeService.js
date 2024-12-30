/**
 * This service provides function for docusign envelope management.
 */

const _ = require('lodash')
const Joi = require('@hapi/joi')
const logger = require('../common/logger')
const helper = require('../common/helper')
const { InformixTableNames } = require('../constants')
const informixService = require('../services/InformixService')
const config = require('config')

/**
 * This function handles the message  for docusign envelope creation.
 *
 * @param {Object} message The kafka event message for create docusign envelope
 */
async function create (message) {
  const payload = message.payload

  // get informix connection
  const connection = await helper.getInformixConnection()
  try {
    await connection.beginTransactionAsync()

    await informixService.insertRecord(connection, InformixTableNames.DocusignEnvelope, {
      docusign_envelope_id: payload.id,
      docusign_template_id: payload.docusignTemplateId,
      user_id: payload.userId,
      is_completed: payload.isCompleted
    })

    // commit the transaction
    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error('Error in processing create terms of use event')
    await connection.rollbackTransactionAsync()
    await helper.sendEmail(_.assign({
      subject: config.EMAIL_SUBJECTS.DOCUSIGN_ENVELOPE,
      toAddress: config.ERROR_EMAIL_RECIPIENT,
      fromAddress: config.ERROR_EMAIL_SENDER,
      message: e.message
    }, message.payload))
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
      id: Joi.uuid().required(),
      docusignTemplateId: Joi.string().required(),
      userId: Joi.id().required(),
      isCompleted: Joi.number().default(0)
    }).unknown(true).required()
  }).unknown(true).required()
}


/**
 * This function handles the message  for docusign envelope updates, namely when an envelope is completed.
 * Not sure why there are two embedded "payload" objects in the message, but we'll have to roll with it
 *
 * @param {Object} message The kafka event message for update of a docusign envelope
 */
async function update (message) {
  const payload = message.payload.payload

  if(payload.status!='Completed'){
    logger.info(`Ignoring envelope update message that does not have a "Completed" status: ${JSON.stringify(payload)}`)
    return
  }

  // get informix connection
  const connection = await helper.getInformixConnection()
  try {
    await connection.beginTransactionAsync()

    // Update the terms_of_use record
    await informixService.updateRecord(connection, InformixTableNames.DocusignEnvelope, {
      is_completed: true
    }, { docusign_envelope_id: payload.envelope_id })

    // commit the transaction
    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in updating docusign envelope: ${JSON.stringify(e)}`)
    await connection.rollbackTransactionAsync()
    await helper.sendEmail(_.assign({
      subject: config.EMAIL_SUBJECTS.DOCUSIGN_ENVELOPE,
      toAddress: config.ERROR_EMAIL_RECIPIENT,
      fromAddress: config.ERROR_EMAIL_SENDER,
      message: e.message
    }, message.payload))
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
      payload: Joi.object().keys({
        envelopeId: Joi.uuid().required(),
        status: Joi.string().required()
      }).unknown(true).required()
    }).unknown(true).required()
  }).unknown(true).required()
}

module.exports = {
  create,
  update
}