'use strict';
console.log('Loading handler function');

const Lambda = require('lambda-time');
const Router = new Lambda();

module.exports = {};

Router.register(require('./lib/users-get').route);
Router.register(require('./lib/users-post').route);
Router.register(require('./lib/users-user-get').route);
Router.register(require('./lib/users-user-put').route);

module.exports.handler = function (event, context) {
  console.log('routing');
  Router.route(event, context)
    .then((response) => {
      context.done(null, response);
    })
    .catch((error) => {
      context.done(JSON.stringify(error), null);
    })
}