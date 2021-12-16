require('dotenv').config()
require('module-alias/register')

const cors = require('cors')
const yargs = require('yargs')
const helmet = require('helmet')
const express = require('express')
const log = require('@lib/winston')
const transport = require('@lib/nodemailer')
const rateLimit = require('express-rate-limit')
const bearerToken = require('express-bearer-token')
const cloudFlare = require('@middleware/cloudflare')
const auth = require('@middleware/authenticate')
const ctrlSend = require('@controller/send')
const { version } = require('./package.json')

const MESSAGE = require('@config/message')

const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 8080
const DEFAULT_RATE_LIMIT = 15 // req 15 per hour
const DEFAULT_RATE_LIMIT_MINUTE = 60 // req 60 minute per IP
const DEFAULT_PROXY_TRUST = false
const SHUTDOWN_TTL = 3000 // 3 sec

const {
  RELAY_TO_EMAIL,
  RELAY_FROM_EMAIL,
  SERVER_HOST,
  SERVER_PORT,
  RATE_LIMIT,
  RATE_LIMIT_MINUTE,
  PROXY_TRUST,
  CORS_ORIGIN,
} = process.env

const app = express()
const argv = yargs
  .usage('Usage: npm start -- --options')
  .option('relay-to', {
    type: 'string',
    describe: 'Set relay to email address',
    default: RELAY_TO_EMAIL,
    demandOption: true,
  })
  .option('relay-from', {
    type: 'string',
    describe: 'Set relay from email address',
    default: RELAY_FROM_EMAIL,
    demandOption: true,
  })
  .option('host', {
    type: 'string',
    describe: 'Server Running Host',
    default: SERVER_HOST || DEFAULT_HOST,
  })
  .option('port', {
    type: 'number',
    describe: 'Server Running Port',
    default: parseInt(SERVER_PORT || DEFAULT_PORT),
  })
  .option('proxy', {
    type: 'boolean',
    describe: 'Set to trust proxy headers',
    default: PROXY_TRUST?.toLowerCase() === 'true' || DEFAULT_PROXY_TRUST,
  })
  .option('limit', {
    type: 'number',
    describe: 'Set request rate limit',
    default: parseInt(RATE_LIMIT || DEFAULT_RATE_LIMIT),
  }).argv

const limiter = rateLimit({
  max: argv.limit,
  windowMs: parseInt(RATE_LIMIT_MINUTE || DEFAULT_RATE_LIMIT_MINUTE) * 60 * 1000,
  handler: (req, res) => {
    res.status(429).json({ error: MESSAGE.EXCEED_RATE_LIMIT })
  },
})

const server = app.listen(argv.port, argv.host, (error) => {
  log.info(`Server running ${server.address().address}:${argv.port} - v${version}`)

  if (error) {
    destruct(error)
  } else {
    app.use(helmet.expectCt())
    app.use(helmet.hidePoweredBy())
    app.use(helmet.hsts())
    app.use(helmet.noSniff())

    app.use(express.json())

    app.use(cloudFlare) // cf-ip assign if behind cloudflare
    app.use(
      bearerToken({
        headerKey: 'Bearer',
        queryKey: 'key',
        reqKey: 'key',
      })
    )

    if (argv.proxy) {
      app.enable('trust proxy')
    }

    if (CORS_ORIGIN) {
      app.use(
        cors({
          origin: CORS_ORIGIN.includes(',') ? CORS_ORIGIN.split(',') : CORS_ORIGIN,
        })
      )
    }

    // bypass rateLimit
    app.post('/send', auth.send, ctrlSend.post)

    argv.limit > 0 && app.use(limiter)

    app.use('/', require('@route'))

    // route not found (404)
    app.all('*', (req, res) => {
      log.verbose(`${req.method} 404 :: ${req.ip} :: ${req.originalUrl}`)
      res.status(404).json({ error: MESSAGE.REQUEST_NOT_FOUND })
    })

    // error handler
    app.use((error, req, res, next) => {
      if (error instanceof SyntaxError) {
        log.debug(`${req.method} 400 :: ${req.ip} :: ${req.originalUrl} :: Bad Request.`)
        res.status(400).json()
      } else {
        logError(req, error)
        res.status(500).json({ error: MESSAGE.SERVER_ERROR })
        console.error(error)
      }
    })
  }
})

transport.submit.verify((error) => {
  error && destruct(error)
})

process.on('SIGINT', () => {
  log.verbose('SIGINT :: destruct')
  destruct()
})

/**
 * @param {Request} req
 * @param {Error} error
 * @param {Integer} status
 */
function logError(req, error, status = 500) {
  log.error(`${req.method} ${status} :: ${req.ip} :: ${req.originalUrl} :: ${error.message}`)
}

/**
 * @param {Error|null} error
 */
function destruct(error = null) {
  log.debug('desturct()')

  error && log.error(error.message)
  log.warn('Gracefully shutting down...')

  server.close()

  transport.send.close()
  transport.submit.close()

  setTimeout(() => process.exit(error === null ? 0 : 1), SHUTDOWN_TTL)
}
