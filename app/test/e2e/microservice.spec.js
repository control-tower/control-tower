const logger = require('logger');
const nock = require('nock');
const chai = require('chai');

const Microservice = require('models/microservice.model');
const Endpoint = require('models/endpoint.model');

const { getTestServer } = require('./test-server');
const { TOKENS } = require('./test.constants');

const should = chai.should();

let requester;


describe('E2E tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        Microservice.deleteMany({}).exec();
        Endpoint.deleteMany({}).exec();

        nock.cleanAll();
    });

    it('Getting a list of microservices without being authenticated should fail', async () => {
        try {
            await requester.get(`/api/v1/microservice`).send();
        } catch (e) {
            logger.error(e);
            e.response.status.should.equal(401);
        }
    });

    it('Getting a list of microservices should return empty if no services are registered', async () => {
        const response = await requester
            .get(`/api/v1/microservice`)
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`)
            .send();

        response.status.should.equal(200);
        response.body.should.be.an.instanceOf(Array).and.have.lengthOf(0);
    });

    /* Register a microservice */
    it('Registering a microservice should be successful', async () => {
        const testMicroserviceOne = {
            name: `test-microservice-one`,
            url: 'http://test-microservice-one:8000',
            active: true
        };

        nock('http://test-microservice-one:8000')
            .get((uri) => {
                logger.info('Uri', uri);
                return uri.startsWith('/info');
            })
            .reply(200, {
                swagger: {},
                name: 'test-microservice-one',
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

        const response = await requester.post(`/api/v1/microservice`).send(testMicroserviceOne);

        response.status.should.equal(200);
        response.body.status.should.equal('active');

        (await Microservice.find()).should.have.lengthOf(1);

    });

    it('Authorized status check and registered microservice (happy case)', async () => {
        const response = await requester.get(`/api/v1/microservice`)
            .send()
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);

        response.status.should.equal(200);
    });

    it('Deleting a microservice should delete endpoints but keep microservice document in the database (happy case)', async () => {
        (await Microservice.find()).should.have.lengthOf(1);
        (await Endpoint.find({ toDelete: true })).should.have.lengthOf(0);

        const existingMicroservice = await requester.get(`/api/v1/microservice`)
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`)
            .send();

        const response = await requester.delete(`/api/v1/microservice/${existingMicroservice.body[0]._id}`)
            .send()
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);

        response.status.should.equal(200);

        (await Microservice.find()).should.have.lengthOf(1);
        (await Endpoint.find({ toDelete: true })).should.have.lengthOf(1);

    });

    it('Getting endpoints for registered microservices should return a list of available endpoints (happy case)', async () => {
        const response = await requester.get(`/api/v1/endpoint`)
            .send()
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);

        response.status.should.equal(200);
        response.body.should.be.an('array').and.have.lengthOf(1);
    });

    it('Get documentation for existing endpoints should be successful (happy case)', async () => {
        const response = await requester.get(`/api/v1/doc/swagger`)
            .send()
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);

        response.status.should.equal(200);
    });

    /* Testing redirects and filters */
    it('Redirects and filters', async () => {
        const testDatasetMicroservice = {
            name: `dataset`,
            url: 'http://test-dataset-microservice:3000',
            active: true
        };
        const adapterOne = {
            name: `adapter-one`,
            url: 'http://adapter-one:8001',
            active: true
        };
        const adapterTwo = {
            name: `adapter-two`,
            url: 'http://adapter-two:8002',
            active: true
        };

        /* Dataset microservice */
        nock('http://test-dataset-microservice:3000')
            .get((uri) => {
                logger.info('Uri', uri);
                return uri.startsWith('/info');
            })
            .once()
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
            });

        nock('http://test-dataset-microservice:3000')
            .get('/api/v1/dataset/1111')
            .query(true)
            .twice()
            .reply(200, {
                status: 200,
                detail: 'OK',
                data: {
                    attributes: {
                        provider: 'cartodb'
                    }
                }
            });

        nock('http://test-dataset-microservice:3000')
            .get('/api/v1/dataset/2222')
            .query(true)
            .twice()
            .reply(200, {
                status: 200,
                detail: 'OK',
                data: {
                    attributes: {
                        provider: 'featureservice'
                    }
                }
            });

        /* Adapter 1 microservice */
        nock('http://adapter-one:8001')
            .get((uri) => {
                logger.info('Uri', uri);
                return uri.startsWith('/info');
            })
            .once()
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
            });

        nock('http://adapter-one:8001')
            .get('/api/v1/carto/query/1111')
            .query(true)
            .once()
            .reply(200, {
                status: 200,
                query: 1000
            });


        /* Adapter 2 microservice */
        nock('http://adapter-two:8002')
            .get((uri) => {
                logger.info('Uri', uri);
                return uri.startsWith('/info');
            })
            .once()
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
            });

        nock('http://adapter-two:8002')
            .get('/api/v1/arcgis/query/2222')
            .query(true)
            .once()
            .reply(200, {
                status: 200,
                query: 2000
            });

        const responseOne = await requester.post(`/api/v1/microservice`).send(testDatasetMicroservice);
        const responseTwo = await requester.post(`/api/v1/microservice`).send(adapterOne);
        const responseThree = await requester.post(`/api/v1/microservice`).send(adapterTwo);

        responseOne.status.should.equal(200);
        responseOne.body.status.should.equal('active');

        responseTwo.status.should.equal(200);
        responseTwo.body.status.should.equal('active');

        responseThree.status.should.equal(200);
        responseThree.body.status.should.equal('active');

        const queryOne = await requester.get(`/v1/query/1111`);
        const queryTwo = await requester.get(`/v1/query/2222`);

        queryOne.status.should.equal(200);
        queryOne.body.query.should.equal(1000);
        queryTwo.status.should.equal(200);
        queryTwo.body.query.should.equal(2000);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(() => {
        Microservice.deleteMany({}).exec();
        Endpoint.deleteMany({}).exec();
    });
});
