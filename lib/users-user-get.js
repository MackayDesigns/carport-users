'use strict';
console.log('loading users-user-get handler');

const Joi = require('joi');
const UUID = require('uuid');
const AWS = require('aws-sdk');
const Dynamo = new AWS.DynamoDB.DocumentClient();
const Promise = require('bluebird');
const Boom = require('boom');
const _ = require('lodash');

const routeSchema = new Joi.object().keys({
  email: Joi.string()
    .regex(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/),
  userId: Joi.string()
    .regex(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/),

  select: Joi.array().items(Joi.string().required())
}).xor('email', 'uuid');

// For development/testing purposes
function usersUserHandler(event, context) {
  return new Promise((resolve, reject) => {

    // validate inputs
    console.log('got user get request' + JSON.stringify(event));
    var input = {};

    if (event.params && event.params.path && event.params.path.email) {
      input.email = event.params.path.email
      const result = Joi.validate(input, routeSchema)
      if (result.error) {
        return reject(result.error);
      }
    } else {
      return reject(Boom.badRequest('email is required in params.path'))
    }
    getUser(input)
      .then((response) => resolve(response))
      .error((error) => reject(error));
  });
}

function getUser(input) {
  return new Promise((resolve, reject) => {
    // query the user table
    var params = {
      TableName: 'users',
      Key: {
        email: input.email
      }
    };

    Dynamo.get(params, (err, data) => {
      //    console.log('err = ' + err + ", data = " + JSON.stringify(data))
      if (err) {
        reject(err);
      } else {
        if (data.Item) {
          if (data.Item.created)
            data.Item.created = new Date(data.Item.created);
          if (data.Item.modified)
            data.Item.modified = new Date(data.Item.modified);
          console.log(JSON.stringify(data.Item));
          return resolve(data.Item);
        } else {
          return reject(Boom.notFound('Unable to find user'));
        }
      }
    });
  });
}

module.exports.route = {
  path: '/users/{email}',
  method: 'get',
  handler: usersUserHandler
}