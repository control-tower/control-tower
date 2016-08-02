const logger = require('logger');
const appConstants = require('app.constants');
const EndpointModel = require('models/endpoint.model');
const VersionModel = require('models/version.model');
const url = require('url');
const EndpointNotFound = require('errors/endpointNotFound');
const NotAuthenticated = require('errors/notAuthenticated');
const FilterError = require('errors/filterError');
const pathToRegexp = require('path-to-regexp');
const requestPromise = require('request-promise');
const rest = require('restler');

class Dispatcher {

    static getLoggedUser(ctx) {
        return ctx.state.user || ctx.req.user || ctx.state.microservice;
    }

    static async buildUrl(sourcePath, redirectEndpoint, endpoint) {
        logger.debug('Building url');
        const result = endpoint.pathRegex.exec(sourcePath);
        let keys = {}; // eslint-disable-line prefer-const
        endpoint.pathKeys.map((key, i) => (
            keys[key] = result[i + 1]
        ));
        const toPath = pathToRegexp.compile(redirectEndpoint.path);
        const buildUrl = url.resolve(redirectEndpoint.url, toPath(keys));
        logger.debug(`Final url  ${buildUrl}`);
        return buildUrl;
    }

    static buildPathFilter(sourcePath, filterEndpoint, endpoint) {
        logger.debug('Building url');
        const result = endpoint.pathRegex.exec(sourcePath);
        let keys = {}; // eslint-disable-line prefer-const
        endpoint.pathKeys.map((key, i) => (
            keys[filterEndpoint.params[key]] = result[i + 1]
        ));
        const toPath = pathToRegexp.compile(filterEndpoint.path);
        const path = toPath(keys);
        logger.debug(`Final path  ${path}`);
        return path;
    }

    static searchFilterValue(filter, filterValues) {
        logger.debug('Searching filterValue to filter', filter.name);

        if (filterValues) {
            for (let i = 0, length = filterValues.length; i < length; i++) {
                if (filterValues[i].name === filter.name && filterValues[i].path === filter.path
                    && filterValues[i].method === filter.method && filterValues[i].result.correct) {
                    return filterValues[i].result.data;
                }
            }
        }
        logger.warn('Not find filter value to filter', filter.name);
        return null;
    }

    static checkCompare(compare, dataFilter) {
        logger.debug('Check compare filter to filter', compare, 'and dataFilter', dataFilter);
        if (compare && dataFilter) {
            const compareKeys = Object.keys(compare);
            for (let i = 0, length = compareKeys.length; i < length; i++) {
                const key = compareKeys[i];
                logger.debug(key);
                logger.debug('compare[key]', compare[key]);
                logger.debug('dataFilter[key]', dataFilter[key]);
                if (compare[key] !== dataFilter[key]) {
                    return false;
                }
            }
        }
        return true;
    }

    static checkValidRedirects(redirects, filters) {
        logger.debug('Checking redirects with filters');
        const validRedirects = [];
        for (let i = 0, length = redirects.length; i < length; i++) {
            const redirect = redirects[i];
            let valid = true;
            if (redirect.filters) {
                for (let j = 0, lengthRF = redirect.filters.length; j < lengthRF; j++) {
                    const filterValue = Dispatcher.searchFilterValue(redirect.filters[i], filters);
                    if (!filterValue || !Dispatcher.checkCompare(redirect.filters[i].compare, filterValue)) {
                        logger.warn('Not valid filter');
                        valid = false;
                        break;
                    }
                    if (!redirect.data) {
                        redirect.data = {};
                    }
                    redirect.data[redirect.filters[i].name] = filterValue;
                }
            }
            if (valid) {
                validRedirects.push(redirect);
            }
        }
        return validRedirects;
    }

    static async checkFilters(sourcePath, endpoint) {
        logger.debug('Checking filters in endpoint', endpoint);
        let filters = [];
        for (let i = 0, length = endpoint.redirect.length; i < length; i++) {
            if (endpoint.redirect[i].filters) {
                filters = filters.concat(endpoint.redirect[i].filters);
            }
        }
        if (!filters || filters.length === 0) {
            logger.debug('Not contain filters. All redirect are valids');
            return endpoint;
        }
        logger.debug('Obtaining data to check filters');
        const promisesRequest = [];
        let filter = null;
        let path = null;
        for (let i = 0, length = filters.length; i < length; i++) {
            filter = filters[i];
            path = await Dispatcher.buildPathFilter(sourcePath, filter, endpoint);
            const request = await Dispatcher.getRequest({
                request: {
                    url: path,
                    method: filter.method,
                    body: {},
                },
            });
            logger.debug('Config request', request);
            request.configRequest.json = true;
            promisesRequest.push(requestPromise(request.configRequest));

        }
        if (!promisesRequest || promisesRequest.length === 0) {
            return endpoint;
        }
        try {
            logger.debug('Doing requests');
            const results = await Promise.all(promisesRequest);
            // TODO: Add support to serveral filter by each endpoint
            for (let i = 0, length = results.length; i < length; i++) {
                if (results[i].statusCode === 200) {
                    filters[i].result = {
                        data: results[i].body,
                        correct: true,
                    };
                } else {
                    filters[i].result = {
                        correct: false,
                    };
                }
            }
            logger.debug('Checking valid filters');
            const validRedirects = Dispatcher.checkValidRedirects(endpoint.redirect, filters);
            endpoint.redirect = validRedirects;
        } catch (err) {
            logger.error(err);
            throw new FilterError('Error resolving filters');
        }
        return endpoint;
    }

    static async getRequest(ctx) {
        logger.info(`Searching endpoint where redirect url ${ctx.request.url}
            and method ${ctx.request.method}`);
        logger.debug('Obtaining version');
        const version = await VersionModel.findOne({ name: appConstants.ENDPOINT_VERSION });
        logger.debug('Version found ', version);
        const parsedUrl = url.parse(ctx.request.url);
        logger.debug('Searching endpoints');
        let endpoint = await EndpointModel.findOne({
            $where: `this.pathRegex && this.pathRegex.test('${parsedUrl.pathname}')`,
            method: ctx.request.method,
            version: version.version,
        });

        if (!endpoint) {
            throw new EndpointNotFound(`${parsedUrl.pathname} not found`);
        } else {
            logger.debug('Endpoint found');
            logger.debug('Checking if is necesary authentication');
            if (endpoint.authenticated && !Dispatcher.isLogged()) {
                logger.info('Is necesary authentication but the request is not authenticated');
                throw new NotAuthenticated();
            }
            let redirectEndpoint = null;
            endpoint = await Dispatcher.checkFilters(parsedUrl.pathname, endpoint);
            if (endpoint && endpoint.redirect.length === 0) {
                logger.error('Not exist redirects');
                throw new EndpointNotFound(`${parsedUrl.pathname} not found`);
            }

            if (endpoint.redirect && endpoint.redirect.length > 1) {
                logger.debug(`Find several redirect endpoints (num: ${endpoint.redirect.length}).
                Obtaining final endpoint with random`);
                const pos = Math.floor(Math.random() * endpoint.redirect.length);
                logger.debug(`Position choose ${pos}`);
                redirectEndpoint = endpoint.redirect[pos];
            } else {
                logger.debug('Only contain one redirect');
                redirectEndpoint = endpoint.redirect[0];
            }
            logger.info('Dispathing request from %s to %s%s private endpoint.',
                parsedUrl.pathname, redirectEndpoint.url, redirectEndpoint.path);

            const finalUrl = await Dispatcher.buildUrl(parsedUrl.pathname, redirectEndpoint, endpoint);
            let configRequest = { // eslint-disable-line prefer-const
                uri: finalUrl,
                method: redirectEndpoint.method,
                // json: true,
                // https://github.com/request/request-promise#user-content-get-a-rejection-only-if-the-request-failed-for-technical-reasons
                simple: false,
                resolveWithFullResponse: true,
                binary: endpoint.binary,
            };
            if (ctx.request.search) {
                logger.debug('Adding query params');
                configRequest.uri = `${configRequest.uri}${ctx.request.search}`;
            }

            logger.debug('Create request to %s', configRequest.uri);
            if (configRequest.method === 'POST' || configRequest.method === 'PATCH' ||
                configRequest.method === 'PUT') {
                logger.debug('Method is %s. Adding body', configRequest.method);
                configRequest.data = ctx.request.body;
            }
            if (redirectEndpoint.data) {
                logger.debug('Adding data');
                if (endpoint.authenticated) {
                    redirectEndpoint.data = Object.assign({}, redirectEndpoint.data, { loggedUser: Dispatcher.isLogged() });
                }
                if (configRequest.method === 'GET' || configRequest.method === 'DELETE') {
                    configRequest.query = configRequest.query || {};
                    configRequest.query = Object.assign({}, configRequest.query, redirectEndpoint.data);
                } else {
                    configRequest.data = Object.assign({}, configRequest.data, redirectEndpoint.data);
                }
            }
            if (ctx.request.body.files) {
                logger.debug('Adding files');
                const files = ctx.request.body.files;
                let formData = {}; // eslint-disable-line prefer-const
                for (const key in files) { // eslint-disable-line no-restricted-syntax
                    if ({}.hasOwnProperty.call(files, key)) {
                        formData[key] = rest.file(files[key].path);
                    }
                }
                configRequest.data = Object.assign(configRequest.data || {}, formData);
                configRequest.multipart = true;
            }
            if (ctx.request.headers) {
                logger.debug('Adding headers');
                configRequest.headers = ctx.request.headers;
            }
            // if (endpoint.authenticated) {
            //     logger.debug('Adding user in request.');
            //     if (configRequest.method === 'POST' || configRequest.method === 'PATCH' ||
            //         configRequest.method === 'PUT') {
            //         logger.debug('Method is %s. Adding body', configRequest.method);
            //         configRequest.data = Object.extend({}, configRequest.data, { loggedUser: Dispatcher.getLoggedUser() });
            //     } else {
            //         if (ctx.request.search) {
            //             configRequest.uri = `${configRequest.uri}&loggedUser=${Dispatcher.getLoggedUser()}`;
            //         } else {
            //             configRequest.uri = `${configRequest.uri}?loggedUser=${Dispatcher.getLoggedUser()}`;
            //         }
            //     }
            // }

            logger.debug('Returning config', configRequest);
            return {
                configRequest,
                endpoint,
            };
        }
    }

}

module.exports = Dispatcher;
