const logger = require('logger');
const nock = require('nock');
const request = require('superagent').agent();
const { BASE_URL, TOKENS, CT_URL } = require('./test.constants');
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
    const dataset = {
        name: `dataset`,
        url: 'http://mymachine:3000',
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
            done();
        });

    });

    beforeEach(async function () {
        // Delete BeforeEach
        await deleteCurrentMicroservices();
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

        nock('http://mymachine:3000')
            .get((uri) => {
                logger.info('Uri', uri);
                return uri.startsWith('/info');
            })
            .reply(200, {
                swagger: {},
                name: 'dataset',
                tags: ['test'],
                endpoints: [{
                    path: '/v1/dataset/:dataset',
                    method: 'GET',
                    binary: true,
                    redirect: {
                        method: 'GET',
                        path: '/api/v1/dataset/:dataset'
                    }
                }]
            })
            .get('/api/v1/dataset/1111')
            .query(true)
            .reply(200, {
                status: 200,
                detail: 'OK',
                data: {
                    attributes: {
                        provider: 'cartodb'
                    }
                }
            })
            .get('/api/v1/dataset/2222')
            .query(true)
            .reply(200, {
                status: 200,
                detail: 'OK',
                data: {
                    attributes: {
                        provider: 'featureservice'
                    }
                }
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
                    path: '/v1/query/:dataset',
                    method: 'GET',
                    binary: true,
                    redirect: {
                        method: 'GET',
                        path: '/api/v1/carto/query/:dataset'
                    },
                    filters: [{
                        name: 'dataset',
                        path: '/v1/dataset/:dataset',
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
            })
            .get('/api/v1/carto/query/1111')
            .query(true)
            .reply(200, {
                status: 200,
                query: 1000
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
                    path: '/v1/query/:dataset',
                    method: 'GET',
                    binary: true,
                    redirect: {
                        method: 'GET',
                        path: '/api/v1/arcgis/query/:dataset'
                    },
                    filters: [{
                        name: 'dataset',
                        path: '/v1/dataset/:dataset',
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
            })
            .get('/api/v1/arcgis/query/2222')
            .query(true)
            .reply(200, {
                status: 200,
                query: 2000
            });
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
    it('Register a microservice', async() => {
        let response;
        try {
            response = await request.post(`${BASE_URL}/microservice`).send(microservice);
        } catch (e) {
            logger.error(e);
        }
        response.status.should.equal(200);
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
    });

    /* Check the status */
    it('Delete microservice', async() => {
        const createdMicroservice = await request.post(`${BASE_URL}/microservice`).send(microservice);
        let response;
        try {
            response = await request.delete(`${BASE_URL}/microservice/${createdMicroservice.body._id}`)
            .send()
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);
        } catch (e) {
            logger.error(e);
        }
        response.status.should.equal(200);
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
    it('Redirects and filters', async() => {
        /* Register the microservice again */
        await request.post(`${BASE_URL}/microservice`).send(dataset);
        await request.post(`${BASE_URL}/microservice`).send(adapterOne);
        await request.post(`${BASE_URL}/microservice`).send(adapterTwo);
        let queryOne;
        let queryTwo;
        try {
            queryOne = await request.get(`${CT_URL}/v1/query/1111`);
            queryTwo = await request.get(`${CT_URL}/v1/query/2222`);
        } catch (e) {
            logger.error(e);
        }
        queryOne.status.should.equal(200);
        queryOne.body.query.should.equal(1000);
        queryTwo.status.should.equal(200);
        queryTwo.body.query.should.equal(2000);
    });

    after(() => {
        server.close();
    });
});
