'use strict'

// const Hapi = require('@hapi/hapi')
// const CatboxMongoDB = require('catbox-mongodb')
const Joi = require('joi')
const celarium = require('celarium')

const pino = require('pino')

// const mongoose = require('mongoose')

const Relish = require('relish2')({
  messages: {}
})

const init = ({
  appName, frontend,
  celariumModel, celariumCompiled, dbBackend,
  onStartup, onShutdown
}) =>
  async config => {
    const log = pino({ name: appName })

    config.api.extraConfig = {
      routes: {
        validate: {
          failAction: Relish.failAction
        }
      }
    }

    config.api.getUser = () => 0 // TODO: add auth

    let cRes
    const cConfig = { db: config.db, api: config.api }

    if (celariumModel) {
      cRes = await celarium.jit().compileAndInit(celariumModel, { api: 'hapi', db: dbBackend, beautify: false }, cConfig)
    } else {
      cRes = await require(celariumCompiled)(cConfig)
    }

    const {
      start,
      stop,
      DBM,
      API
    } = cRes

    const server = API._hapi

    await server.register({
      plugin: require('hapi-pino'),
      options: { name: appName }
    })

    if (global.SENTRY) {
      await server.register({
        plugin: require('hapi-sentry'),
        options: { client: global.SENTRY }
      })
    }

    await server.register({
      plugin: require('@hapi/inert')
    })

    if (frontend) {
      require('hapi-spa-serve')(server, { assets: frontend })
    }

    if (onStartup) {
      await onStartup(log, server, config, DBM, API)
    }

    await start()

    async function shutdown () {
      if (onShutdown) {
        await onShutdown()
      }
      stop()
    }

    process.on('SIGINT', shutdown)

    process.on('SIGTERM', shutdown)
  }

module.exports = init

module.exports.baseValidator = {
  api: Joi.object({
    host: Joi.string().required(),
    port: Joi.number().integer().min(1).max(60000).required() // TODO: correct portnum max
  }).required(),
  db: Joi.object().required()
}
