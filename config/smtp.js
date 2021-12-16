// nodemailer.createTransport
module.exports = {
  pool: true,
  host: process.env.SMTP_HOST || '127.0.0.1',
  port: parseInt(process.env.SMTP_PORT || 25),
}
