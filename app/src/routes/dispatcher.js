const Router = require('koa-router');
const logger = require('logger');
const DispatcherService = require('services/dispatcher.service.js');
const EndpointNotFound = require('errors/endpointNotFound');
const NotAuthenticated = require('errors/notAuthenticated');
const FilterError = require('errors/filterError');
const MicroserviceModel = require('models/microservice.model');
const fs = require('fs');
const router = new Router();
const Promise = require('bluebird');
// const restling = require('restling');
const requestPromise = require('request-promise');
const request = require('request');

const unlink = async(file) =>
    new Promise((resolve, reject) => {
        fs.unlink(file, (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });

const ALLOWED_HEADERS = [
    'access-control-allow-origin',
    'access-control-allow-headers',
    'cache-control',
    'charset',
    'location',
];

function getHeadersFromResponse(response) {
    const validHeaders = {};
    const keys = Object.keys(response.headers);
    for (let i = 0, length = keys.length; i < length; i++) {
        if (ALLOWED_HEADERS.indexOf(keys[1].toLowerCase()) > -1) {
            validHeaders[keys[i]] = response.headers[keys[i]];
        }
    }
    return validHeaders;
}

class DispatcherRouter {

    static getInfoRedirect(ctx, result) {
        return {
            source: {
                path: ctx.request.url,
                method: ctx.request.method,
            },
            redirect: {
                url: result.configRequest.uri,
                method: result.configRequest.method,
                endpoint: result.endpoint,
            },
        };
    }

    static async dispatch(ctx) {
        logger.info(`Dispatch url ${ctx.request.url} and method ${ctx.request.method}`);
        try {
            logger.debug('Obtaining config request');
            const infoRequest = await DispatcherService.getRequest(ctx);
            const configRequest = infoRequest.configRequest;

            logger.debug('Sending request');
            // save information about redirect
            ctx.state = DispatcherRouter.getInfoRedirect(ctx, infoRequest);
            configRequest.followRedirects = false;

            logger.debug('Config request', configRequest);
            if (!configRequest.binary) {
                const result = await requestPromise(configRequest);
                // set headers
                ctx.set(getHeadersFromResponse(result));
                ctx.status = result.statusCode;
                ctx.body = result.body;
                ctx.response.type = result.headers['content-type'];
            } else {
                logger.info('Binary request');
                ctx.body = request(configRequest);
            }
        } catch (err) {
            logger.error(err);
            if (err instanceof EndpointNotFound) {
                logger.error('Endpoint not found');
                ctx.throw(404, 'Endpoint not found');
                return;
            }
            if (err instanceof FilterError) {
                logger.error('Filter error', err);
                ctx.throw(500, err.message);
                return;
            }
            if (err instanceof NotAuthenticated) {
                logger.error('Not authorized');
                ctx.throw(401, err.message);
                return;
            }
            if (err.errors && err.errors.length > 0 && err.errors[0].status >= 400 && err.errors[0].status < 500) {
                ctx.status = err.errors[0].status;
                ctx.body = err;
            } else {
                if (process.env.NODE_ENV === 'prod') {
                    ctx.throw(500, 'Unexpected error');
                    return;
                }
                let message = '';
                if (err.message) {
                    message += err.message;
                }
                if (err.exception) {
                    message += ` --- ${err.exception}`;
                }
                ctx.throw(err.statusCode || 500, message);
                return;
            }

        } finally {
            if (ctx.request.body.files) {
                logger.debug('Removing files');
                const files = Object.keys(ctx.request.body.files);
                for (let i = 0, length = files.length; i < length; i++) {
                    logger.debug('Removing file  %s', ctx.request.body.files[files[i]].path);
                    await unlink(ctx.request.body.files[files[i]].path);
                }
            }
        }

    }

}

async function authMicroservice(ctx, next) {
    if (ctx.headers && ctx.headers.authentication) {
        logger.debug('Authenticated microservice with token: ', ctx.headers.authentication);
        const service = await MicroserviceModel.findOne({
            token: ctx.headers.authentication,
        }, { swagger: 0 });
        if (service) {
            ctx.state.microservice = service;
        }
    }

    await next();
}

router.get('/*', authMicroservice, DispatcherRouter.dispatch);
router.post('/*', authMicroservice, DispatcherRouter.dispatch);
router.delete('/*', authMicroservice, DispatcherRouter.dispatch);
router.put('/*', authMicroservice, DispatcherRouter.dispatch);
router.patch('/*', authMicroservice, DispatcherRouter.dispatch);

module.exports = router;