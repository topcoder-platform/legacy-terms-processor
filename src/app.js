/**
 * The application entry point
 */

require('./bootstrap')
const config = require('config')
const Kafka = require('no-kafka')
const healthcheck = require('topcoder-healthcheck-dropin')
const logger = require('./common/logger')
const helper = require('./common/helper')
const termsOfUseService = require('./services/TermsOfUseService')
const resourceTermsOfUseService = require('./services/ResourceTermsOfUseService')
const userTermsOfUseService = require('./services/UserTermsOfUseService')
const docusignEnvelopeService = require('./services/DocusignEnvelopeService')

// Start kafka consumer
logger.info('Starting kafka consumer')
// create consumer

const consumer = new Kafka.GroupConsumer(helper.getKafkaOptions())

/*
 * Data handler linked with Kafka consumer
 * Whenever a new message is received by Kafka consumer,
 * this function will be invoked
 */
const dataHandler = (messageSet, topic, partition) => Promise.each(messageSet, async (m) => {
  const message = m.message.value.toString('utf8')
  logger.info(`Handle Kafka event message; Topic: ${topic}; Partition: ${partition}; Offset: ${
    m.offset}; Message: ${message}.`)
  let messageJSON
  try {
    messageJSON = JSON.parse(message)
  } catch (e) {
    logger.error('Invalid message JSON.')
    logger.logFullError(e)

    // commit the message and ignore it
    await consumer.commitOffset({ topic, partition, offset: m.offset })
    return
  }

  if (messageJSON.topic !== topic) {
    logger.error(`The message topic ${messageJSON.topic} doesn't match the Kafka topic ${topic}.`)

    // commit the message and ignore it
    await consumer.commitOffset({ topic, partition, offset: m.offset })
    return
  }

  try {
    switch (topic) {
      case config.CREATE_TERMS_TOPIC:
        await termsOfUseService.create(messageJSON)
        break
      case config.UPDATE_TERMS_TOPIC:
        await termsOfUseService.update(messageJSON)
        break
      case config.DELETE_TERMS_TOPIC:
        await termsOfUseService.remove(messageJSON)
        break
      case config.CREATE_RESOURCE_TERMS_TOPIC:
        await resourceTermsOfUseService.create(messageJSON)
        break
      case config.UPDATE_RESOURCE_TERMS_TOPIC:
        await resourceTermsOfUseService.update(messageJSON)
        break
      case config.DELETE_RESOURCE_TERMS_TOPIC:
        await resourceTermsOfUseService.remove(messageJSON)
        break
      case config.USER_AGREED_TERMS_TOPIC:
        await userTermsOfUseService.agreeTermsOfUse(messageJSON)
        break
      case config.CREATE_DOCUSIGN_ENVELOPE_TOPIC:
        await docusignEnvelopeService.create(messageJSON)
        break
      case config.UPDATE_DOCUSIGN_ENVELOPE_TOPIC:
        await docusignEnvelopeService.update(messageJSON)
        break
    }
    logger.debug('Successfully processed message')
  } catch (err) {
    logger.logFullError(err)
  } finally {
    // Commit offset regardless of error
    await consumer.commitOffset({ topic, partition, offset: m.offset })
  }
})

// check if there is kafka connection alive
const check = () => {
  if (!consumer.client.initialBrokers && !consumer.client.initialBrokers.length) {
    return false
  }
  let connected = true
  consumer.client.initialBrokers.forEach(conn => {
    logger.debug(`url ${conn.server()} - connected=${conn.connected}`)
    connected = conn.connected & connected
  })
  return connected
}

const topics = [
  config.CREATE_TERMS_TOPIC,
  config.UPDATE_TERMS_TOPIC,
  config.DELETE_TERMS_TOPIC,
  config.CREATE_RESOURCE_TERMS_TOPIC,
  config.UPDATE_RESOURCE_TERMS_TOPIC,
  config.DELETE_RESOURCE_TERMS_TOPIC,
  config.USER_AGREED_TERMS_TOPIC,
  config.CREATE_DOCUSIGN_ENVELOPE_TOPIC,
  config.UPDATE_DOCUSIGN_ENVELOPE_TOPIC
]

consumer
  .init([{
    subscriptions: topics,
    handler: dataHandler
  }])
  // consume configured topics
  .then(() => {
    logger.info('Initialized.......')
    healthcheck.init([check])
    logger.info('Adding topics successfully.......')
    logger.info(topics)
    logger.info('Kick Start.......')
  })
  .catch((err) => logger.error(err))
