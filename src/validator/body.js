const axios = require('axios')
const { body } = require('express-validator')

const RECAPTCHA_URL = 'https://www.google.com/recaptcha/api/siteverify'
const { RECAPTCHA_SECRET_KEY } = process.env

module.exports.email = (key = 'email') =>
  body(key)
    .isEmail()
    .withMessage('The field must be a valid email address.') // prettier-ignore
    .normalizeEmail()

module.exports.url = (key = 'url') => 
  body(key)
    .trim()
    .isURL()
    .withMessage('The field must be a valid url.') // prettier-ignore

module.exports.reCaptchaV2 = () =>
  body('g-recaptcha-response')
    .isString()
    .withMessage('The field must be a valid recaptcha response.')
    .bail()
    .custom((value) =>
      axios
        .post(`${RECAPTCHA_URL}?secret=${RECAPTCHA_SECRET_KEY}&response=${value}`)
        .then((res) => {
          if (res.data.success !== true) {
            return Promise.reject(res.data['error-codes']?.[0])
          }
        })
    )
