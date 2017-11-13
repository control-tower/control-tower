const logger = require('logger');
const nock = require('nock');
const request = require('superagent').agent();
const { BASE_URL, TOKENS } = require('./test.constants');
require('should');

async function deleteCurrentMicroservices() {
    return new Promise((resolve, reject) => {
        async function deleteMs() {
            const currentMicroservices = await request
                .get(`${BASE_URL}/microservice`)
                .send()
                .set('Authorization', `Bearer ${TOKENS.ADMIN}`);
            const msIds = currentMicroservices.body.map(el => el._id);
            try {
                await Promise.all(msIds.map(id => {
                    return request.delete(`${BASE_URL}/microservice/${id}`)
                            .send()
                            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);
                }));
                resolve();
            } catch (err) {
                reject(err);
            }
        }
        deleteMs();
    });
}

describe('E2E tests', () => {

    let server;
    const microservice = {
        name: `test-microservice`,
        url: 'http://mymachine:8000',
        active: true
    };
    const adapterOne = {
        name: `adapter-one`,
        url: 'http://mymachine:8001',
        active: true
    };
    const adapterTwo = {
        name: `adapter-two`,
        url: 'http://mymachine:8002',
        active: true
    };

    before(function (done) {
        this.timeout(10000);
        logger.info('Config mock requests');
        require('app')()
        .then((data) => {
            server = data.server;
            return deleteCurrentMicroservices();
        }).then(() => {
            done();
        })
        .catch(err => {
            logger.error(err);
        });

    });

    beforeEach(function () {
        nock('http://mymachine:8000')
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

        nock('http://mymachine:8001')
            .get((uri) => {
                logger.info('Uri', uri);
                return uri.startsWith('/info');
            })
            .reply(200, {
                swagger: {},
                name: 'adapter-one',
                tags: ['test'],
                endpoints: [{
                    path: '/v1/query',
                    method: 'GET',
                    binary: true,
                    redirect: {
                        method: 'GET',
                        path: '/api/v1/carto/query'
                    },
                    filters: [{
                        name: 'dataset',
                        path: '/v1/dataset/',
                        method: 'GET',
                        params: {
                            dataset: 'dataset'
                        },
                        compare: {
                            data: {
                                attributes: {
                                    provider: 'cartodb'
                                }
                            }
                        }
                    }]
                }]
            });

        nock('http://mymachine:8002')
            .get((uri) => {
                logger.info('Uri', uri);
                return uri.startsWith('/info');
            })
            .reply(200, {
                swagger: {},
                name: 'adapter-two',
                tags: ['test'],
                endpoints: [{
                    path: '/v1/query',
                    method: 'GET',
                    binary: true,
                    redirect: {
                        method: 'GET',
                        path: '/api/v1/arcgis/query'
                    },
                    filters: [{
                        name: 'dataset',
                        path: '/v1/dataset/',
                        method: 'GET',
                        params: {
                            dataset: 'dataset'
                        },
                        compare: {
                            data: {
                                attributes: {
                                    provider: 'featureservice'
                                }
                            }
                        }
                    }]
                }]
            });
            // @TODO mock /api/v1/arcgis/query /api/v1/carto/query y /v1/dataset
    });

    /* Not registered microservices */
    it('Not registered microservices', async() => {
        let response;
        try {
            response = await request.get(`${BASE_URL}/microservice`)
            .send()
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);
        } catch (e) {
            logger.error(e);
        }
        response.status.should.equal(200);
        response.body.should.be.an.instanceOf(Array).and.have.lengthOf(0);
    });

    /* Register a microservice */
    let microserviceId;
    it('Register a microservice', async() => {
        let response;
        try {
            response = await request.post(`${BASE_URL}/microservice`).send(microservice);
        } catch (e) {
            logger.error(e);
        }
        response.status.should.equal(200);
        microserviceId = response.body._id;
    });

    /* Check the status */
    it('Unauthorized status check', async() => {
        try {
            await request.get(`${BASE_URL}/microservice`).send();
        } catch (e) {
            logger.error(e);
            e.response.status.should.equal(401);
        }
    });

    /* Check the status */
    it('Authorized status check and registered microservice', async() => {
        let response;
        try {
            response = await request.get(`${BASE_URL}/microservice`)
            .send()
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);
        } catch (e) {
            logger.error(e);
        }
        response.status.should.equal(200);
        response.body.should.be.an.instanceOf(Array).and.have.lengthOf(1);
    });

    /* Check the status */
    it('Delete microservice', async() => {
        let response;
        try {
            response = await request.delete(`${BASE_URL}/microservice/${microserviceId}`)
            .send()
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);
        } catch (e) {
            logger.error(e);
        }
        response.status.should.equal(200);
    });

    /* Not registered microservices */
    it('Not registered microservices', async() => {
        let response;
        try {
            response = await request.get(`${BASE_URL}/microservice`)
            .send()
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);
        } catch (e) {
            logger.error(e);
        }
        response.status.should.equal(200);
        response.body.should.be.an.instanceOf(Array).and.have.lengthOf(0);
    });

    /* Get empty endpoints */
    it('Get endpoints', async() => {
        let response;
        try {
            response = await request.get(`${BASE_URL}/endpoint`)
            .send()
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);
        } catch (e) {
            logger.error(e);
        }
        response.status.should.equal(200);
        response.body.should.be.an.instanceOf(Array).and.have.lengthOf(0);
    });

    /* Register and get endpoints */
    it('Get endpoints', async() => {
        /* Register microservice again */
        await request.post(`${BASE_URL}/microservice`).send(microservice);
        let response;
        try {
            response = await request.get(`${BASE_URL}/endpoint`)
            .send()
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);
        } catch (e) {
            logger.error(e);
        }
        response.status.should.equal(200);
        response.body.should.be.an.instanceOf(Array).and.have.lengthOf(1);
    });

    /* Get docs */
    it('Get docs', async() => {
        let response;
        try {
            response = await request.get(`${BASE_URL}/doc/swagger`)
            .send()
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);
        } catch (e) {
            logger.error(e);
        }
        response.status.should.equal(200);
    });

    /* Testing redirects and filters */
    it('Get endpoints', async() => {
        /* Register microservice again */
        await request.post(`${BASE_URL}/microservice`).send(adapterOne);
        await request.post(`${BASE_URL}/microservice`).send(adapterTwo);
        let response;
        try {
            response = await request.get(`${BASE_URL}/endpoint`)
            .send()
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);
        } catch (e) {
            logger.error(e);
        }
        response.status.should.equal(200);
    });

    after(() => {
        server.close();
    });
});
