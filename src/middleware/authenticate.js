const MESSAGE = require('@config/message')

const { SEND_AUTH_KEY } = process.env

module.exports.send = (req, res, next) => {
  if (SEND_AUTH_KEY) {
    if (SEND_AUTH_KEY === req.key) {
      next()
    } else {
      res.status(401).json({
        error: MESSAGE.UNAUTHORIZED,
      })
    }
  } else {
    next()
  }
}
