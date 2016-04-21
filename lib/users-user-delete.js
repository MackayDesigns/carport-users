'use strict';

const Joi = require('joi');
const UUID = require('uuid');
const AWS = require('aws-sdk');
const Dynamo = new AWS.DynamoDB.DocumentClient();
const Promise = require('bluebird');
const _ = require('lodash');

const userSchema = new Joi.object().keys({
  email: Joi.string()
    .regex(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/),
  uuid: Joi.string()
    .regex(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/),

  select: Joi.array().items(Joi.string().required())
}).xor('email', 'uuid');

// For development/testing purposes
exports.handler = function (event, context) {

  // validate inputs
  const result = Joi.validate(event, userSchema)
  if (result.error) {
    return context.fail(result.error.toString());
  }

  // query the user table
  var params = {
    TableName: 'users',
  };

  if (event.email)
    params.Key = {
      email: event.email
    };

  if (event.uuid)
    params.Key = {
      uuid: event.uuid
    };

  // only return properties the client is asking for
  if (event.select)
    params.ProjectionExpression = _.join(event.select, ',');

  // scan the table.  TODO: figure out how to page
  Dynamo.get(params, (err, data) => {
    console.log('err = ' + err + ", data = " + JSON.stringify(data))
    if (err) {
      context.fail(err);
    } else {
      if (data.Item) {
        if (data.Item.created)
          data.Item.created = new Date(data.Item.created);
        if (data.Item.modified)
          data.Item.modified = new Date(data.Item.modified);
        console.log(JSON.stringify(data.Item));
        context.done(JSON.stringify(data.Item));
      } else {
        context.fail('NotFound: Unable to find user');
      }
    }
  });
}