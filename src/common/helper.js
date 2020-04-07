/**
 * Contains generic helper methods
 */

const _ = require('lodash')
const config = require('config')
const util = require('util')
const ifxnjs = require('ifxnjs')
const logger = require('./logger')
const busApi = require('@topcoder-platform/topcoder-bus-api-wrapper')
const busApiClient = busApi(_.pick(config, ['AUTH0_URL', 'AUTH0_AUDIENCE', 'TOKEN_CACHE_TIME', 'AUTH0_CLIENT_ID',
  'AUTH0_CLIENT_SECRET', 'BUSAPI_URL', 'KAFKA_ERROR_TOPIC', 'AUTH0_PROXY_SERVER_URL']))

const Pool = ifxnjs.Pool
const pool = Promise.promisifyAll(new Pool())
pool.setMaxPoolSize(config.get('INFORMIX.POOL_MAX_SIZE'))

/**
 * Get Informix connection using the configured parameters
 * @return {Object} Informix connection
 */
async function getInformixConnection () {
  // construct the connection string from the configuration parameters.
  const connectionString = 'SERVER=' + config.get('INFORMIX.SERVER') +
    ';DATABASE=' + config.get('INFORMIX.DATABASE') +
    ';HOST=' + config.get('INFORMIX.HOST') +
    ';Protocol=' + config.get('INFORMIX.PROTOCOL') +
    ';SERVICE=' + config.get('INFORMIX.PORT') +
    ';DB_LOCALE=' + config.get('INFORMIX.DB_LOCALE') +
    ';UID=' + config.get('INFORMIX.USER') +
    ';PWD=' + config.get('INFORMIX.PASSWORD')
  const conn = await pool.openAsync(connectionString)
  return Promise.promisifyAll(conn)
}

/**
 * Get Kafka options
 * @return {Object} the Kafka options
 */
function getKafkaOptions () {
  const options = { connectionString: config.KAFKA_URL, groupId: config.KAFKA_GROUP_ID }
  if (config.KAFKA_CLIENT_CERT && config.KAFKA_CLIENT_CERT_KEY) {
    options.ssl = { cert: config.KAFKA_CLIENT_CERT, key: config.KAFKA_CLIENT_CERT_KEY }
  }
  return options
}

/**
 * Remove invalid properties from the object and hide long arrays
 * @param {Object} obj the object
 * @returns {Object} the new object with removed properties
 * @private
 */
function _sanitizeObject (obj) {
  try {
    return JSON.parse(JSON.stringify(obj, (name, value) => {
      if (_.isArray(value) && value.length > 30) {
        return `Array(${value.length})`
      }
      return value
    }))
  } catch (e) {
    return obj
  }
}

/**
 * Convert the object into user-friendly string which is used in error message.
 * @param {Object} obj the object
 * @returns {String} the string value
 */
function toString (obj) {
  return util.inspect(_sanitizeObject(obj), { breakLength: Infinity })
}

/**
 * Converts the sepcified date to Informix date format.
 *
 * @param {String} date The string date to format - expected input format 'YYYY-MM-DDTHH:mm:ss.lZ'
 * @returns {String} The date formated as 'YYYY-MM-DD HH:mm:ss'
 */
function convertDateToInformixFormat (date) {
  return new Date(date).toISOString().slice(0, 19).replace('T', ' ')
}

/**
 * Send an email
 * @param {Object} params the parameters, include from address, to address, subject and etc.
 */
async function sendEmail (params) {
  let eventMessage = {
    data: params,
    version: 'v3',
    recipients: [params.toAddress],
    from: {
      name: 'Terms Legacy Processor',
      email: params.fromAddress
    }
  }
  postEvent(config.TERMS_LEGACY_PROCESSOR_EMAIL_SUPPORT_TOPIC, { payload: eventMessage }).then(() => {
    logger.info(`Successfully sent ${config.TERMS_LEGACY_PROCESSOR_EMAIL_SUPPORT_TOPIC} event` +
      ` with body ${JSON.stringify(eventMessage)} to bus api`)
  }).catch((err) => {
    logger.error(`Failed to send ${config.TERMS_LEGACY_PROCESSOR_EMAIL_SUPPORT_TOPIC} event` +
      `; error: ${err.message}` +
      `; with body ${JSON.stringify(eventMessage)} to bus api`)
    logger.logFullError(err)
  })
}

/**
 * Send Kafka event message
 * @params {String} topic the topic name
 * @params {Object} payload the payload
 */
async function postEvent (topic, payload) {
  logger.info(`Publish event to Kafka topic ${topic}`)
  const message = {
    topic,
    originator: config.KAFKA_MESSAGE_ORIGINATOR,
    timestamp: new Date().toISOString(),
    'mime-type': 'application/json',
    payload
  }
  await busApiClient.postEvent(message)
}

module.exports = {
  getKafkaOptions,
  getInformixConnection,
  convertDateToInformixFormat,
  toString,
  sendEmail
}
