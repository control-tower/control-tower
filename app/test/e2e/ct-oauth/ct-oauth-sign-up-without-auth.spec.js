const nock = require('nock');
const chai = require('chai');

const mongoose = require('mongoose');
const config = require('config');
const userModelFunc = require('ct-oauth-plugin/lib/models/user.model');
const userTempModelFunc = require('ct-oauth-plugin/lib/models/user-temp.model');

const { setPluginSetting } = require('./../utils');
const { getTestServer } = require('./../test-server');

const should = chai.should();

let requester;

const mongoUri = process.env.CT_MONGO_URI || `mongodb://${config.get('mongodb.host')}:${config.get('mongodb.port')}/${config.get('mongodb.database')}`;
const connection = mongoose.createConnection(mongoUri);

let UserModel;
let UserTempModel;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('OAuth endpoints tests - Sign up without auth', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        // We need to force-start the server, to ensure mongo has plugin info we can manipulate in the next instruction
        await getTestServer(true);

        await setPluginSetting('oauth', 'allowPublicRegistration', true);

        requester = await getTestServer(true);

        UserModel = userModelFunc(connection);
        UserTempModel = userTempModelFunc(connection);

        UserModel.deleteMany({}).exec();
        UserTempModel.deleteMany({}).exec();

        nock.cleanAll();
    });

    it('Registering a user without being logged in returns a 200 error (TODO: this should return a 422)', async () => {
        const response = await requester
            .post(`/auth/sign-up`)
            .type('form')
            .send();

        response.status.should.equal(200);
        response.text.should.include('Email, Password and Repeat password are required');
    });

    it('Registering a user without the actual data returns a 200 error (TODO: this should return a 422)', async () => {
        const response = await requester
            .post(`/auth/sign-up`)
            .type('form')
            .send();

        response.status.should.equal(200);
        response.text.should.include('Email, Password and Repeat password are required');
    });

    it('Registering a user with partial data returns a 200 error (TODO: this should return a 422)', async () => {
        const response = await requester
            .post(`/auth/sign-up`)
            .type('form')
            .send({
                email: 'someemail@gmail.com'
            });

        response.status.should.equal(200);
        response.text.should.include('Email, Password and Repeat password are required');
    });

    it('Registering a user with different passwords returns a 200 error (TODO: this should return a 422)', async () => {
        const response = await requester
            .post(`/auth/sign-up`)
            .type('form')
            .send({
                email: 'someemail@gmail.com',
                password: 'somepassword',
                repeatPassword: 'anotherpassword'
            });

        response.status.should.equal(200);
        response.text.should.include('Password and Repeat password not equal');
    });

    it('Registering a user with different passwords returns a 200 error (TODO: this should return a 422)', async () => {
        const response = await requester
            .post(`/auth/sign-up`)
            .type('form')
            .send({
                email: 'someemail@gmail.com',
                password: 'somepassword',
                repeatPassword: 'anotherpassword'
            });

        response.status.should.equal(200);
        response.text.should.include('Password and Repeat password not equal');

        const tempUser = await UserTempModel.findOne({ email: 'someemail@gmail.com' }).exec();
        should.not.exist(tempUser);
    });
    // User registration - no app
    it('Registering a user with correct data and no app returns a 200', async () => {
        nock('https://api.sparkpost.com')
            .post('/api/v1/transmissions', (body) => {
                const expectedRequestBody = {
                    content: {
                        template_id: 'confirm-user'
                    },
                    recipients: [
                        {
                            address: {
                                email: 'someemail@gmail.com'
                            }
                        }
                    ]
                };

                return (
                    body.substitution_data.urlConfirm.match(/http.\/\/tower\.dev:5037\/auth\/confirm\/[\w*]/) &&
                    body.content.template_id === expectedRequestBody.content.template_id &&
                    body.recipients[0].address.email === expectedRequestBody.recipients[0].address.email
                );
            })
            .reply(200);


        const missingUser = await UserTempModel.findOne({ email: 'someemail@gmail.com' }).exec();
        should.not.exist(missingUser);

        const response = await requester
            .post(`/auth/sign-up`)
            .type('form')
            .send({
                email: 'someemail@gmail.com',
                password: 'somepassword',
                repeatPassword: 'somepassword'
            });

        response.status.should.equal(200);
        response.text.should.include('Register correct');
        response.text.should.include('Check your email and confirm your account');

        const user = await UserTempModel.findOne({ email: 'someemail@gmail.com' }).exec();
        should.exist(user);
        user.should.have.property('email').and.equal('someemail@gmail.com');
        user.should.have.property('role').and.equal('USER');
        // eslint-disable-next-line
        user.should.have.property('confirmationToken').and.not.be.empty;
        user.should.have.property('extraUserData').and.be.an('object');
        // eslint-disable-next-line
        user.extraUserData.should.have.property('apps').and.be.an('array').and.be.empty;
    });

    it('Registering a user with an existing email address (temp user) returns a 200 error (TODO: this should return a 422)', async () => {
        const tempUser = await UserTempModel.findOne({ email: 'someemail@gmail.com' }).exec();
        should.exist(tempUser);

        const response = await requester
            .post(`/auth/sign-up`)
            .type('form')
            .send({
                email: 'someemail@gmail.com',
                password: 'somepassword',
                repeatPassword: 'somepassword'
            });

        response.status.should.equal(200);
        response.text.should.include('Email exist');
    });

    it('Confirming a user\'s account using the email token should be successful', async () => {
        const tempUser = await UserTempModel.findOne({ email: 'someemail@gmail.com' }).exec();

        const response = await requester
            .get(`/auth/confirm/${tempUser.confirmationToken}`)
            .send();

        response.status.should.equal(200);

        const missingTempUser = await UserTempModel.findOne({ email: 'someemail@gmail.com' }).exec();
        should.not.exist(missingTempUser);

        const confirmedUser = await UserModel.findOne({ email: 'someemail@gmail.com' }).exec();
        should.exist(confirmedUser);
        confirmedUser.should.have.property('email').and.equal('someemail@gmail.com');
        confirmedUser.should.have.property('role').and.equal('USER');
        confirmedUser.should.have.property('extraUserData').and.be.an('object');
        // eslint-disable-next-line
        confirmedUser.extraUserData.should.have.property('apps').and.be.an('array').and.be.empty;
    });

    it('Registering a user with an existing email address (confirmed user) returns a 200 error (TODO: this should return a 422)', async () => {
        const user = await UserModel.findOne({ email: 'someemail@gmail.com' }).exec();
        should.exist(user);

        const response = await requester
            .post(`/auth/sign-up`)
            .type('form')
            .send({
                email: 'someemail@gmail.com',
                password: 'somepassword',
                repeatPassword: 'somepassword'
            });

        response.status.should.equal(200);
        response.text.should.include('Email exist');
    });


    // User registration - with app
    it('Registering a user with correct data and app returns a 200', async () => {
        nock('https://api.sparkpost.com')
            .post('/api/v1/transmissions', (body) => {
                const expectedRequestBody = {
                    content: {
                        template_id: 'confirm-user'
                    },
                    recipients: [
                        {
                            address: {
                                email: 'someotheremail@gmail.com'
                            }
                        }
                    ]
                };

                return (
                    body.substitution_data.urlConfirm.match(/http.\/\/tower\.dev:5037\/auth\/confirm\/[\w*]/) &&
                    body.content.template_id === expectedRequestBody.content.template_id &&
                    body.recipients[0].address.email === expectedRequestBody.recipients[0].address.email
                );
            })
            .reply(200);

        const missingUser = await UserTempModel.findOne({ email: 'someotheremail@gmail.com' }).exec();
        should.not.exist(missingUser);

        const response = await requester
            .post(`/auth/sign-up`)
            .type('form')
            .send({
                email: 'someotheremail@gmail.com',
                password: 'somepassword',
                repeatPassword: 'somepassword',
                apps: ['rw']
            });

        response.status.should.equal(200);
        response.text.should.include('Register correct');
        response.text.should.include('Check your email and confirm your account');

        const user = await UserTempModel.findOne({ email: 'someotheremail@gmail.com' }).exec();
        should.exist(user);
        user.should.have.property('email').and.equal('someotheremail@gmail.com');
        user.should.have.property('role').and.equal('USER');
        // eslint-disable-next-line
        user.should.have.property('confirmationToken').and.not.be.empty;
        user.should.have.property('extraUserData').and.be.an('object');
        user.extraUserData.apps.should.be.an('array').and.contain('rw');
    });

    it('Confirming a user\'s account using the email token should be successful', async () => {
        const tempUser = await UserTempModel.findOne({ email: 'someotheremail@gmail.com' }).exec();

        const response = await requester
            .get(`/auth/confirm/${tempUser.confirmationToken}`)
            .send();

        response.status.should.equal(200);

        const missingTempUser = await UserTempModel.findOne({ email: 'someotheremail@gmail.com' }).exec();
        should.not.exist(missingTempUser);

        const confirmedUser = await UserModel.findOne({ email: 'someotheremail@gmail.com' }).exec();
        should.exist(confirmedUser);
        confirmedUser.should.have.property('email').and.equal('someotheremail@gmail.com');
        confirmedUser.should.have.property('role').and.equal('USER');
        confirmedUser.should.have.property('extraUserData').and.be.an('object');
        confirmedUser.extraUserData.apps.should.be.an('array').and.contain('rw');
    });

    after(async () => {
        const UserModel = userModelFunc(connection);
        const UserTempModel = userTempModelFunc(connection);

        UserModel.deleteMany({}).exec();
        UserTempModel.deleteMany({}).exec();
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
