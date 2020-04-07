# Legacy terms processor Verification:
The legacy terms processor code is provided under legacy-terms-processor folder

To verify the process from end to end (Terms API -> Kafka -> Processor -> Informix), follow the instructions below

# Deployment:
 -------------- Start dependencies Informix + Kafka + Postgres --------------
Follow instructions below to start all the dependencies:
1. `cd legacy-terms-processor/dependencies-docker`
2. update env.sh to match your environment and run `source env.sh`
3. run `docker-compose up`
This will start the following services: Informix database, Zookeeper, Kafka and Postgres database


--------------------- Start the processor ----------------
To start the processor, follow the instructions below:
1. `cd legacy-terms-processor/docker`
2. run `docker-compose up`

---------------------- tc-bus-api setup -----------------
To setup tc-bus-api, follow the instructions below (tested with Node 8.2.1):
1. `git clone git@github.com:topcoder-platform/tc-bus-api.git`

2. `cd tc-bus-api`

3. `npm install`

4. To bypass token validation locally update node_modules/tc-core-library-js/lib/auth/verifier.js manually and add this to line 23: callback(undefined, decodedToken.payload); return;

5. Set the next env mandatory environment variables:
```
export KAFKA_URL=localhost:9092
export JWT_TOKEN_SECRET=secret
export VALID_ISSUERS="[\"https:\/\/topcoder-newauth.auth0.com\/\",\"https:\/\/api.topcoder-dev.com\"]"
```

6. `PORT=8002 npm start`

------------------ Start terms-service --------------
To start the terms api follow instructions below:
terms-service git repo is located at : https://github.com/topcoder-platform/terms-service

1. `cd terms-service`
2. rename env.sh.sample to env.sh, update it and run `source env.sh`
3. run `export BUSAPI_URL=http://localhost:8002/v5` to configure the terms api to use the bus api setup locally
4. run `npm run init-db`
5. run `npm run test-data`
6. run `npm start`


------------------- Postman Verification --------------
Open postman and load the collection/environment provided under submission/postman and run the provided tests from top to bottom.

For terms of use tests, you can check Informix database before and after each test using the SQL statements below:
```sql
select * from common_oltp:terms_of_use;
select * from common_oltp:terms_of_use_docusign_template_xref;
```
The output of the SQL statement above will be similar to: https://gyazo.com/44aeb617550a39d429f12bcc9bbc1fc8

Run the 'create terms of use success' test and check the following:
- terms-api output: https://gyazo.com/db7ad9cc1f1be1e0deda03f033013d67
- processor output: https://gyazo.com/aaa21cd466f70b6d522d328322488d15
- Informix database: https://gyazo.com/380e2dc43c81909d28b555060d691783

For agree terms of use, check the content of this table 'common_oltp:user_terms_of_use_xref' before and after the test:
```sql
select * from common_oltp:user_terms_of_use_xref
```

For resource terms of use, the following Informix table content can be checked 'common_oltp:project_role_terms_of_use_xref'
