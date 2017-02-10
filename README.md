;; This buffer is for text that is not saved, and for Lisp evaluation.
;; To create a file, visit it with <open> and enter text in its buffer.

# Control tower: API Gateway on Steroids

<img src="https://avatars0.githubusercontent.com/u/20566771?v=3&s=200" style="display: block; margin: 0 auto;">




[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

## Getting started

You only have to follow 4 steps:

1 - Clone the repository

```
git clone https://github.com/control-tower/control-tower.git && cd control-tower
```

2 - Create and complete your dev.env file with your configuration. To know the mean of each variable, you visit this [section](#documentation-environment-variables). You have a example .env file in the project. It is .env.sample

3 - Raise Control-tower with docker. You need docker installed in your machine. If you need install it, you visit this [web](https://www.docker.com/products/docker). You only execute the next command to run Control tower:

Recommendation:

4 - Add the next line to your `/etc/hosts`:

```
mymachine   <yourIP>
```

Enjoy your brand new Control Tower!!!

To check if Control tower works, you can do a request to [http://mymachine:9000](http://mymachine:9000/) and the response should be 404 if you haven't registered already a microservice.


```bash
./controlTower.sh develop
```

## Documentation

### Authentication

A JWT token contains the next information:

```json
{
  "id": "1a10d7c6e0a37126611fd7a7",
  "role": "ADMIN",
  "provider": "local",
  "email": "admin@control-tower.org",
  "extraUserData": {
    "apps": [
      "rw",
      "gfw",
      "gfw-climate",
      "prep",
      "aqueduct",
      "forest-atlas",
      "data4sdgs"
    ]
  }
}
```

In a dev environment, you can use the following tokens to identify as different users (generated with `mysecret` key).

Role USER, registered with all Applications
Token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFhMTBkN2M2ZTBhMzcxMjY2MTFmZDdhNyIsInJvbGUiOiJVU0VSIiwicHJvdmlkZXIiOiJsb2NhbCIsImVtYWlsIjoidXNlckBjb250cm9sLXRvd2VyLm9yZyIsImV4dHJhVXNlckRhdGEiOnsiYXBwcyI6WyJydyIsImdmdyIsImdmdy1jbGltYXRlIiwicHJlcCIsImFxdWVkdWN0IiwiZm9yZXN0LWF0bGFzIiwiZGF0YTRzZGdzIl19fQ.eePyj9grA2akg2vKqmLz5Gg8hd2Afq64ZaeGLb-aLC0`

Role MANAGER, registered with all Applications
Token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFhMTBkN2M2ZTBhMzcxMjY2MTFmZDdhNyIsInJvbGUiOiJNQU5BR0VSIiwicHJvdmlkZXIiOiJsb2NhbCIsImVtYWlsIjoibWFuYWdlckBjb250cm9sLXRvd2VyLm9yZyIsImV4dHJhVXNlckRhdGEiOnsiYXBwcyI6WyJydyIsImdmdyIsImdmdy1jbGltYXRlIiwicHJlcCIsImFxdWVkdWN0IiwiZm9yZXN0LWF0bGFzIiwiZGF0YTRzZGdzIl19fQ.ONb6dBz-pYxmXP3ECmRT7zmJHy8Dzn1GYyE6ndOR1Uw`

Role ADMIN, registered with all Applications
Token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFhMTBkN2M2ZTBhMzcxMjY2MTFmZDdhNyIsInJvbGUiOiJBRE1JTiIsInByb3ZpZGVyIjoibG9jYWwiLCJlbWFpbCI6ImFkbWluQGNvbnRyb2wtdG93ZXIub3JnIiwiZXh0cmFVc2VyRGF0YSI6eyJhcHBzIjpbInJ3IiwiZ2Z3IiwiZ2Z3LWNsaW1hdGUiLCJwcmVwIiwiYXF1ZWR1Y3QiLCJmb3Jlc3QtYXRsYXMiLCJkYXRhNHNkZ3MiXX19.FglwGCDjeh5c3bdmV0GA6QiMd-I1AdbdHCLQQGUPRxw`

### Environment variables

Core Variables

- PORT => The port where control-tower listens for requests. Defaults to 9000 when not set.
- LOGGER_TYPE => Type of logger. Possible values: console, syslog. Defaults to console.
- NODE_ENV => Environment variable of nodejs. Required.
- NODE_PATH => Required value. Always set it to 'app/src'.
- EXEC_MIGRATION => If set to tue, Control Tower will execute the inital migration on startup. This is a neccesary step for the first time you run the application. Once the migrations are run, subsequent application deploys don't need to be migrated, so you should set it to false.

Oauth Variables

- JWT_SECRET				=> The secret used to generate JWT tokens. It's a required field if the JWT feature in the auth-plugin is active. The JWT feature is active by default.
- TWITTER_CONSUMER_KEY		=> Twitter OAuth consumer key. If's a required field if the Twitter feature in the auth-plugin is active. It's not active by default.
- TWITTER_CONSUMER_SECRET	=> Twitter OAuth consumer secret. If's a required field if the Twitter feature in the auth-plugin is active. It's not active by default.
- GOOGLE_CLIENT_ID			=> Google+ OAuth client ID. If's a required field if the Google feature in the auth-plugin is active. It's not active by default.
- GOOGLE_CLIENT_SECRET		=> Google+ OAuth client secret. If's a required field if the Google feature in the auth-plugin is active. It's not active by default.
- FACEBOOK_CLIENT_ID		=> Facebook OAuth client ID. If's a required field if the Facebook feature in the auth-plugin is active. It's not active by default.
- FACEBOOK_CLIENT_SECRET	=> Facebook OAuth client secret. If's a required field if the Facebook feature in the auth-plugin is active. It's not active by default.
- SPARKPOST_KEY				=> Key to send mails with Sparkpost. It's a required field if you offer a local OAuth provider.
- CONFIRM_URL_REDIRECT		=> URL to redirect users whenever they activate their account. It's a required field if you offer a local OAuth provider.
- PUBLIC_URL				=> Base Application URL. It must be the public domain of your Control Tower instance, and it's used to compose account links. It you are offering a local OAuth provider it's a required field.
- BASICAUTH_USERNAME		=> Basic authentication's username. Required if you activate basic auth.
- BASICAUTH_PASSWORD		=> Basic authentication's password. Required if you activate basic auth.

Redis Cache variables

- REDIS_PORT_6379_TCP_ADDR => Redis DB host. Required if you activate the Redis cache plugin.
- REDIS_PORT_6379_TCP_PORT => Redis DB port. Required if you activate the Redis cache plugin.

Mongo session variables

- COOKIE_DOMAIN => Session domain for cookies. Required field if you activate the sessionMongo plugin.
- SESSION_KEY	=> Key to cipher the cookies.  Required field if you activate the sessionMongo plugin.

Live cron variables

- INSTAPUSH_TOKEN	=> Instapush token for sending alerts to mobile devices with the Live cron. It's required if you activate Live cron.
- INSTAPUSH_ID		=> Instapush ID for sending alerts to mobile devices with the Live cron. It's required if you activate Live cron.
- INSTAPUSH_SECRET	=> Instapush secret for sending alerts to mobile devices with the Live cron. It's required if you activate Live cron.

### Plugins

TODO

### Crons

TODO


## Contributing

1. Fork it!
2. Create a feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Added some new feature'`
4. Push the commit to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request :D

## Authors 

  <a href="https://github.com/rrequero" target="_blank" style="display: inline-block">
    <img src="https://secure.gravatar.com/avatar/88658283520e4fa50fd767c8b52bf4f8?s=80">
  </a>

  <a href="https://github.com/archelogos" target="_blank" style="display: inline-block">
    <img src="https://avatars3.githubusercontent.com/u/8081142?v=3&s=80">
  </a>

  <a href="https://github.com/hectoruch" target="_blank" style="display: inline-block">
    <img src="https://avatars2.githubusercontent.com/u/8074563?v=3&s=80">
  </a>

