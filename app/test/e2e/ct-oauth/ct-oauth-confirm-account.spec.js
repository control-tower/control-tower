const nock = require('nock');
const chai = require('chai');

const mongoose = require('mongoose');
const config = require('config');
const userModelFunc = require('ct-oauth-plugin/lib/models/user.model');
const userTempModelFunc = require('ct-oauth-plugin/lib/models/user-temp.model');

const { getTestAgent, closeTestAgent } = require('./../test-server');
const { getUUID, setPluginSetting } = require('./../utils');

const should = chai.should();

let requester;

const mongoUri = process.env.CT_MONGO_URI || `mongodb://${config.get('mongodb.host')}:${config.get('mongodb.port')}/${config.get('mongodb.database')}`;
const connection = mongoose.createConnection(mongoUri);

let UserModel;
let UserTempModel;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('OAuth endpoints tests - Confirm account', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        await getTestAgent(true);

        await setPluginSetting('oauth', 'local.confirmUrlRedirect', null);
        await setPluginSetting('oauth', 'local.gfw.confirmUrlRedirect', null);
        await setPluginSetting('oauth', 'local.rw.confirmUrlRedirect', null);
        await setPluginSetting('oauth', 'local.prep.confirmUrlRedirect', null);

        requester = await getTestAgent(true);

        UserModel = userModelFunc(connection);
        UserTempModel = userTempModelFunc(connection);

        UserModel.deleteMany({}).exec();
        UserTempModel.deleteMany({}).exec();

        nock.cleanAll();
    });

    it('Confirm account request with invalid token should return an error', async () => {
        const response = await requester
            .get(`/auth/confirm/fakeToken`)
            .set('Content-Type', 'application/json')
            .send();


        response.status.should.equal(400);
        response.header['content-type'].should.equal('application/json; charset=utf-8');
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`User expired or token not found`);
    });

    it('Confirm account request with valid token should return HTTP 200 and the user data', async () => {
        const confirmationToken = getUUID();
        await new UserTempModel({
            email: 'test@example.com',
            confirmationToken,
            extraUserData: {
                apps: ['rw']
            }
        }).save();

        const response = await requester
            .get(`/auth/confirm/${confirmationToken}`)
            .set('Content-Type', 'application/json')
            .send();


        response.status.should.equal(200);
        response.header['content-type'].should.equal('application/json; charset=utf-8');

        const responseUser = response.body;
        responseUser.should.have.property('email').and.equal('test@example.com');
        responseUser.should.have.property('role').and.equal('USER');
        responseUser.should.have.property('extraUserData').and.be.an('object');
        // eslint-disable-next-line
        responseUser.extraUserData.should.have.property('apps').and.be.an('array').and.contain('rw');
    });

    it('Confirm account request with conmfigured redirect should return HTTP 200 and redirect to URL', async () => {
        const confirmationToken = getUUID();
        await new UserTempModel({
            email: 'test@example.com',
            confirmationToken,
            extraUserData: {
                apps: ['rw']
            }
        }).save();

        const response = await requester
            .get(`/auth/confirm/${confirmationToken}`)
            .send();


        response.status.should.equal(200);
        response.header['content-type'].should.equal('application/json; charset=utf-8');

        const responseUser = response.body;
        responseUser.should.have.property('email').and.equal('test@example.com');
        responseUser.should.have.property('role').and.equal('USER');
        responseUser.should.have.property('extraUserData').and.be.an('object');
        // eslint-disable-next-line
        responseUser.extraUserData.should.have.property('apps').and.be.an('array').and.contain('rw');

        const missingTempUser = await UserTempModel.findOne({ email: 'test@example.com' }).exec();
        should.not.exist(missingTempUser);

        const confirmedUser = await UserModel.findOne({ email: 'test@example.com' }).exec();
        should.exist(confirmedUser);
        confirmedUser.should.have.property('email').and.equal('test@example.com');
        confirmedUser.should.have.property('role').and.equal('USER');
        confirmedUser.should.have.property('extraUserData').and.be.an('object');
        confirmedUser.extraUserData.apps.should.be.an('array').and.contain('rw');
    });

    it('Confirm account request with valid token and a configured global redirect should return HTTP 200 and the redirect URL', async () => {
        await setPluginSetting('oauth', 'local.confirmUrlRedirect', 'http://www.google.com/');

        requester = await getTestAgent(true);

        const confirmationToken = getUUID();
        await new UserTempModel({
            email: 'test@example.com',
            confirmationToken,
            extraUserData: {
                apps: ['rw']
            }
        }).save();

        const response = await requester
            .get(`/auth/confirm/${confirmationToken}`)
            .send();


        response.status.should.equal(200);

        response.redirects.should.be.an('array').and.length(1);
        response.redirects[0].should.equal('http://www.google.com/');

        const missingTempUser = await UserTempModel.findOne({ email: 'test@example.com' }).exec();
        should.not.exist(missingTempUser);

        const confirmedUser = await UserModel.findOne({ email: 'test@example.com' }).exec();
        should.exist(confirmedUser);
        confirmedUser.should.have.property('email').and.equal('test@example.com');
        confirmedUser.should.have.property('role').and.equal('USER');
        confirmedUser.should.have.property('extraUserData').and.be.an('object');
        confirmedUser.extraUserData.apps.should.be.an('array').and.contain('rw');
    });

    it('Confirm account request with valid token and a configured redirect per app should return HTTP 200 and the matching redirect URL', async () => {
        await setPluginSetting('oauth', 'local.gfw.confirmUrlRedirect', 'https://www.globalforestwatch.org/');
        await setPluginSetting('oauth', 'local.rw.confirmUrlRedirect', 'https://resourcewatch.org/myrw/areas');
        await setPluginSetting('oauth', 'local.prep.confirmUrlRedirect', 'https://www.prepdata.org/');
        await setPluginSetting('oauth', 'local.confirmUrlRedirect', 'http://www.google.com/');

        requester = await getTestAgent(true);

        const confirmationToken = getUUID();
        await new UserTempModel({
            email: 'test@example.com',
            confirmationToken,
            extraUserData: {
                apps: ['rw']
            }
        }).save();

        const response = await requester
            .get(`/auth/confirm/${confirmationToken}`)
            .send();


        response.status.should.equal(200);

        response.redirects.should.be.an('array');
        response.redirects[0].should.equal('https://resourcewatch.org/myrw/areas');

        const missingTempUser = await UserTempModel.findOne({ email: 'test@example.com' }).exec();
        should.not.exist(missingTempUser);

        const confirmedUser = await UserModel.findOne({ email: 'test@example.com' }).exec();
        should.exist(confirmedUser);
        confirmedUser.should.have.property('email').and.equal('test@example.com');
        confirmedUser.should.have.property('role').and.equal('USER');
        confirmedUser.should.have.property('extraUserData').and.be.an('object');
        confirmedUser.extraUserData.apps.should.be.an('array').and.contain('rw');
    });

    it('Confirm account request with valid token and a configured redirect per app should return HTTP 200 and the use the fallback redirect URL', async () => {
        await setPluginSetting('oauth', 'local.gfw.confirmUrlRedirect', 'https://www.globalforestwatch.org/');
        await setPluginSetting('oauth', 'local.rw.confirmUrlRedirect', 'https://resourcewatch.org/myrw/areas');
        await setPluginSetting('oauth', 'local.prep.confirmUrlRedirect', 'https://www.prepdata.org/');
        await setPluginSetting('oauth', 'local.confirmUrlRedirect', 'http://www.google.com/');

        requester = await getTestAgent(true);

        const confirmationToken = getUUID();
        await new UserTempModel({
            email: 'test@example.com',
            confirmationToken,
            extraUserData: {
                apps: ['fakeApp']
            }
        }).save();

        const response = await requester
            .get(`/auth/confirm/${confirmationToken}`)
            .send();


        response.status.should.equal(200);

        response.redirects.should.be.an('array');
        response.redirects[0].should.equal('http://www.google.com/');

        const missingTempUser = await UserTempModel.findOne({ email: 'test@example.com' }).exec();
        should.not.exist(missingTempUser);

        const confirmedUser = await UserModel.findOne({ email: 'test@example.com' }).exec();
        should.exist(confirmedUser);
        confirmedUser.should.have.property('email').and.equal('test@example.com');
        confirmedUser.should.have.property('role').and.equal('USER');
        confirmedUser.should.have.property('extraUserData').and.be.an('object');
        confirmedUser.extraUserData.apps.should.be.an('array').and.contain('rw');
    });

    it('Confirm account request with valid token and a redirect query param should return HTTP 200 and the use the query param redirect', async () => {
        await setPluginSetting('oauth', 'local.gfw.confirmUrlRedirect', 'https://www.globalforestwatch.org/');
        await setPluginSetting('oauth', 'local.rw.confirmUrlRedirect', 'https://resourcewatch.org/myrw/areas');
        await setPluginSetting('oauth', 'local.prep.confirmUrlRedirect', 'https://www.prepdata.org/');
        await setPluginSetting('oauth', 'local.confirmUrlRedirect', 'http://www.google.com/');

        requester = await getTestAgent(true);

        const confirmationToken = getUUID();
        await new UserTempModel({
            email: 'test@example.com',
            confirmationToken,
            extraUserData: {
                apps: ['fakeApp']
            }
        }).save();

        const response = await requester
            .get(`/auth/confirm/${confirmationToken}?callbackUrl=http://vizzuality.com/`)
            .send();


        response.status.should.equal(200);

        response.redirects.should.be.an('array');
        response.redirects[0].should.equal('http://vizzuality.com/');

        const missingTempUser = await UserTempModel.findOne({ email: 'test@example.com' }).exec();
        should.not.exist(missingTempUser);

        const confirmedUser = await UserModel.findOne({ email: 'test@example.com' }).exec();
        should.exist(confirmedUser);
        confirmedUser.should.have.property('email').and.equal('test@example.com');
        confirmedUser.should.have.property('role').and.equal('USER');
        confirmedUser.should.have.property('extraUserData').and.be.an('object');
        confirmedUser.extraUserData.apps.should.be.an('array').and.contain('rw');
    });

    after(async () => {
        const UserModel = userModelFunc(connection);
        const UserTempModel = userTempModelFunc(connection);

        UserModel.deleteMany({}).exec();
        UserTempModel.deleteMany({}).exec();

        closeTestAgent();
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
