/**
 * Init app
 */

global.Promise = require('bluebird')
const Joi = require('@hapi/joi')

Joi.id = () => Joi.number().integer().positive() // positive integer id
