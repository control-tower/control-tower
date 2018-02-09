const logger = require('logger');
const config = require('config');
const appConstants = require('app.constants');
const MicroserviceModel = require('models/microservice.model');
const EndpointModel = require('models/endpoint.model');
const VersionModel = require('models/version.model');
const MicroserviceDuplicated = require('errors/microserviceDuplicated');
const MicroserviceNotExist = require('errors/microserviceNotExist');
const request = require('request-promise');
const url = require('url');
const crypto = require('crypto');
const pathToRegexp = require('path-to-regexp');
const NotificationService = require('services/notification.service.js');
const Promise = require('bluebird');
const JWT = Promise.promisifyAll(require('jsonwebtoken'));

const MICRO_STATUS_PENDING = 'pending';
const MICRO_STATUS_ACTIVE = 'active';
const MICRO_STATUS_DEACTIVATED = 'deactivated';
const MICRO_STATUS_ERROR = 'error';

class Microservice {

    static getFilters(endpoint) {
        logger.debug('Checking filters in endpoint', endpoint);
        let filters = null;
        if (endpoint.filters) {
            for (let i = 0, length = endpoint.filters.length; i < length; i++) {
                logger.debug(endpoint.filters[i]);
                let pathKeys = [];
                const pathRegex = pathToRegexp(endpoint.filters[i].path, pathKeys);
                if (pathKeys && pathKeys.length > 0) {
                    pathKeys = pathKeys.map((key) => key.name);
                }
                if (!filters) {
                    filters = [];
                }
                filters.push({
                    name: endpoint.filters[i].name,
                    path: endpoint.filters[i].path,
                    method: endpoint.filters[i].method,
                    condition: endpoint.filters[i].condition,
                    pathRegex,
                    pathKeys,
                    params: endpoint.filters[i].params,
                    compare: endpoint.filters[i].compare,
                });
            }
        }
        return filters;
    }

    static async saveEndpoint(endpoint, micro, version) {
        logger.info(`Saving endpoint ${endpoint.path} with version ${version}`);
        logger.debug(`Searching if exist ${endpoint.path} in endpoints`);
        endpoint.redirect.url = micro.url;
        // searching
        const oldEndpoint = await EndpointModel.findOne({
            path: endpoint.path,
            method: endpoint.method,
            version,
            toDelete: false
        }).exec();
        if (oldEndpoint) {
            logger.debug(`Exist path. Check if exist redirect with url ${endpoint.redirect.url}`);
            const oldRedirect = await EndpointModel.findOne({
                path: endpoint.path,
                method: endpoint.method,
                'redirect.url': endpoint.redirect.url,
                version,
            }).exec();
            if (!oldRedirect) {
                logger.debug('Not exist redirect');
                endpoint.redirect.filters = Microservice.getFilters(endpoint);
                oldEndpoint.redirect.push(endpoint.redirect);
                oldEndpoint.uncache = micro.uncache;
                oldEndpoint.cache = micro.cache;
                await oldEndpoint.save();
            } else {
                logger.debug('Exist redirect. Updating', oldRedirect);
                for (let i = 0, length = oldRedirect.redirect.length; i < length; i++) {
                    if (oldRedirect.redirect[i].url === endpoint.redirect.url) {
                        oldRedirect.uncache = micro.uncache;
                        oldRedirect.cache = micro.cache;
                        oldRedirect.redirect[i].method = endpoint.redirect.method;
                        oldRedirect.redirect[i].path = endpoint.redirect.path;
                        oldRedirect.redirect[i].filters = Microservice.getFilters(endpoint);
                    }
                }
                await oldRedirect.save();
            }

        } else {
            logger.debug('Not exist path. Registering new');
            let pathKeys = [];
            const pathRegex = pathToRegexp(endpoint.path, pathKeys);
            if (pathKeys && pathKeys.length > 0) {
                pathKeys = pathKeys.map((key) => key.name);
            }
            logger.debug('Saving new endpoint');
            endpoint.redirect.filters = Microservice.getFilters(endpoint);
            logger.debug('filters', endpoint.redirect.filters);
            logger.debug('regesx', pathRegex);
            await new EndpointModel({
                path: endpoint.path,
                method: endpoint.method,
                pathRegex,
                pathKeys,
                authenticated: endpoint.authenticated,
                applicationRequired: endpoint.applicationRequired,
                binary: endpoint.binary,
                redirect: [endpoint.redirect],
                version,
                uncache: micro.uncache,
                cache: micro.cache
            }).save();
        }
    }

    static async saveEndpoints(micro, info, version) {
        logger.info('Saving endpoints');
        if (info.endpoints && info.endpoints.length > 0) {
            for (let i = 0, length = info.endpoints.length; i < length; i++) {
                await Microservice.saveEndpoint(info.endpoints[i], micro, version);
            }
        }
    }

    static generateUrlInfo(urlInfo, token, internalUrl) {
        logger.debug('Generating url info to microservice with url', urlInfo);
        const queryParams = `token=${token}&url=${internalUrl}`;
        if (urlInfo.indexOf('?') >= 0) {
            return `${urlInfo}`;
        }
        return `${urlInfo}`;
    }

    static formatFilters(endpoint) {
        if (endpoint) {
            if (endpoint.filters) {
                if (endpoint.filters) {
                    const filters = [];
                    filters.push({
                        name: endpoint.paramProvider || 'dataset',
                        path: endpoint.pathProvider || '/v1/dataset/:dataset',
                        method: 'GET',
                        params: {
                            dataset: 'dataset',
                        },
                        compare: endpoint.filters,
                    });
                    return filters;
                }
            }
        }
        return null;
    }

    static transformToNewVersion(info) {
        logger.info('Checking if is necesary transform to new version');
        if (info.urls) {
            info.endpoints = info.urls.map((endpoint) => ({
                path: endpoint.url,
                method: endpoint.method,
                redirect: endpoint.endpoints[0],
                filters: Microservice.formatFilters(endpoint),
                authenticated: endpoint.authenticated || false,
                applicationRequired: endpoint.applicationRequired || false,
                binary: endpoint.binary || false,
            }));
            delete info.urls;
        }
        return info;
    }

    static async generateToken(micro) {
        const token = JWT.sign(micro, config.get('jwt.token'), {});
        return token;
    }

    static async getInfoMicroservice(micro, version) {
        try {
            logger.info(`Obtaining info of the microservice with name ${micro.name} and version ${version}`);
            let urlInfo = url.resolve(micro.url, micro.pathInfo);
            logger.debug('Generating token');
            const token = await Microservice.generateToken(micro);
            urlInfo = Microservice.generateUrlInfo(urlInfo, token, config.get('server.internalUrl'));
            logger.debug(`Doing request to ${urlInfo}`);
            let result = null;

            result = await request({
                url: urlInfo,
                json: true,
                method: 'GET',
                timeout: 10000
            });
            logger.debug('Updating microservice');
            result = Microservice.transformToNewVersion(result);
            micro.endpoints = result.endpoints;
            micro.cache = result.cache;
            micro.uncache = result.uncache;

            logger.debug('Microservice info', result.endpoints[0]);
            micro.swagger = JSON.stringify(result.swagger);
            micro.updatedAt = Date.now();
            micro.token = token;
            if (result.tags) {
                if (!micro.tags) {
                    micro.tags = [];
                }
                micro.tags = micro.tags.concat(result.tags);
            }
            await micro.save();
            await Microservice.saveEndpoints(micro, result, version);
            return true;
        } catch (err) {
            logger.error(err);
            return false;
        }
    }

    static async register(info, ver) {
        try {
            let version = ver;
            let versionExist = null;
            if (!version) {
                versionExist = true;
                const versionFound = await VersionModel.findOne({
                    name: appConstants.ENDPOINT_VERSION,
                });
                version = versionFound.version;
                versionExist = versionFound;
            }
            logger.info(`Registering new microservice with name ${info.name} and url ${info.url}`);
            logger.debug('Search if exist');
            let exist = await MicroserviceModel.findOne({
                url: info.url,
                version,
            });
            // if (exist) {
            //     if (!config.get('microservice.overrideDuplicated')) {
            //         logger.debug('Not override activated');
            //         throw new MicroserviceDuplicated(`Microservice with url ${info.url} exists`);
            //     } else {
            //         logger.debug('Override activated, Removing old version of microservice');
            //         const finded = await MicroserviceModel.find({
            //             url: info.url,
            //             version,
            //         });
            //         if (finded) {
            //             for (let i = 0; i < finded.length; i++) {
            //                 await Microservice.remove(finded[i]._id); // eslint-disable-line no-underscore-dangle
            //             }
            //         }

            //     }
            // }
            let micro = null;
            if (exist) {
                exist = await MicroserviceModel.findByIdAndUpdate(exist._id, {
                    $set: {
                        status: MICRO_STATUS_PENDING
                    }
                });
                micro = await MicroserviceModel.findById(exist._id);
            }
             
            if (!exist || exist.status !== MICRO_STATUS_PENDING ) {
                
                try {
                    if (exist) {
                        await Microservice.remove(exist._id);
                    } else {
                        logger.debug(`Creating microservice with status ${MICRO_STATUS_PENDING}`);

                        micro = await new MicroserviceModel({
                            name: info.name,
                            status: MICRO_STATUS_PENDING,
                            url: info.url,
                            pathInfo: info.pathInfo,
                            swagger: info.swagger,
                            token: crypto.randomBytes(20).toString('hex'),
                            tags: info.tags,
                            version,
                        }).save();
                        
                    }
                    logger.debug(`Creating microservice with status ${MICRO_STATUS_PENDING}`);


                    const correct = await Microservice.getInfoMicroservice(micro, version);
                    if (correct) {
                        logger.info(`Updating state of microservice with name ${micro.name}`);
                        micro.status = MICRO_STATUS_ACTIVE;
                        await micro.save();
                        if (exist) {
                            logger.info('Removing endpoints with toDelete to true');
                            await Microservice.removeEndpointToDeleteOfMicroservice(exist._id);
                        }
                        if (versionExist) {
                            versionExist.lastUpdated = new Date();
                            await versionExist.save();
                        }
                        logger.info('Updated successfully');
                    } else {
                        logger.info(`Updated to error state microservice with name ${micro.name}`);
                        micro.status = MICRO_STATUS_ERROR;
                        await micro.save();
                    }
                } catch (err) {
                    logger.error(err);
                    micro.status = MICRO_STATUS_ERROR;
                    await micro.save();
                }
                return micro;
            } else {
                logger.error('Mutex active in microservice ', info.url);
            }
        } catch(err) {
            logger.error(err);
        }
    }

    static async tryRegisterErrorMicroservices() {
        logger.info('Trying register microservices with status error');
        const versionFound = await VersionModel.findOne({
            name: appConstants.ENDPOINT_VERSION,
        });
        const version = versionFound.version;

        const errorMicroservices = await MicroserviceModel.find({
            status: {
                $in: [MICRO_STATUS_ERROR, MICRO_STATUS_PENDING]
            },
            version
        });
        if (errorMicroservices && errorMicroservices.length > 0) {
            for (let i = 0, length = errorMicroservices.length; i < length; i++) {
                const micro = errorMicroservices[i];
                if (micro.status === MICRO_STATUS_ERROR ||
                    (micro.status === MICRO_STATUS_PENDING && (Date.now() - micro.updatedAt.getTime()) > 10000)) {
                    const correct = await Microservice.getInfoMicroservice(micro, version);
                    if (correct) {
                        logger.info(`Updating state of microservice with name ${micro.name}`);
                        micro.status = MICRO_STATUS_ACTIVE;
                        await micro.save();
                        logger.info('Updated successfully');
                    } else {
                        logger.info(`Updated to error state microservice with name ${micro.name}`);
                        micro.status = MICRO_STATUS_ERROR;
                        await micro.save();
                    }
                }
            }
        } else {
            logger.info('Not exist microservices in error state');
        }
    }

    static async removeEndpointOfMicroservice(micro) {
        logger.info(`Removing endpoints of microservice with url ${micro.url}`);
        if (micro && micro.endpoints) {
            for (let i = 0, length = micro.endpoints.length; i < length; i++) {
                const endpoint = await EndpointModel.findOne({
                    method: micro.endpoints[i].method,
                    path: micro.endpoints[i].path,
                    toDelete: false
                }).exec();
                if (endpoint) {
                    const redirects = endpoint.redirect.filter((red) => red.url !== micro.url);
                    if (redirects && redirects.length > 0) {
                        logger.debug('Updating endpoint');
                        endpoint.redirect = redirects;
                        await endpoint.save();
                    } else {
                        logger.debug('Endpoint empty. Removing endpoint');
                        endpoint.toDelete = true;
                        await endpoint.save();
                    }
                }
            }
        }
    }

    static async removeEndpointToDeleteOfMicroservice(id) {

        logger.info(`Removing endpoints with toDelete to true of microservice with id ${id}`);
        const micro = await MicroserviceModel.findById(id, {
            __v: 0,
        });
        if (!micro) {
            throw new MicroserviceNotExist(`Microservice with id ${id} does not exist`);
        }
        if (micro && micro.endpoints) {
            for (let i = 0, length = micro.endpoints.length; i < length; i++) {
                await EndpointModel.remove({
                    method: micro.endpoints[i].method,
                    path: micro.endpoints[i].path,
                    toDelete: true
                }).exec();
            }
        }
    }

    static async remove(id) {
        logger.info(`Removing microservice with id ${id}`);
        const micro = await MicroserviceModel.findById(id, {
            __v: 0,
        });
        if (!micro) {
            throw new MicroserviceNotExist(`Microservice with id ${id} does not exist`);
        }
        logger.debug('Removing endpoints');
        await Microservice.removeEndpointOfMicroservice(micro);
        // await micro.remove();
        return micro;
    }

    static async checkLiveMicro(micro) {
        logger.debug(`Checking live of microservice: ${micro.name} `);
        const urlLive = url.resolve(micro.url, micro.pathLive);
        logger.debug(`Doing request to ${urlLive}`);
        if (!micro.infoStatus) {
            micro.infoStatus = {};
        }
        try {
            await request({
                uri: urlLive,
                timeout: 5000
            });
            if (micro.status === MICRO_STATUS_ERROR) {
                logger.info('Sending event of restore microservice');
                await NotificationService.sendAlertMicroserviceRestore(micro.name, micro.url);
            }
            micro.infoStatus.lastCheck = new Date();
            micro.infoStatus.error = null;
            micro.infoStatus.numRetries = 0;
            micro.status = MICRO_STATUS_ACTIVE;
            await micro.save();
            logger.debug(`Microservice ${micro.name} is live`);
        } catch (err) {
            logger.error(`Microservice ${micro.name} is DOWN`, err);
            micro.infoStatus.lastCheck = new Date();
            micro.infoStatus.numRetries++;
            micro.status = MICRO_STATUS_ERROR;
            micro.infoStatus.error = err.message;
            await micro.save();

            if (micro.infoStatus.numRetries === 3) {
                await NotificationService.sendAlertMicroserviceDown(micro.name, micro.url, err);
            }
            return false;
        }
        return true;
    }

    static async checkLiveMicroservice() {
        logger.info('Check live microservices');

        const versionFound = await VersionModel.findOne({
            name: appConstants.ENDPOINT_VERSION,
        });
        logger.debug('Found', versionFound);

        logger.info('Obtaining microservices with version ', versionFound);
        const microservices = await MicroserviceModel.find({
            version: versionFound.version
        });
        if (!microservices || microservices.length === 0) {
            logger.info('Not exist registered microservices');
            return;
        }
        for (let i = 0, length = microservices.length; i < length; i++) {
            await Microservice.checkLiveMicro(microservices[i]);
        }
        logger.info('Finished checking');
    }

    static async registerPackMicroservices(microservices) {
        logger.info('Refreshing all microservices');
        logger.debug('Obtaining new version');
        const versionFound = await VersionModel.findOne({
            name: appConstants.ENDPOINT_VERSION,
        });
        logger.debug('Found', versionFound);
        const newVersion = versionFound.version + 1;
        logger.debug('New version is ', newVersion);

        if (microservices) {
            for (let i = 0, length = microservices.length; i < length; i++) {
                try {
                    if (microservices[i].name !== null && microservices[i].url !== null) {
                        logger.debug(`Registering microservice with name ${microservices[i].name}`);
                        await Microservice.register(microservices[i], newVersion);
                    }
                } catch (err) {
                    logger.error('Error registering microservice', err);
                }
            }
        }
        logger.info('Updating version of ENDPOINT_VERSION');
        await VersionModel.update({
            name: appConstants.ENDPOINT_VERSION,
        }, {
            $set: {
                version: newVersion,
            },
        });
        logger.info('Registered successfully');
    }

}

module.exports = Microservice;
