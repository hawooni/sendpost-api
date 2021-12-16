const { format, transports, createLogger } = require('winston')

const logger = createLogger({
  level: process.env.LOG || 'info',
  transports: [
    new transports.Console({
      format: format.combine(
        format.simple(),
        format.colorize({ all: true }),
        format.printf((info) => `${info.message}`)
      ),
    }),
  ],
})

module.exports = logger
