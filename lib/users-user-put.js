'use strict';
console.log('loading users-user-put handler');

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

function usersUserPutHandler(event, context) {
  return validateInput(input)
    .then(checkExists)
    .then(updateUser)
    .catch((error) => {
      reject(error);
    })
}

function validateInput(input) {
  // validate inputs
  return new Promise((resolve, reject) => {
    console.log(JSON.stringify(event));
    if (event.params && event.params.path && event.params.path.email) {
      const result = Joi.validate(input, routeSchema)
      if (result.error) {
        return reject(result.error);
      } else {
        return resolve(input);
      }
    } else {
      return reject(Boom.badRequest('email is required in path'))
    }
  });
}


/**
 * Verifies that an email address is unique.
 * @param  {string} email email address
 * @return {object}       A promise that resolves if the email address is unique
 * or rejects if it already exists in the users table.
 */
function checkExists(input) {
  return new Promise((resolve, reject) => {
    var params = {
      TableName: 'users',
      Key: {
        email: input.email
      }
    }

    Dynamo.get(params, (error, result) => {
      if (error) {
        return reject(error);
      } else {
        if (result && result.Item) {
          if (input.modified === result.Item.modified) {
            return resolve(input);
          } else {
            return reject(Boom.conflict('Item is stale'))
          }
        } else {
          return reject(Boom.notFound('unable to find user ' + input.email))
        }
      }
    })
  })
}

/**
 * Updates a user record
 * @param  {object} input The user record.
 * @return {object}       A promise that fulfills when the user is created.
 */
function updateUser(input) {
  return new Promise((resolve, reject) => {

    var params = {
      TableName: 'users',
      Item: input,
      ConditionExpression: "#modified == :dddd && #email == :email",
      ExpressionAttributeNames: {
        "#modified": "modified",
        "#email": "email"
      },
      ExpressionAttributeValues: {
        ":modified": input.modified,
        ":email": input.email
      }
    }

    // only return properties the client is asking for
    // if (event.select)
    //  params.ProjectionExpression = _.join(event.select, ',');

    try {
      Dynamo.put(params, (error, result) => {
        if (error) {
          console.log('database returned error: ' + JSON.stringify(error))
          return reject(error);
        } else {
          console.log('successful Dynamo put ');
          return resolve({
            email: input.email
          });
        }
      });
    } catch (error) {
      console.log('exception on database: ' + JSON.stringify(error))
      return reject(error);
    }
  });
}

module.exports.route = {
  path: '/users/{email}',
  method: 'put',
  handler: usersUserPutHandler
}