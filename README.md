# Control Tower: API Gateway on Steroids

<img src="https://avatars0.githubusercontent.com/u/20566771?v=3&s=200" style="display: block; margin: 0 auto;">

[![Build Status](https://travis-ci.org/control-tower/control-tower.svg?branch=develop)](https://travis-ci.org/control-tower/control-tower)
[![Test Coverage](https://api.codeclimate.com/v1/badges/27e5b69947977f399125/test_coverage)](https://codeclimate.com/github/control-tower/control-tower/test_coverage)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

## Dependencies

Control Tower is built using [Node.js](https://nodejs.org/en/), and can be executed either natively or using Docker, each of which has its own set of requirements.

Native execution requires:
- [Node.js](https://nodejs.org/en/)
- [MongoDB](https://www.mongodb.com/)
- [Redis](https://redis.io/)


Execution using Docker requires:
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

## Getting started

Start by cloning the repository from github to your execution environment

```
git clone https://github.com/control-tower/control-tower.git && cd control-tower
```

After that, follow one of the instructions below:

### Using native execution

1 - Set up your environment variables. See `dev.env.sample` for a list of variables you should set, which are described in detail in [this section](#documentation-environment-variables) of the documentation. Native execution will NOT load the `dev.env` file content, so you need to use another way to define those values

2 - Install node dependencies using NPM:
```
npm install
```

3 - Start the application server:
```
npm start
```
Control Tower should now be up and accessible. To confirm, open [http://localhost:9000](http://localhost:9000/) (assuming the default settings) on your browser, which should show a 404 'Endpoint not found' message.

### Using Docker

1 - Create and complete your `dev.env` file with your configuration. The meaning of the variables is available in this [section](#documentation-environment-variables). You can find an example `dev.env.sample` file in the project root.

2 - Execute the following command to run Control tower:

```
./controlTower.sh develop
```


3 - It's recommended to add the following line to your `/etc/hosts` (if you are in Windows, the hosts file is located in `c:\Windows\System32\Drivers\etc\hosts` and you'll need to 'Run as administrator' your editor):

```
mymachine   <yourIP>
```

Control Tower should now be up and accessible. To confirm, open [http://mymachine:9000](http://mymachine:9000/) on your browser, which should show a 404 'Endpoint not found' message.

## Testing

There are two ways to run the included tests:

### Using native execution

Follow the instruction above for setting up the runtime environment for native execution, then run:
```
npm test
```

### Using Docker

Follow the instruction above for setting up the runtime environment for Docker execution, then run:
```
./controlTower.sh test
```


## Documentation

### Authentication

A JWT token contains the following information:

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

### Audit and statistics

Actions going through Control Tower are logged on the `stadistics` (sorry about the typo) table, with the following format:

```json
{
  "_id": "5bf32aebdc8049c3a0943d7e",
  "sourcePath": "/v1/dataset/1234/layer/5678",
  "sourceMethod": "DELETE",
  "errorCode": null,
  "time": 348,
  "ip": "123.123.123.123",
  "loggedUser": {
    "iat": 1542063295,
    "createdAt": 1542063295822,
    "extraUserData": {
      "apps": [
        "gfw",
        "forest-atlas",
        "rw"
      ]
    },
    "email": "john@doe.org",
    "provider": "local",
    "role": "ADMIN",
    "id": "796512a56dfc643722bdd02ab"
  },
  "endpointPath": "/v1/dataset/:dataset/layer/:layer",
  "redirectUrl": "http://layer.default.svc.cluster.local:6000/api/v1/dataset/1234/layer/5678",
  "redirectMethod": "DELETE",
  "geo": {
    "completed": true
  },
  "anonymous": false,
  "error": false,
  "cached": false,
  "date": "2018-01-01T00:11:22.333Z",
  "__v": 0
}
```

There's currently no UI to review this data, but MongoDB queries are your friends. Keep in mind that this is a very large table, so expensive operations like sorting on unfiltered will take some time.

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

## Contributors

  <a href="https://github.com/rrequero" target="_blank" style="display: inline-block">
    <img src="https://secure.gravatar.com/avatar/88658283520e4fa50fd767c8b52bf4f8?s=80">
  </a>

  <a href="https://github.com/archelogos" target="_blank" style="display: inline-block">
    <img src="https://avatars3.githubusercontent.com/u/8081142?v=3&s=80">
  </a>

  <a href="https://github.com/hectoruch" target="_blank" style="display: inline-block">
    <img src="https://avatars2.githubusercontent.com/u/8074563?v=3&s=80">
  </a>

  <a href="https://github.com/EnriqueCornejo" target="_blank" style="display: inline-block">
    <img src="https://avatars0.githubusercontent.com/u/411529?v=3&s=80">
  </a>


