const nock = require('nock');
const chai = require('chai');

const { getTestServer } = require('./../test-server');
const { TOKENS } = require('./../test.constants');

const should = chai.should();

let requester;


describe('Auth endpoints tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        nock.cleanAll();
    });

    it('Visiting /auth should redirect to the login page', async () => {
        const response = await requester
            .get(`/auth`)
            .send();

        response.status.should.equal(200);
        response.redirects[0].should.contain('/auth/login');
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
