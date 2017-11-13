const logger = require('logger');
const nock = require('nock');
const request = require('superagent').agent();
const requestPromise = require('request-promise');
const {MICROSERVICE_URL, BASE_URL, ROLES} = require('./test.constants');
require('should');

let referencedDataset = null;

const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));

describe('E2E test', () => {

    before((done) => {
        logger.info('Config mock requests');
        require('app')().then(done, (err) => {
            logger.error(err);
        });
        // simulating gateway communications
        nock(MICROSERVICE_URL)
            .get((uri) => {
                logger.info('Uri', uri);
                return uri.startsWith('/info');
            })
            .reply(200, {
                swagger: {},
                name: 'test-microservice',
                tags: ['test'],
                endpoints: [{
                    path: '/v1/test',
                    method: 'GET',
                    redirect: {
                        method: 'GET',
                        path: '/api/v1/test'
                    }
                }]
            });

    });

    /* Create a Carto Dataset */
    it('Register a microservice', async() => {
        nock(MICROSERVICE_URL)
        .get((uri) => {
            logger.info('Uri', uri);
            return uri.startsWith('/info');
        })
        .reply(200, {
            swagger: {},
            name: 'test-microservice',
            tags: ['test'],
            endpoints: [{
                path: '/v1/test',
                method: 'GET',
                redirect: {
                    method: 'GET',
                    path: '/api/v1/test'
                }
            }]
        });
        let response;
        const microservice = {
            name: `test-microservice`,
            url: MICROSERVICE_URL,
            active: true
        };
        try {
            response = await request.post(`${BASE_URL}/microservice`).send(microservice);
            logger.info('Finished');

        } catch (e) {
            logger.error(e);
        }

        response.status.should.equal(200);
    });

   
    after(() => {});
});
