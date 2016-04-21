'use strict';
const Joi = require('joi');

console.log('loading schema');


const userSchema = module.exports = new Joi.object().keys({
  email: Joi.string()
    .email()
    .required(),
  firstName: Joi.string()
    .required(),
  lastName: Joi.string()
    .required(),
  userid: Joi.string().guid(),
  created: Joi.number(),
  modified: Joi.number(),
  password: Joi.string().length(8)
});