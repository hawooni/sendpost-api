const config = require('@config/smtp')
const nodemailer = require('nodemailer')
const hbs = require('nodemailer-express-handlebars')

const send = nodemailer.createTransport(config)
const submit = nodemailer.createTransport(config)
const submitOpt = {
  viewEngine: {
    extname: '.hbs',
    layoutsDir: 'template/',
    defaultLayout: 'main',
  },
  viewPath: 'template',
  extName: '.hbs',
}

submit.use('compile', hbs(submitOpt)) // use template

module.exports.send = send
module.exports.submit = submit
