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
      docusign_envelop_id: payload.id,
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
      id: Joi.string().required(),
      docusignTemplateId: Joi.string().required(),
      userId: Joi.id().required(),
      isCompleted: Joi.id().required()
    }).unknown(true).required()
  }).unknown(true).required()
}

module.exports = {
  create
}

logger.buildService(module.exports)
