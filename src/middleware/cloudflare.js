module.exports = (req, res, next) => {
  // cloudflare data
  req.cf = {}
  // ip can be ipv4/ipv6
  req.ip =
    req.headers['cf-connecting-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress

  Object.keys(req.headers)
    .filter((header) => header.startsWith('cf-'))
    .forEach((key) => {
      req.cf[key] = req.headers[key]
    })

  next()
}
