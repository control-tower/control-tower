const nock = require('nock');
const chai = require('chai');

const mongoose = require('mongoose');
const config = require('config');
const userModelFunc = require('ct-oauth-plugin/lib/models/user.model');
const userTempModelFunc = require('ct-oauth-plugin/lib/models/user-temp.model');

const { setPluginSetting } = require('./../utils');
const { getTestServer } = require('./../test-server');
const { TOKENS } = require('./../test.constants');

const should = chai.should();

let requester;

const mongoUri = process.env.CT_MONGO_URI || `mongodb://${config.get('mongodb.host')}:${config.get('mongodb.port')}/${config.get('mongodb.database')}`;
const connection = mongoose.createConnection(mongoUri);

let UserModel;
let UserTempModel;


describe('Auth endpoints tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        await setPluginSetting('oauth', 'allowPublicRegistration', true);

        requester = await getTestServer(true);

        UserModel = userModelFunc(connection);
        UserTempModel = userTempModelFunc(connection);

        UserModel.deleteMany({}).exec();
        UserTempModel.deleteMany({}).exec();

        nock.cleanAll();
    });

    it('Registering a user without being logged in returns an 401 error', async () => {
        const response = await requester
            .post(`/auth/sign-up`)
            .send();

        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Not authenticated`);
    });

    it('Registering a user without the actual data returns a 200 error (TODO: this should return a 422)', async () => {
        const response = await requester
            .post(`/auth/sign-up`)
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`)
            .send();

        response.status.should.equal(200);
        response.text.should.include('Email, Password and Repeat password are required');
    });

    it('Registering a user with partial data returns a 200 error (TODO: this should return a 422)', async () => {
        const response = await requester
            .post(`/auth/sign-up`)
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`)
            .send({
                email: 'someemail@gmail.com'
            });

        response.status.should.equal(200);
        response.text.should.include('Email, Password and Repeat password are required');
    });

    it('Registering a user with different passwords returns a 200 error (TODO: this should return a 422)', async () => {
        const response = await requester
            .post(`/auth/sign-up`)
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`)
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
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`)
            .send({
                email: 'someemail@gmail.com',
                password: 'somepassword',
                repeatPassword: 'anotherpassword'
            });

        response.status.should.equal(200);
        response.text.should.include('Password and Repeat password not equal');
    });

    it('Registering a user with correct data returns a 200', async () => {
        const missingUser = await UserTempModel.findOne({ email: 'someemail@gmail.com' }).exec();
        should.not.exist(missingUser);

        const response = await requester
            .post(`/auth/sign-up`)
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`)
            .send({
                email: 'someemail@gmail.com',
                password: 'somepassword',
                repeatPassword: 'somepassword'
            });

        response.status.should.equal(200);
        response.text.should.include('Error creating user.'); //This is an error with the mailer, not with the user creation

        const user = await UserTempModel.findOne({ email: 'someemail@gmail.com' }).exec();
        should.exist(user);
        user.should.have.property('email').and.equal('someemail@gmail.com');
        user.should.have.property('role').and.equal('USER');
        // eslint-disable-next-line
        user.should.have.property('confirmationToken').and.not.be.empty;
    });

    it('Registering a user with an existing email address returns a 200 error (TODO: this should return a 422)', async () => {
        const response = await requester
            .post(`/auth/sign-up`)
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`)
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
        response.body.should.have.property('email').and.equal('someemail@gmail.com');
        response.body.should.have.property('role').and.equal('USER');

        const missingTempUser = await UserTempModel.findOne({ email: 'someemail@gmail.com' }).exec();
        should.not.exist(missingTempUser);

        const confirmedUser = await UserModel.findOne({ email: 'someemail@gmail.com' }).exec();
        should.exist(confirmedUser);
        confirmedUser.should.have.property('email').and.equal('someemail@gmail.com');
        confirmedUser.should.have.property('role').and.equal('USER');
    });

    after(async () => {
        const UserModel = userModelFunc(connection);
        const UserTempModel = userTempModelFunc(connection);

        UserModel.deleteMany({}).exec();
        UserTempModel.deleteMany({}).exec();

        await requester.close();
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
