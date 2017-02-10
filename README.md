# Control tower: API Gateway on Steroids

<img src="https://avatars0.githubusercontent.com/u/20566771?v=3&s=200" style="display: block; margin: 0 auto;">




[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

## Getting started

You only have to follow 4 steps:

1 - Clone the repository

```
git clone https://github.com/control-tower/control-tower.git
```

2 - Enter in the cloned path

```
cd control-tower
```

3 - Create and complete your dev.env file with your configuration. To know the mean of each variable, visit this [section](#environment-variables). You have an example .env file in the project. It is .env.sample

4 - Raise Control tower with docker. You need docker installed in your machine. If you need install it, visit this [web](https://www.docker.com/products/docker). You only execute the next command to run Control tower:

```bash
./controlTower.sh develop
```


Recommendation:

5 - Add the next line to your hosts file:

```
mymachine   <yourIP>
```

Enjoy your Control tower!!!

To check if Control tower works, you can do a request to [http://mymachine:9000](http://mymachine:9000/) and the response should be 404 (in the case that you don't have microservice registered in it)


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

In local, you can use the next tokens to identify diferents users (Generated with mysecret key).
To authorize your request, you have to set a new header with the following information:

```
name: Authenticated
value: Bearer <token>
```

Role USER with all Applications
Token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFhMTBkN2M2ZTBhMzcxMjY2MTFmZDdhNyIsInJvbGUiOiJVU0VSIiwicHJvdmlkZXIiOiJsb2NhbCIsImVtYWlsIjoidXNlckBjb250cm9sLXRvd2VyLm9yZyIsImV4dHJhVXNlckRhdGEiOnsiYXBwcyI6WyJydyIsImdmdyIsImdmdy1jbGltYXRlIiwicHJlcCIsImFxdWVkdWN0IiwiZm9yZXN0LWF0bGFzIiwiZGF0YTRzZGdzIl19fQ.eePyj9grA2akg2vKqmLz5Gg8hd2Afq64ZaeGLb-aLC0`

Role MANAGER with all Applications
Token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFhMTBkN2M2ZTBhMzcxMjY2MTFmZDdhNyIsInJvbGUiOiJNQU5BR0VSIiwicHJvdmlkZXIiOiJsb2NhbCIsImVtYWlsIjoibWFuYWdlckBjb250cm9sLXRvd2VyLm9yZyIsImV4dHJhVXNlckRhdGEiOnsiYXBwcyI6WyJydyIsImdmdyIsImdmdy1jbGltYXRlIiwicHJlcCIsImFxdWVkdWN0IiwiZm9yZXN0LWF0bGFzIiwiZGF0YTRzZGdzIl19fQ.ONb6dBz-pYxmXP3ECmRT7zmJHy8Dzn1GYyE6ndOR1Uw`

Role ADMIN with all Applications
Token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFhMTBkN2M2ZTBhMzcxMjY2MTFmZDdhNyIsInJvbGUiOiJBRE1JTiIsInByb3ZpZGVyIjoibG9jYWwiLCJlbWFpbCI6ImFkbWluQGNvbnRyb2wtdG93ZXIub3JnIiwiZXh0cmFVc2VyRGF0YSI6eyJhcHBzIjpbInJ3IiwiZ2Z3IiwiZ2Z3LWNsaW1hdGUiLCJwcmVwIiwiYXF1ZWR1Y3QiLCJmb3Jlc3QtYXRsYXMiLCJkYXRhNHNkZ3MiXX19.FglwGCDjeh5c3bdmV0GA6QiMd-I1AdbdHCLQQGUPRxw`

### Environment variables

Core Variables

- PORT => Port of control-tower listens. If you haven't set the variable, the default value is 9000
- LOGGER_TYPE => Type of logger. Possible values: console, syslog. If you haven't set the variable, the default value is console.
- NODE_ENV => Variable of environment of nodejs. Required.
- NODE_PATH => Always this value. app/src. Required.
- EXEC_MIGRATION => This environment variable active the init migration when Control-tower starts and the variable is true. In other case Control Tower doesn't execute the init migration. Only execute Control tower with this environment variable to true the first time that you run Control tower. Any other times you run with false.

Oauth Variables

- JWT_SECRET => Value of secret that it use to generate the jwt tokens. If you active the jwt feature in auth-plugin, you must define this variable. It is required when active jwt. By default JWT is active.
- TWITTER_CONSUMER_KEY => Consumer key of oauth with twitter. It is required if you active oauth with twitter.
- TWITTER_CONSUMER_SECRET => Consumer secret of oauth with twitter. It is required if you active oauth with twitter.
- GOOGLE_CLIENT_ID => Client id of oauth with Google+. It is required if you active oauth with Google+.
- GOOGLE_CLIENT_SECRET => Client secret of oauth with Google+. It is required if you active oauth with Google+.
- FACEBOOK_CLIENT_ID => Client id of oauth with Facebook. It is required if you active oauth with Facebook.
- FACEBOOK_CLIENT_SECRET => Client secret of oauth with Facebook. It is required if you active oauth with Facebook.
- SPARKPOST_KEY => Key to send mails with sparkpost service. It is required if you active local oauth.
- CONFIRM_URL_REDIRECT => Url where you want redirect when the new user activates his account. It is required if you active local oauth.
- PUBLIC_URL => Url to compose the link of activate user. It must be the public domain of your Control tower instance. It is required if you active local oauth.
- BASICAUTH_USERNAME => Username of basic auth. It is required if you active basic auth.
- BASICAUTH_PASSWORD => Password of basic auth. It is required if you active basic auth.

Redis Cache variables

- REDIS_PORT_6379_TCP_ADDR => Host of the Redis database. It is required if you active redis cache plugin.
- REDIS_PORT_6379_TCP_PORT => Port of the Redis database. It is required if you active redis cache plugin.

Mongo session variables

- COOKIE_DOMAIN => Domain of the cookies that the session plugin sets. It is required if you activate sessionMongo plugin.
- SESSION_KEY => Key to cipher cookies.  It is required if you activate sessionMongo plugin.

Live cron variables

- INSTAPUSH_TOKEN => Token of instapush service to send alerts to your mobile with the live cron. It is required if you activate live cron.
- INSTAPUSH_ID => Id of instapush service to send alerts to your mobile with the live cron. It is required if you activate live cron.
- INSTAPUSH_SECRET => Secret of instapush service to send alerts to your mobile with the live cron. It is required if you activate live cron.

### Plugins

TODO

### Crons

TODO


## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
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


