'use strict';
console.log('Loading users-get handler');

const Joi = require('joi');
const UUID = require('uuid');
const AWS = require('aws-sdk');
const Dynamo = new AWS.DynamoDB.DocumentClient();
const Promise = require('bluebird');
const Boom = require('boom');
const _ = require('lodash');
const userSchema = require('./users-schema');
const requestSchema = new Joi.object().keys({
    /*  email: Joi.string()
        .regex(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/),
      uuid: Joi.string()
        .regex(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/),
    */
    select: Joi.array().items(Joi.string().required())
  }) //.xor('email', 'uuid');

// For development/testing purpose

function usersGetHandler(request, context) {
  return new Promise((resolve, reject) => {
    console.log('request = ' + request);

    // validate inputs if there are any
    if (request.body) {
      const result = Joi.validate(request.body, requestSchema)
      if (result.error) {
        return reject(result.error);
      }
    }

    // query the user table
    var params = {
      TableName: 'users'
    };

    // only return properties the client is asking for
    if (request.body && request.body.select)
      params.ProjectionExpression = _.join(request.body.select, ',');

    // scan the table.  TODO: figure out how to page
    return Dynamo.scan(params, (err, data) => {
      if (err) {
        console.log(err)
        return reject(err);
      } else {
        if (data.Items && data.Items.length > 0) {
          _.each(data.Items, (item) => {
            item.created = new Date(item.created);
            item.modified = new Date(item.modified);
          })
          return resolve(data)
        } else {
          return reject(Boom.notFound('unable to find users'));
        }
      }
    });
  })
}

module.exports.route = {
  path: '/users',
  method: 'get',
  handler: usersGetHandler
}