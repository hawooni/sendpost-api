# SENDPOST-API

It is an open-source SMTP API designed to host your send-only email server for serverless workers or public websites to send and relay emails.

## Prerequisites

- Docker, docker-compose and [DKIM Record](#dkim-record) setup is required to run `docker-compose.yaml`.
- Make sure your server hosting provider allows SMTP port 25. I know for sure [vultr.com](https://www.vultr.com/?ref=6815811) will open the port for you if you ask them.
- You must run your production server behind a proxy server like Nginx with SSL encryption.

## Todo List

- [ ] support webhook
- [ ] support file attachment
- [ ] support submit carbon copy to sender

## Setup

Get your server with $100 credit by signing up [vultr.com](https://www.vultr.com/?ref=6815811) with the [referral link](https://www.vultr.com/?ref=9006081-8H).

### Required Folder Files

Refer to [DKIM Record](#dkim-record).

- `dkim/private.key`
- `dkim/config`

### Environment variables

#### Required

| key              | description                                              |
| ---------------- | -------------------------------------------------------- |
| RELAY_TO_EMAIL   | relay payload to email address eg. contact@your-site.com |
| RELAY_FROM_EMAIL | relay from email address eg. no-reply@your-site.com      |

#### Optional

| key                  | default        | description                                                                                                   |
| -------------------- | -------------- | ------------------------------------------------------------------------------------------------------------- |
| RELAY_FROM_NAME      | `DO NOT REPLY` | relay email from name                                                                                         |
| SUBMIT_FROM_URL      | -              | public submit website url eg. `https://your-site.com`                                                         |
| RATE_LIMIT           | `15`           | public maximum submit `RATE_LIMIT_MINUTE` per IP Address                                                      |
| RATE_LIMIT_MINUTE    | `60`           | rate limit reset minute                                                                                       |
| SEND_AUTH_KEY        | -              | enable route `/send` with auth key validation                                                                 |
| RECAPTCHA_SECRET_KEY | -              | enable route `/submit` with reCaptcha validation                                                              |
| CORS_ORIGIN          | -              | set cors origin eg. `*`, `https://sub.your-site.com`, `https://sub1.your-site.com,https://sub2.your-site.com` |

#### Example

`.env`

```sh
## required ##
RELAY_TO_EMAIL=contact@your-site.com
RELAY_FROM_EMAIL=no-reply@your-site.com

## optional ##
SUBMIT_FROM_URL=https://your-site.com
CORS_ORIGIN=https://your-site.com
RECAPTCHA_SECRET_KEY=secret
SEND_AUTH_KEY=secret
```

### Improve Email Deliverability

Check your sending reputation score at [mail-tester.com](https://www.mail-tester.com/).

#### DKIM Record

DKIM (Domain Keys Identified Mail) uses a private key to sign emails sent from your domain digitally. Receiving SMTP servers verify the signature using the public key published in the DNS DKIM record. You can generate your DKIM at [dkimcore.org](https://dkimcore.org/tools/keys.html).

`dkim/private.key`

```
-----BEGIN RSA PRIVATE KEY-----
keep secret...
-----END RSA PRIVATE KEY-----
```

`dkim/config`

```conf
DKIM_DOMAIN = YOUR_DOMAIN
DKIM_SELECTOR = YOUR_DKIM_SELECTOR
DKIM_KEY_FILE = /etc/exim4/domain.key
DKIM_PRIVATE_KEY = ${if exists{DKIM_KEY_FILE}{DKIM_KEY_FILE}{0}}
DKIM_CANON = relaxed
```

Then in your DNS manager, create a TXT record, enter dkim.\_domainkey in the name field. Copy everything in the parentheses and paste it into the value field. Delete all double quotes and line breaks.

| type | name                             | content                |
| ---- | -------------------------------- | ---------------------- |
| TXT  | `YOUR_DKIM_SELECTOR`.\_domainkey | v=DKIM1;p=`PUBLIC_KEY` |

#### PTR record

A pointer record, or PTR record, maps an IP address to an FQDN (fully qualified domain name). It’s the counterpart to the A record and is used for reverse DNS lookup, which can help with blocking spammers. Many SMTP servers reject emails if no PTR record is found for the sending server.

#### SPF Record

The SPF (Sender Policy Framework) record specifies which hosts or IP addresses can send emails on behalf of a domain. It would be best if you allowed only your email server or your ISP’s server to send emails for your domain. In your DNS management interface, create a new TXT record like below.

| type | name          | content                             |
| ---- | ------------- | ----------------------------------- |
| TXT  | `YOUR_DOMAIN` | v=spf1 ip4:`YOUR_SERVER_IP` mx ~all |

#### DMARC Record

DMARC stands for Domain-based Message Authentication, Reporting, and Conformance. DMARC can help receive email servers from identifying legitimate emails and preventing your domain name from being used by email spoofing.

To create a DMARC record, go to your DNS manager and add a TXT record. In the name field, enter \_dmarc.

| type | name    | content           |
| ---- | ------- | ----------------- |
| TXT  | \_dmarc | v=DMARC1; p=none; |

## API Routes

### Send

#### HTTP Request

`post /send`

This endpoint sends an email. Make sure to include `SEND_AUTH_KEY` in production server configuration to enable auth key validation.

#### Authorization

`SEND_AUTH_KEY` authentication must include the key using one of two ways:

- Request header `Authorization`: Bearer `SEND_AUTH_KEY`
- Query parameter ?key=`SEND_AUTH_KEY`

#### Request Content-Type

`application/json`

```json
{
  "from": "Your Site Name <hello@your-site.com>",
  "to": "john@example.com, jane@example.com",
  "subject": "Hello",
  "text": "Hello world?",
  "html": "<b>Hello world?</b>"
}
```

Refer to [nodemailer.com](https://nodemailer.com/) sendMail() for detailed payload options.

#### Response Content-Type

`application/json`

```json
{
  "accepted": ["john@example.com", "jane@example.com"],
  "rejected": [],
  "envelopeTime": 2,
  "messageTime": 4,
  "messageSize": 296,
  "response": "250 OK id=1mxa96-00004t-Uq",
  "envelope": {
    "from": "hello@your-site.com",
    "to": ["john@example.com", "jane@example.com"]
  },
  "messageId": "<622a4562-8b8a-28a5-f8da-16c59833fb8a@your-site.com>"
}
```

Success message does not guarantee email delivery if port `25` is blocked.

### Submit

#### HTTP Request

`post /submit`

This endpoint relay public post submits payload to `RELAY_TO_EMAIL` address with predefined template. Make sure to include `RECAPTCHA_SECRET_KEY` in production server configuration to enable reCaptcha validation and block bots. It will only relay values with keys starting with the alphabet.

#### Request Content-Type

`application/json`

```json
{
  "name": "John Doe",
  "email": "john@email.com",
  "message": "Test Message Here!",
  "g-recaptcha-response": "something random"
}
```

#### Response Content-Type

`application/json`

```json
{
  "response": "250 OK id=1mxIll-00004W-5N"
}
```

Success message does not guarantee email delivery if port `25` is blocked.

#### Submit Template

![template](doc/image/relay_email.png?raw=true)

You can customize the template by overriding `template/main.hbs`.

```handlebars
<p>
  {{#if submitFromUrl}}
    Someone just submitted your form on
    {{submitFromUrl}}.
  {{else}}
    Someone just submitted your form.
  {{/if}}
  <br />
  Here's what they had to say:
</p>
<hr />
{{#each postBody}}
  <p>{{key}}: {{value}}</p>
  <hr />
{{/each}}
<p>
  Submitted:
  {{submitDateTime}}
  (UTC)
  <br />
  IP Address:
  {{submitIP}}
</p>
```

Supported Template Variables:

- relayFromName
- relayFromEmail
- relayToEmail
- submitFromUrl
- submitDateTime
- submitIP

#### Override Template Variable

| payload key       | description                                |
| ----------------- | ------------------------------------------ |
| \_submit_from_url | override template variable `submitFromUrl` |

## Run

Running the server on port `8080`.

```
docker-compose up
```

## Credits

- [https://nodemailer.com](https://nodemailer.com)
- [https://dkimcore.org/tools](https://dkimcore.org/tools)
- [https://hub.docker.com/r/namshi/smtp](https://hub.docker.com/r/namshi/smtp)
- [https://github.com/leemunroe/responsive-html-email-template](https://github.com/leemunroe/responsive-html-email-template)
- [https://www.linuxbabe.com/mail-server/ubuntu-18-04-iredmail-email-server](https://www.linuxbabe.com/mail-server/ubuntu-18-04-iredmail-email-server)
