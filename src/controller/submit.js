const log = require('@lib/winston')
const vBody = require('@validator/body')
const transport = require('@lib/nodemailer')
const sanitizeHtml = require('sanitize-html')
const moment = require('moment')

module.exports.validates = [vBody.email().optional(), vBody.url('_submit_from_url').optional()]

module.exports.post = (req, res, next) => {
  const { SUBMIT_FROM_URL, RELAY_FROM_NAME, RELAY_FROM_EMAIL, RELAY_TO_EMAIL } = process.env
  const content = {
    relayFromName: RELAY_FROM_NAME,
    relayFromEmail: RELAY_FROM_EMAIL,
    relayToEmail: RELAY_TO_EMAIL,
    submitFromUrl: req.body._submit_from_url || SUBMIT_FROM_URL,
    submitDateTime: moment().format('dddd, MMM D, YYYY h:mm:ss A'),
    submitIP: req.ip,
    postBody: [],
  }

  // only allow start with alphabet for post body eg. first_name ✓, message123 ✓, _recaptcha ✗
  Object.keys(req.body).forEach((key) => {
    if (/^[A-Za-z]\w*$/.test(key)) {
      content.postBody.push({
        key: key,
        value: sanitizeHtml(req.body[key]),
      })
    }
  })

  transport.submit
    .sendMail({
      from: `"${RELAY_FROM_NAME || 'DO NOT REPLY'}" <${RELAY_FROM_EMAIL}>`,
      to: RELAY_TO_EMAIL,
      subject: `New submission ${SUBMIT_FROM_URL ? `from ${SUBMIT_FROM_URL}` : 'received'}`,
      template: 'main',
      context: content, // html sanitized
    })
    .then((result) => {
      log.debug(result)
      res.json({
        response: result.response,
      })
    })
    .catch((error) => next(error))
}
