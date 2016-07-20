const logger = require('logger');
const MicroserviceModel = require('models/microservice.model');
const EndpointModel = require('models/endpoint.model');
const MicroserviceDuplicated = require('errors/microserviceDuplicated');
const MicroserviceNotExist = require('errors/microserviceNotExist');
const request = require('request-promise');
const url = require('url');
const crypto = require('crypto');
const pathToRegexp = require('path-to-regexp');


const MICRO_STATUS_PENDING = 'pending';
const MICRO_STATUS_ACTIVE = 'active';
const MICRO_STATUS_DEACTIVATED = 'deactivated';
const MICRO_STATUS_ERROR = 'error';

class Microservice {

    static async saveEndpoint(endpoint, micro) {
        logger.info(`Saving endpoint ${endpoint.path}`);
        logger.debug(`Searching if exist ${endpoint.path} in endpoints`);
        endpoint.redirect.url = micro.url;
        // searching
        const oldEndpoint = await EndpointModel.findOne({
            path: endpoint.path,
            method: endpoint.method,
        }).exec();
        if (oldEndpoint) {
            logger.debug(`Exist path. Check if exist redirect with url ${endpoint.redirect.url}`);
            const oldRedirect = await EndpointModel.findOne({
                path: endpoint.path,
                method: endpoint.method,
                'redirect.url': endpoint.redirect.url,
            }).exec();
            logger.debug('Entra', oldRedirect);
            if (!oldRedirect) {
                logger.debug('Not exist redirect');
                oldEndpoint.redirect.push(endpoint.redirect);
                await oldEndpoint.save();
            } else {
                logger.debug('Exist redirect. Updating', oldRedirect);
                oldRedirect.redirect[0].method = endpoint.redirect.method;
                oldRedirect.redirect[0].path = endpoint.redirect.path;
                await oldRedirect.save();
            }

        } else {
            logger.debug('Not exist path. Registering new');
            let pathKeys = [];
            const pathRegex = pathToRegexp(endpoint.path, pathKeys);
            if (pathKeys && pathKeys.length > 0) {
                pathKeys = pathKeys.map((key) => key.name);
            }
            logger.debug('Saving new endpoint', pathKeys);
            await new EndpointModel({
                path: endpoint.path,
                method: endpoint.method,
                pathRegex,
                pathKeys,
                authenticated: endpoint.authenticated,
                redirect: [endpoint.redirect],
            }).save();
        }
    }

    static async saveEndpoints(micro, info) {
        logger.info('Saving endpoints');
        if (info.endpoints && info.endpoints.length > 0) {
            for (let i = 0, length = info.endpoints.length; i < length; i++) {
                await Microservice.saveEndpoint(info.endpoints[i], micro);
            }
        }
    }

    static async getInfoMicroservice(micro) {
        logger.info(`Obtaining info of the microservice with name ${micro.name}`);
        const urlInfo = url.resolve(micro.url, micro.pathInfo);
        logger.debug(`Doing request to ${urlInfo}`);
        let result = null;
        try {
            result = await request({
                uri: urlInfo,
                json: true,
            });
            logger.debug('Updating microservice');
            micro.endpoints = result.endpoints;
            micro.swagger = result.swagger;
            micro.updatedAt = Date.now();
            await micro.save();
            Microservice.saveEndpoints(micro, result);
            return true;
        } catch (err) {
            logger.error(err);
            return false;
        }
    }

    static async register(info) {
        logger.info(`Registering new microservice with name ${info.name} and url ${info.url}`);
        logger.debug('Search if exist');
        const exist = await MicroserviceModel.findOne({
            url: info.url,
        });
        if (exist) {
            throw new MicroserviceDuplicated(`Microservice with url ${info.url} exists`);
        }
        logger.debug(`Creating microservice with status ${MICRO_STATUS_PENDING}`);

        const micro = await new MicroserviceModel({
            name: info.name,
            status: MICRO_STATUS_PENDING,
            url: info.url,
            pathInfo: info.pathInfo,
            swagger: info.swagger,
            token: crypto.randomBytes(20).toString('hex'),
        }).save();

        logger.debug('Saved correct');
        const correct = await Microservice.getInfoMicroservice(micro);
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

        return micro;
    }

    static async removeEndpointOfMicroservice(micro) {
        logger.info(`Removing endpoints of microservice with url ${micro.url}`);
        if (micro && micro.endpoints) {
            for (let i = 0, length = micro.endpoints.length; i < length; i++) {
                const endpoint = await EndpointModel.findOne({
                    method: micro.endpoints[i].method,
                    path: micro.endpoints[i].path,
                }).exec();
                if (endpoint) {
                    endpoint.redirect = endpoint.redirect.filter((red) => red.url !== micro.url);
                    if (endpoint.redirect && endpoint.redirect.length > 0) {
                        logger.debug('Updating endpoint');
                        await endpoint.save();
                    } else {
                        logger.debug('Endpoint empty. Removing endpoint');
                        await endpoint.remove();
                    }
                }
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
        await micro.remove();
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
            });
            micro.infoStatus.lastCheck = new Date();
            micro.infoStatus.error = null;
            micro.status = MICRO_STATUS_ACTIVE;
            await micro.save();
            logger.debug(`Microservice ${micro.name} is live`);
        } catch (err) {
            logger.error(err);
            micro.infoStatus.lastCheck = new Date();
            micro.status = MICRO_STATUS_ERROR;
            micro.infoStatus.error = err.message;
            await micro.save();
            return false;
        }
        return true;
    }

    static async checkLiveMicroservice() {
        logger.info('Check live microservices');
        logger.debug('Obtaining microservices');
        const microservices = await MicroserviceModel.find();
        if (!microservices || microservices.length === 0) {
            logger.info('Not exist registered microservices');
            return;
        }
        for (let i = 0, length = microservices.length; i < length; i++) {
            Microservice.checkLiveMicro(microservices[i]);
        }
        logger.info('Finished checking');
    }

}

module.exports = Microservice;
