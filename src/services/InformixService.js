/**
 * This service provides utility function for accessing data in Informix database.
 */

const _ = require('lodash')
const util = require('util')
const logger = require('../common/logger')
const helper = require('../common/helper')
const { InformixTableNames } = require('../constants')

// The SQL query used to get the terms of use dependency
const GET_TERMS_OF_USE_DEPENCENCY_QUERY =
  `SELECT utoux.user_id
   FROM ${InformixTableNames.TermsOfUseDependency} toud,
   OUTER ${InformixTableNames.UserTermsOfUseXref} utoux
   WHERE toud.dependency_terms_of_use_id = utoux.terms_of_use_id 
   AND toud.dependent_terms_of_use_id = %d AND utoux.user_id = %d`

/**
 * Prepare Informix statement
 * @param {Object} connection the Informix connection
 * @param {String} sql the sql query to prepare
 * @return {Object} The prepared Informix statement
 */
async function prepare (connection, sql) {
  const stmt = await connection.prepareAsync(sql)
  return Promise.promisifyAll(stmt)
}

/**
 * Insert a record in specified table
 * @param {Object} connection the Informix connection
 * @param {String} tableName the table name
 * @param {Object} columnValues the column key-value map
 */
async function insertRecord (connection, tableName, columnValues) {
  const keys = Object.keys(columnValues)
  const values = _.fill(Array(keys.length), '?')

  const insertRecordStmt = await prepare(connection, `insert into ${tableName} (${keys.join(', ')}) values (${values.join(', ')})`)
  await insertRecordStmt.executeAsync(Object.values(columnValues))
}

/**
 * Update a record in specified table
 * @param {Object} connection the Informix connection
 * @param {String} tableName the table name
 * @param {Object} columnValues the column key-value map
 * @param {Object} whereConditions the where clause condition map
 */
async function updateRecord (connection, tableName, columnValues, whereConditions) {
  let keys = Object.keys(columnValues)
  keys = _.map(keys, k => `${k} = ?`)
  let conditions = Object.keys(whereConditions)
  conditions = _.map(conditions, c => `${c} = ?`)

  const updateRecordStmt = await prepare(connection, `update ${tableName} set ${keys.join(', ')} where (${conditions.join(' and ')})`)
  logger.info(`Update statement: ${JSON.stringify(updateRecordStmt)}`)
  await updateRecordStmt.executeAsync([...Object.values(columnValues), ...Object.values(whereConditions)])
}

/**
 * This function ensures that the record matching the specified conditions exists in the given table.
 *
 * @param {Object} connection The Informix connection object
 * @param {String} tableName The table name in which to check the record
 * @param {whereConditions} id The where clause condition map
 */
async function ensureExists (connection, tableName, whereConditions) {
  const result = await searchRecords(connection, tableName, whereConditions)

  if (result.length === 0) {
    throw Error(`${tableName} records matching conditions ${JSON.stringify(whereConditions)} does not exist`)
  }
  return result[0]
}

/**
 * Searches the records in the given table matching the specified conditions.
 *
 * @param {Object} connection The Informix database connection object
 * @param {String} tableName The table name in which to search for the records
 * @param {Object} whereConditions The where clause condition map
 */
async function searchRecords (connection, tableName, whereConditions) {
  const where = await constructWhereClause(whereConditions)
  const result = await connection.queryAsync(`select * from ${tableName} where (${where})`, [...Object.values(whereConditions)])
  return result
}

/**
 * Deletes the records matching the given conditions from the specified table.
 *
 * @param {Object} connection The Informix connection
 * @param {String} tableName The name of the tale from which to delete the records
 * @param {Object} whereConditions The where clause condition map
 */
async function deleteRecords (connection, tableName, whereConditions) {
  const where = await constructWhereClause(whereConditions)
  await connection.queryAsync(`delete from ${tableName} where (${where})`, [...Object.values(whereConditions)])
}

/**
 * Constructs the SQL where clause using the specified where conditions
 * @param {Object} whereConditions The where clause condition map
 * @returns {String} The constructed where clause joined by 'And'
 */
async function constructWhereClause (whereConditions) {
  let conditions = Object.keys(whereConditions)
  conditions = _.map(conditions, c => `${c} = ?`)
  return conditions.join(' and ')
}

/**
 * Gets all the dependencies for the terms of use for a terms of use and user id.
 *
 * @param {Object} connection The Informix connection object
 * @param {Number} termsOfUseId The terms of use id for which to get the dependencies
 * @param {Number} userId The user id.
 * @returns {Promise<Array<Object>>} The terms of use dependencies array promise
 */
async function getTermsOfUseDependency (connection, termsOfUseId, userId) {
  return connection.queryAsync(util.format(GET_TERMS_OF_USE_DEPENCENCY_QUERY, termsOfUseId, userId))
}

/**
 * Checks whether the specified terms of use ids exist in the database.
 *
 * @param {Object} connection The informix connection object
 * @param {Array<Number>} ids The array of the terms of use to check
 */
async function validateTermsOfUseIds (connection, ids) {
  const terms = await connection.queryAsync(`select * from ${InformixTableNames.TermsOfUse} where terms_of_use_id in (${ids.join(',')})`)
  const termsIds = _.map(terms, t => Number(t.terms_of_use_id))

  const invalidIds = _.difference(ids, termsIds)
  if (invalidIds.length > 0) {
    throw Error(`The following terms doesn't exist: ${helper.toString(invalidIds)}`)
  }
}

/**
 * Gets the existing resouce terms for the given parameters.
 *
 * @param {Object} connection The informix connection object
 * @param {Number} projectId The project id for which to get the resource terms
 * @param {Number} resourceRoleId The resource role id for which to get the terms
 * @param {Array<Number>} termsOfUseIds The array of terms of use id to search for
 * @returns {Array<Object>}> The existing resource terms.
 */
async function getExistingResourceTerms (connection, projectId, resourceRoleId, termsOfUseIds) {
  let sql = `select * from ${InformixTableNames.ProjectRoleTermsOfUseXref} where 
  project_id= ${projectId} and resource_role_id = ${resourceRoleId}`
  if (!_.isUndefined(termsOfUseIds) && termsOfUseIds.length > 0) {
    sql = sql + ` and terms_of_use_id in (${termsOfUseIds.join(',')})`
  }
  const resourceTerms = await connection.queryAsync(sql)

  return resourceTerms
}

module.exports = {
  insertRecord,
  updateRecord,
  ensureExists,
  searchRecords,
  deleteRecords,
  getTermsOfUseDependency,
  validateTermsOfUseIds,
  getExistingResourceTerms
}

// logger.buildService(module.exports)
