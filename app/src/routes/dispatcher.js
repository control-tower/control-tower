const Router = require('koa-router');
const logger = require('logger');
const DispatcherService = require('services/dispatcher.service.js');
const EndpointNotFound = require('errors/endpointNotFound');
const NotAuthenticated = require('errors/notAuthenticated');
const fs = require('fs');
const router = new Router();
const Promise = require('bluebird');
const restling = require('restling');

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
    for (let [key, value] of Dict.entries(response)) {
        if (ALLOWED_HEADERS.indexOf(key.toLowerCase()) > -1) {
            validHeaders[key] = value;
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
            const infoRequest = await DispatcherService.getRequests(ctx);
            const configRequest = infoRequest.configRequest;
            logger.debug('Config request', configRequest);
            logger.debug('Sending request');
            // save information about redirect
            ctx.state = DispatcherRouter.getInfoRedirect(ctx, infoRequest);
            configRequest.followRedirects = false;
            const result = await restling.request(configRequest.uri, configRequest);
            // set headers
            ctx.set(getHeadersFromResponse(result.response));
            ctx.status = result.response.statusCode;
            ctx.body = result.data;
            ctx.response.type = result.response.headers['content-type'];
        } catch (err) {
            logger.error(err);
            if (err instanceof EndpointNotFound) {
                logger.debug('Endpoint not found');
                ctx.throw(404, 'Endpoint not found');
                return;
            }
            if (err instanceof NotAuthenticated) {
                logger.debug('Not authorized');
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

router.get('/*', DispatcherRouter.dispatch);
router.post('/*', DispatcherRouter.dispatch);
router.delete('/*', DispatcherRouter.dispatch);
router.put('/*', DispatcherRouter.dispatch);
router.patch('/*', DispatcherRouter.dispatch);

module.exports = router;
