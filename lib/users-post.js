'use strict';
console.log('Loading users-post handler');

const Joi = require('joi');
const UUID = require('uuid');
const AWS = require('aws-sdk');
const Dynamo = new AWS.DynamoDB.DocumentClient();
const Promise = require('bluebird');
const Boom = require('boom');
const Scrypt = require('scrypt-for-humans');

const userSchema = require('./users-schema');

module.exports = {};

var cryptoConfig = {
  hashBytes: 32, // size of the generated hash
  saltBytes: 16, // larger salt means hashed passwords are more resistant
  iterations: 10240 // more iterations means an attacker will take longer
}

/**
 * Handler that creates a user. Verifies the incoming payload, then calls createUser
 * to save the user in the database.
 * @param  {object} event   The inbound event
 * @param  {object} context Lambda context
 */
var usersPostHandler = (event, context) => {
  return new Promise((resolve, reject) => {

    // verify that the input resource satisfies validation rules
    var input = event.body;

    // require the password
    if (!input.password) {
      return reject(Boom.badRequest('password is required'));
    }

    const result = Joi.validate(input, userSchema)
    if (result.error) {
      return reject(result.error);
    }

    // verify that the userid doesn't already exist, then create the user
    hashPassword(input)
      .then(createUser)
      .then((response) => {
        return resolve(response)
      })
      .catch((error) => {
        return reject(error);
      })
  });
}

/**
 * Temporary hash algorithm.  Replace with scrypt when travis is set up
 * @param  {[type]} input [description]
 * @return {[type]}       [description]
 */
function hashPassword(input) {

  console.log('hashing password');
  /*
  var standardError = Boom.badImplementation('unable to save user');
  return new Promise((resolve, reject) => {
    console.log('generating random salt');
    Crypto.randomBytes(cryptoConfig.saltBytes, (err, salt) => {
      if (err) {
        console.log('unable to generate random bytes in hash algorithm', err);
        return reject(standardError);
      } else {
        console.log('generating hash')
        Crypto.pbkdf2(input.password, salt, cryptoConfig.hashBytes, cryptoConfig.iterations, (err, hash) => {
          if (err) {
            console.log('unable to generate hash in hash algorithm', err);
            return reject(standardError);
          } else {
            var combined = new Buffer(hash.length + salt.length + 8);

            combined.writeUInt32BE(salt.length, 0, true);
            combined.writeUInt32BE(cryptoConfig.iterations, 4, true);

            salt.copy(combined, 8);
            hash.copy(combined, salt.length + 8);

            input.password = combined.toString('utf8');
            console.log('hash = ' + input.password)
            return resolve(input);
          }
        });
      }
    });
  });
  */


  return Promise.try(() => {
      return Scrypt.hash(input.password);
    })
    .then((hash) => {
      input.password = hash;
      console.log('new hash = ' + hash);
      return resolve(input)
    })
    .catch((error) => {
      console.log('unable to hash password' + JSON.stringify(error));
      return reject(Boom.badImplementation('unable to save user'));
    })

  /*
    return new Promise((resolve, reject) => {
      Scrypt.hash(input.password)
      BCrypt.hash(input.password, 10, (error, hashed) => {
        if (error) {
          return reject(error);
        } else {
          input.password = hashed;
          return resolve(input);
        }
      })
    })
  */
}

/**
 * Creates a user
 * @param  {object} input Input from the request payload
 * @return {object}        A promise that resolves to the result of the create statement
 * or rejects with an error string if the create fails.  Promise will reject
 * if a user with the specified email address already exists.
 */
function createUser(input) {
  return new Promise((resolve, reject) => {

    // add a uuid and create/modify dates for the user
    input.userid = UUID.v4();
    input.created = input.modified = Date.now();

    var params = {
      TableName: 'users',
      Item: input,
      ConditionExpression: "#email <> :email",
      ExpressionAttributeNames: {
        "#email": "email"
      },
      ExpressionAttributeValues: {
        ":email": input.email
      }
    }
    try {
      Dynamo.put(params, (error, result) => {
        if (error) {
          console.log('Error received creating new user: ' + JSON.stringify(error))
          if (error.statusCode === 400) {
            reject(Boom.conflict('user with email ' + input.email + ' already exists'));
          } else {
            return reject(Boom.badGateway('Database error encountered while saving user'));
          }
        } else {
          return resolve({
            _link: {
              id: encodeURI('/users/' + input.email)
            },
            email: input.email,
            userid: input.userid
          });
        }
      });
    } catch (error) {
      console.log('Exception received while creating user: ' + JSON.stringify(error));
      return reject(Boom.badGateway('Database exception encountered while saving user'));
    }
  });

}

module.exports.route = {
  path: '/users',
  method: 'post',
  handler: usersPostHandler
}