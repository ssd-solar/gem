/* eslint-disable node/no-unsupported-features/es-syntax */

import Vue from 'vue/dist/vue.esm.js'

import * as Sentry from '@sentry/browser'
import VueResource from 'vue-resource'
import GlobalOptions from 'vue-global-options'
import VueRouter from 'vue-router'
import VueI18n from 'vue-i18n'

import syncedData from './synced-data'

import '@forevolve/bootstrap-dark/scss/toggle-bootstrap.scss'
import '@forevolve/bootstrap-dark/scss/toggle-bootstrap-dark.scss'

import '@fortawesome/fontawesome-free/css/all.min.css'

import './css/spinner.scss'

const $ = window.jQuery = require('jquery')

if (!window.fetch) {
  require('whatwg-fetch')
}

require('sweetalert2')
window.swal = require('sweetalert2')

export default ({
  messages,
  api,
  sentryDsn,
  routes,
  app,
}) => {
  if (!module.hot && sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      integrations: [new Sentry.Integrations.Vue({Vue})],
    })
  }

  Vue.use(VueResource)
  Vue.use(GlobalOptions, ['api', 'config', 'user', 'ui'])
  Vue.use(VueI18n)

  const lang = window.navigator.language.split('-')[0]

  const i18n = new VueI18n({
    // check if we have user's langauge code mapped to a locale available, otherwise use en
    locale: messages[lang] ? lang : 'en',
    messages,
  })

  const router = new VueRouter({
    mode: 'history',
    routes,
  })

  window.router = router

  // click intercept
  $(document).on('click', 'a', function (e) {
    const href = $(this).attr('href')
    if (href && href.startsWith('/') && !href.startsWith('/auth')) {
      e.preventDefault()
      router.push(href)
    }
  })

  Vue.use(VueRouter)

  $(document).ready(async () => {
    // TODO: rework

    // load user info
    let user
    let ui = {}

    function userValueChange() {
      if (ui.dark) {
        $('body').removeClass('bootstrap').addClass('bootstrap-dark')
      } else {
        $('body').removeClass('bootstrap-dark').addClass('bootstrap')
      }

      if (window.app) {
        window.app.$children[0].$forceUpdate()
      }
    }

    user = {
      loggedIn: false,
      config: JSON.parse(window.localStorage.getItem('userconfig') || '{}'),
      permissions: [],
      p: {},
    }

    /* if (!await api.areWeLoggedInYet()) {
      user = {
        loggedIn: false,
        config: JSON.parse(window.localStorage.getItem('userconfig') || '{}'),
        permissions: [],
        p: {}
      }
    } else {
      user = await api.json('user/profile')
    } */

    user.config = ui = user.config || {} // sync

    userValueChange()

    // hide spinner
    $('#load').hide()

    // launch app
    window.app = new Vue({
      el: 'app',
      router,
      i18n,
      components: {
        app,
      },

      // globally exposed variables
      api,
      config: {},
      user,
      ui: syncedData(ui, {
        dark: false,
        showNav: false,
      }, () => {
        userValueChange()

        if (user.loggedIn) {
          api.postJson('user/profile', user).catch(console.error)
        } else {
          window.localStorage.setItem('userconfig', JSON.stringify(ui))
        }
      }),
    })
  })
}
