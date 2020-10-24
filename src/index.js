'use strict'

const Hapi = require('@hapi/hapi')
// const CatboxMongoDB = require('catbox-mongodb')
const Joi = require('joi')
const celarium = require('celarium').jit().compileAndInit

const pino = require('pino')

// const mongoose = require('mongoose')

const Relish = require('relish')({
  messages: {},
})

const init = async ({appName, frontend, celariumModel, celariumConfig}, config) => {
  const log = pino({name: appName})

  // const mongodbDB = config.db.url.split('/').pop().split('?').shift() // get uppercase part: mongodb://url:port/DB?something

  config.api.extraConfig = {
    /* cache: {
      provider: {
        constructor: CatboxMongoDB,
        options: {
          uri: config.mongodb,
          partition: mongodbDB,
        },
      },
    }, */
    routes: {
      validate: {
        failAction: Relish.failAction,
      },
    },
  }

  config.api.getUser = () => 0 // TODO: add auth

  const {
    start,
    stop,
    DBM,
    API,
  } = await celarium(celariumModel, celariumConfig, {db: config.db, api: config.api})

  const server = API._hapi

  await server.register({
    plugin: require('hapi-pino'),
    options: {name: appName},
  })

  if (global.SENTRY) {
    await server.register({
      plugin: require('hapi-sentry'),
      options: {client: global.SENTRY},
    })
  }

  await server.register({
    plugin: require('@hapi/inert'),
  })

  if (frontend) {
    require('hapi-spa-serve')(server, {assets: frontend})
  }

  await start()

  process.on('SIGINT', () => {
    stop()
  })

  process.on('SIGTERM', () => {
    stop()
  })
}

module.exports = init

module.exports.baseValidator = {
  api: Joi.object({
    host: Joi.string().required(),
    port: Joi.number().integer().min(1).max(60000).required(), // TODO: correct portnum max
  }).required(),
  db: Joi.object().required(),
}
