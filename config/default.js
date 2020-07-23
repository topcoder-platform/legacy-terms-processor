/**
 * The default configuration file.
 */

module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',

  KAFKA_URL: process.env.KAFKA_URL || 'localhost:9092',
  // below are used for secure Kafka connection, they are optional
  // for the local Kafka, they are not needed
  KAFKA_CLIENT_CERT: process.env.KAFKA_CLIENT_CERT,
  KAFKA_CLIENT_CERT_KEY: process.env.KAFKA_CLIENT_CERT_KEY,

  // Kafka group id
  KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID || 'legacy-terms-processor',
  KAFKA_ERROR_TOPIC: process.env.KAFKA_ERROR_TOPIC || 'common.error.reporting',

  CREATE_TERMS_TOPIC: process.env.CREATE_TERMS_TOPIC || 'terms.notification.created',
  UPDATE_TERMS_TOPIC: process.env.UPDATE_TERMS_TOPIC || 'terms.notification.updated',
  DELETE_TERMS_TOPIC: process.env.DELETE_TERMS_TOPIC || 'terms.notification.deleted',

  CREATE_RESOURCE_TERMS_TOPIC: process.env.CREATE_RESOURCE_TERMS_TOPIC || 'terms.notification.resource.created',
  UPDATE_RESOURCE_TERMS_TOPIC: process.env.UPDATE_RESOURCE_TERMS_TOPIC || 'terms.notification.resource.updated',
  DELETE_RESOURCE_TERMS_TOPIC: process.env.DELETE_RESOURCE_TERMS_TOPIC || 'terms.notification.resource.deleted',

  CREATE_DOCUSIGN_ENVELOPE_TOPIC: process.env.CREATE_DOCUSIGN_ENVELOPE_TOPIC || 'terms.notification.docusign.envelope.created',

  USER_AGREED_TERMS_TOPIC: process.env.USER_AGREED_TERMS_TOPIC || 'terms.notification.user.agreed',
  TERMS_LEGACY_PROCESSOR_EMAIL_SUPPORT_TOPIC: process.env.TERMS_LEGACY_PROCESSOR_EMAIL_SUPPORT_TOPIC || 'terms.legacy.processor.action.email.support',

  // bus API config params
  BUSAPI_URL: process.env.BUSAPI_URL || 'https://api.topcoder-dev.com/v5',

  AUTH0_URL: process.env.AUTH0_URL || 'https://topcoder-dev.auth0.com/oauth/token',
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || 'https://m2m.topcoder-dev.com/',
  TOKEN_CACHE_TIME: process.env.TOKEN_CACHE_TIME || 90,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID || '',
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET || '',
  AUTH0_PROXY_SERVER_URL: process.env.AUTH0_PROXY_SERVER_URL,

  EMAIL_SUBJECTS: {
    TERMS_OF_USE: process.env.TERMS_OF_USE_ERROR_EMAIL_SUBJECT || 'Terms of use error subject',
    RESOURCE_TERMS: process.env.RESOURCE_TERMS_ERROR_EMAIL_SUBJECT || 'Resource Terms error subject',
    USER_TERMS_OF_USE: process.env.USER_TERMS_OF_USE_ERROR_EMAIL_SUBJECT || 'User terms of use error subject',
    DOCUSIGN_ENVELOPE: process.env.DOCUSIGN_ENVELOPE_ERROR_EMAIL_SUBJECT || 'Docusign Envelope error subject'
  },

  ERROR_EMAIL_RECIPIENT: process.env.ERROR_EMAIL_RECIPIENT || 'test-support@topcoder.com',
  ERROR_EMAIL_SENDER: process.env.ERROR_EMAIL_SENDER || 'sender@topcoder.com',

  KAFKA_MESSAGE_ORIGINATOR: process.env.KAFKA_MESSAGE_ORIGINATOR || 'legacy-terms-processor',

  // informix database configuration
  INFORMIX: {
    SERVER: process.env.INFORMIX_SERVER || 'informixoltp_tcp', // informix server
    DATABASE: process.env.INFORMIX_DATABASE || 'tcs_catalog', // informix database
    HOST: process.env.INFORMIX_HOST || 'localhost', // host
    PROTOCOL: process.env.INFORMIX_PROTOCOL || 'onsoctcp',
    PORT: process.env.INFORMIX_PORT || '2021', // port
    DB_LOCALE: process.env.INFORMIX_DB_LOCALE || 'en_US.57372',
    USER: process.env.INFORMIX_USER || 'informix', // user
    PASSWORD: process.env.INFORMIX_PASSWORD || '1nf0rm1x', // password
    POOL_MAX_SIZE: parseInt(process.env.INFORMIX_POOL_MAX_SIZE) || 10 // use connection pool in processor, the pool size
  }
}
