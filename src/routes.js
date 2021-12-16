const router = require('express').Router()
const vBody = require('@validator/body')
const vError = require('@validator/error')
const submit = require('@controller/submit')

const { RECAPTCHA_SECRET_KEY } = process.env

if (RECAPTCHA_SECRET_KEY) {
  router.post('/submit', [...submit.validates, vBody.reCaptchaV2(), vError], submit.post)
} else {
  router.post('/submit', [...submit.validates, vError], submit.post)
}

module.exports = router
