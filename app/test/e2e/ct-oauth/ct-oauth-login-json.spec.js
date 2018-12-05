/* eslint-disable no-unused-expressions */
const nock = require('nock');
const chai = require('chai');

const mongoose = require('mongoose');
const config = require('config');
const userModelFunc = require('ct-oauth-plugin/lib/models/user.model');

const { getTestServer } = require('./../test-server');
const { TOKENS } = require('./../test.constants');

const should = chai.should();

let requester;

const mongoUri = process.env.CT_MONGO_URI || `mongodb://${config.get('mongodb.host')}:${config.get('mongodb.port')}/${config.get('mongodb.database')}`;
const connection = mongoose.createConnection(mongoUri);

let UserModel;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Auth endpoints tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        UserModel = userModelFunc(connection);

        UserModel.deleteMany({}).exec();

        nock.cleanAll();
    });

    // Default HTML request behavior
    it('Visiting /auth while not logged in should redirect to the login page', async () => {
        const response = await requester
            .get(`/auth`)
            .set('Content-Type', 'application/json')
            .send();

        response.status.should.equal(200);
        response.header['content-type'].should.equal('text/html; charset=utf-8');
        response.redirects.should.be.an('array').and.length(1);
        response.redirects[0].should.match(/\/auth\/login$/);
    });

    // Default HTML request behavior
    it('Visiting /auth while logged in should redirect to the success page', async () => {
        const response = await requester
            .get(`/auth`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`)
            .send();

        response.status.should.equal(200);
        response.redirects.should.be.an('array').and.length(2);
        response.redirects[0].should.match(/\/auth\/login$/);
        response.redirects[1].should.match(/\/auth\/success$/);
    });

    // Default HTML request behavior
    it('Visiting /auth with callbackUrl while being logged in should redirect to the callback page', async () => {
        const response = await requester
            .get(`/auth?callbackUrl=https://www.wikipedia.org`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`)
            .send();

        response.status.should.equal(200);
        response.redirects.should.be.an('array').and.length(2);
        response.redirects[0].should.match(/\/auth\/login$/);
        response.redirects[1].should.match(/\/auth\/success$/);
    });

    it('Visiting /auth/login while not being logged in should show you the login page', async () => {
        const response = await requester
            .get(`/auth/login`)
            .set('Content-Type', 'application/json')
            .send();

        response.status.should.equal(401);
        response.header['content-type'].should.equal('application/json; charset=utf-8');
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].status.should.equal(401);
        response.body.errors[0].detail.should.equal('Not logged in');
    });

    it('Logging in at /auth/login with no credentials should display the error messages', async () => {
        const response = await requester
            .post(`/auth/login`)
            .set('Content-Type', 'application/json')
            .send();

        response.status.should.equal(401);
        response.header['content-type'].should.equal('application/json; charset=utf-8');
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].status.should.equal(401);
        response.body.errors[0].detail.should.equal('Invalid email or password');
    });

    it('Logging in at /auth/login with email and no password should display the error messages', async () => {
        const response = await requester
            .post(`/auth/login`)
            .set('Content-Type', 'application/json')
            .send({
                email: 'test@example.com',
            });

        response.status.should.equal(401);
        response.header['content-type'].should.equal('application/json; charset=utf-8');
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].status.should.equal(401);
        response.body.errors[0].detail.should.equal('Invalid email or password');
    });

    it('Logging in at /auth/login with invalid credentials (account does not exist) should display the error messages', async () => {
        const response = await requester
            .post(`/auth/login`)
            .set('Content-Type', 'application/json')
            .send({
                email: 'test@example.com',
                password: 'potato'
            });

        response.status.should.equal(401);
        response.header['content-type'].should.equal('application/json; charset=utf-8');
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].status.should.equal(401);
        response.body.errors[0].detail.should.equal('Invalid email or password');
    });

    it('Logging in at /auth/login valid credentials should redirect to the success page', async () => {
        await new UserModel({
            __v: 0,
            email: 'test@example.com',
            password: '$2b$10$1wDgP5YCStyvZndwDu2GwuC6Ie9wj7yRZ3BNaaI.p9JqV8CnetdPK',
            salt: '$2b$10$1wDgP5YCStyvZndwDu2Gwu',
            extraUserData: {
                apps: ['rw']
            },
            _id: '5becfa2b67da0d3ec07a27f6',
            createdAt: '2018-11-15T04:46:35.313Z',
            role: 'USER',
            provider: 'local'
        }).save();

        const response = await requester
            .post(`/auth/login`)
            .set('Content-Type', 'application/json')
            .send({
                email: 'test@example.com',
                password: 'potato'
            });

        response.status.should.equal(200);
        response.redirects.should.be.an('array').and.length(0);

        const responseUser = response.body.data;
        responseUser.should.have.property('email').and.equal('test@example.com');
        responseUser.should.have.property('role').and.equal('USER');
        responseUser.should.have.property('extraUserData').and.be.an('object');
        responseUser.should.have.property('token').and.be.an('string').and.not.be.empty;
        // eslint-disable-next-line
        responseUser.extraUserData.should.have.property('apps').and.be.an('array').and.contain    });

    it('Visiting GET /auth/login with callbackUrl while being logged in should return a 200', async () => {
        const response = await requester
            .get(`/auth/login?callbackUrl=https://www.wikipedia.org`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`)
            .send();

        response.status.should.equal(200);
        response.redirects.should.be.an('array').and.length(0);
    });

    it('Logging in successfully with POST /auth/login with callbackUrl should not redirect to the callback page', async () => {
        const response = await requester
            .post(`/auth/login?callbackUrl=https://www.wikipedia.org`)
            .set('Content-Type', 'application/json')
            .send({
                email: 'test@example.com',
                password: 'potato'
            });

        response.status.should.equal(200);
        response.redirects.should.be.an('array').and.length(0);

        const responseUser = response.body.data;
        responseUser.should.have.property('email').and.equal('test@example.com');
        responseUser.should.have.property('role').and.equal('USER');
        responseUser.should.have.property('extraUserData').and.be.an('object');
        responseUser.should.have.property('token').and.be.an('string').and.not.be.empty;
        // eslint-disable-next-line
        responseUser.extraUserData.should.have.property('apps').and.be.an('array').and.contain('rw');
    });

    it('Log in failure with /auth/login in should redirect to the failure page', async () => {
        const response = await requester
            .post(`/auth/login?callbackUrl=https://www.wikipedia.org`)
            .set('Content-Type', 'application/json')
            .send({
                email: 'test@example.com',
                password: 'tomato'
            });

        response.status.should.equal(401);
        response.header['content-type'].should.equal('application/json; charset=utf-8');
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].status.should.equal(401);
        response.body.errors[0].detail.should.equal('Invalid email or password');
    });

    after(async () => {
        const UserModel = userModelFunc(connection);

        UserModel.deleteMany({}).exec();
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
