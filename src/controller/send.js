const log = require('@lib/winston')
const transport = require('@lib/nodemailer')
const { body } = require('express-validator')

const MSG_VALID_STRING = 'The field must be a string.'

module.exports.validates = [
  body('from').isString().withMessage(MSG_VALID_STRING),
  body('to').isString().withMessage(MSG_VALID_STRING),
  body('subject').isString().withMessage(MSG_VALID_STRING),
  body('text').isString().withMessage(MSG_VALID_STRING).optional(),
  body('html').isString().withMessage(MSG_VALID_STRING).optional(),
]

module.exports.post = (req, res, next) => {
  transport.send
    .sendMail(req.body)
    .then((result) => {
      log.debug(result)
      res.json(result)
    })
    .catch((error) => next(error))
}
