# Topcoder - Legacy Terms Processor

## Dependencies

- nodejs https://nodejs.org/en/ (v10)
- Kafka
- Informix
- Docker, Docker Compose

## Configuration

Configuration for the legacy terms processor is at `config/default.js`.
The following parameters can be set in config files or in env variables:
- LOG_LEVEL: the log level; default value: 'debug'
- KAFKA_URL: comma separated Kafka hosts; default value: 'localhost:9092'
- KAFKA_CLIENT_CERT: Kafka connection certificate, optional; default value is undefined;
    if not provided, then SSL connection is not used, direct insecure connection is used;
    if provided, it can be either path to certificate file or certificate content
- KAFKA_CLIENT_CERT_KEY: Kafka connection private key, optional; default value is undefined;
    if not provided, then SSL connection is not used, direct insecure connection is used;
    if provided, it can be either path to private key file or private key content
- KAFKA_GROUP_ID: the Kafka group id, default value is 'legacy-challenge-processor'
- KAFKA_ERROR_TOPIC: The kafka error topic.
- CREATE_TERMS_TOPIC: The create terms kafka topic
- UPDATE_TERMS_TOPIC: The update terms kafka topic
- DELETE_TERMS_TOPIC: The delete terms kafka topic
- CREATE_RESOURCE_TERMS_TOPIC: The create resource terms kafka topic
- UPDATE_RESOURCE_TERMS_TOPIC: The update resource terms kafka topic
- DELETE_RESOURCE_TERMS_TOPIC: The delete resource terms kafka topic
- CREATE_DOCUSIGN_ENVELOPE_TOPIC: The create docusign envelope kafka topic
- USER_AGREED_TERMS_TOPIC: The user agreed to terms kafka topic
- TERMS_LEGACY_PROCESSOR_EMAIL_SUPPORT_TOPIC: The terms legacy processor support email kafka topic
- BUSAPI_URL: The event bus API URL
- AUTH0_URL: Auth0 URL, used to get TC M2M token
- AUTH0_AUDIENCE: Auth0 audience, used to get TC M2M token
- TOKEN_CACHE_TIME: Auth0 token cache time, used to get TC M2M token
- AUTH0_CLIENT_ID: Auth0 client id, used to get TC M2M token
- AUTH0_CLIENT_SECRET: Auth0 client secret, used to get TC M2M token
- AUTH0_PROXY_SERVER_URL: Proxy Auth0 URL, used to get TC M2M token
- EMAIL_SUBJECTS: The email subjects to be used when sending error emails, see `config/default.js` for more details
- ERROR_EMAIL_RECIPIENT: The error email recipient
- ERROR_EMAIL_SENDER: The error email sender
- KAFKA_MESSAGE_ORIGINATOR: The originator of kafka messages sent when error occur
- INFORMIX: Informix database configuration parameters, refer to `config/default.js` for more information

There is a `/health` endpoint that checks for the health of the app. This sets up an expressjs server and listens on the environment variable `PORT`. It's not part of the configuration file and needs to be passed as an environment variable

## Local Setup
All the dependencies will setup using docker.
Go to `legacy-terms-processor/dependencies-docker` and follow instructions below:
1. update env.sh to match your environment and run `source env.sh`
2. run `docker-compose up`
This will setup Zookeeper, Kafka and Informix services

## Local deployment
- Given the fact that the library used to access Informix DB depends on Informix Client SDK.
We will run the application on Docker using a base image with Informix Client SDK installed and properly configured.
For deployment, please refer to next section 'Local Deployment with Docker'

## Local Deployment with Docker

1. Make sure that Kafka and Informix are running as per instructions above.

2. Go to `docker` folder

3. Rename the file `sample.api.env` to `api.env` And properly update the IP addresses to match your environment for the variables : KAFKA_URL, INFORMIX_HOST.

Here is an example:
```
KAFKA_URL=192.168.31.8:9092
INFORMIX_HOST=192.168.31.8
AUTH0_CLIENT_ID=8QovDh27SrDu1XSs68m21A1NBP8isvOt
AUTH0_CLIENT_SECRET=3QVxxu20QnagdH-McWhVz0WfsQzA1F8taDdGDI4XphgpEYZPcMTF4lX3aeOIeCzh
AUTH0_URL=https://topcoder-dev.auth0.com/oauth/token
AUTH0_AUDIENCE=https://m2m.topcoder-dev.com/
```

4. Once that is done, go to run the following command

```
docker-compose up
```

5. When you are running the application for the first time, It will take some time initially to download the image and install the dependencies

## Code style checks
To check the code style use the following commands
1. Install dependencies: `npm install`
2. Check code style: `npm run lint`
3. Check code style and fix some styling issues: `npm run lint:fix`

## Verification
Refer to `Verification.md`
