const nock = require('nock');
const chai = require('chai');

const mongoose = require('mongoose');
const config = require('config');
const userModelFunc = require('ct-oauth-plugin/lib/models/user.model');
const userTempModelFunc = require('ct-oauth-plugin/lib/models/user-temp.model');

const { getTestServer } = require('./../test-server');

const should = chai.should();

let requester;

const mongoUri = process.env.CT_MONGO_URI || `mongodb://${config.get('mongodb.host')}:${config.get('mongodb.port')}/${config.get('mongodb.database')}`;
const connection = mongoose.createConnection(mongoUri);

let UserModel;
let UserTempModel;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('OAuth endpoints tests - Recover password', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer(true);

        UserModel = userModelFunc(connection);
        UserTempModel = userTempModelFunc(connection);

        UserModel.deleteMany({}).exec();
        UserTempModel.deleteMany({}).exec();

        nock.cleanAll();
    });

    it('Recover password request with no email should return an error - HTML format (TODO: this should return a 422)', async () => {
        const response = await requester
            .post(`/auth/reset-password`)
            .send();


        response.status.should.equal(200);
        response.header['content-type'].should.equal('text/html; charset=utf-8');
        response.text.should.include(`Mail required`);
    });

    it('Recover password request with no email should return an error - JSON format', async () => {
        const response = await requester
            .post(`/auth/reset-password`)
            .set('Content-Type', 'application/json')
            .send();


        response.status.should.equal(422);
        response.header['content-type'].should.equal('application/json; charset=utf-8');
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Mail required`);
    });

    it('Recover password request with non-existing email should return an error - HTML format', async () => {
        const response = await requester
            .post(`/auth/reset-password`)
            .type('form')
            .send({
                email: 'pepito@gmail.com'
            });

        response.status.should.equal(200);
        response.header['content-type'].should.equal('text/html; charset=utf-8');
        response.text.should.include(`User not found`);
    });

    it('Recover password request with non-existing email should return a 422 error - JSON format', async () => {
        const response = await requester
            .post(`/auth/reset-password`)
            .set('Content-Type', 'application/json')
            .send({
                email: 'pepito@gmail.com'
            });

        response.status.should.equal(422);
        response.header['content-type'].should.equal('application/json; charset=utf-8');
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`User not found`);
    });

    it('Recover password request with correct email should return OK - HTML format', async () => {
        nock('https://api.sparkpost.com')
            .post('/api/v1/transmissions', (body) => {
                const expectedRequestBody = {
                    content: {
                        template_id: 'recover-password'
                    },
                    recipients: [
                        {
                            address: {
                                email: 'potato@gmail.com'
                            }
                        }
                    ]
                };

                return (
                    body.substitution_data.urlRecover.match(/http.\/\/tower\.dev:5037\/auth\/reset-password\/[\w*]/) &&
                    body.content.template_id === expectedRequestBody.content.template_id &&
                    body.recipients[0].address.email === expectedRequestBody.recipients[0].address.email
                );
            })
            .reply(200);

        await new UserModel({
            email: 'potato@gmail.com'
        }).save();

        const response = await requester
            .post(`/auth/reset-password`)
            .type('form')
            .send({
                email: 'potato@gmail.com'
            });

        response.status.should.equal(200);
        response.header['content-type'].should.equal('text/html; charset=utf-8');
        response.text.should.include(`Email sent`);
    });

    it('Recover password request with correct email should return OK - JSON format', async () => {
        nock('https://api.sparkpost.com')
            .post('/api/v1/transmissions', (body) => {
                const expectedRequestBody = {
                    content: {
                        template_id: 'recover-password'
                    },
                    recipients: [
                        {
                            address: {
                                email: 'potato@gmail.com'
                            }
                        }
                    ]
                };

                return (
                    body.substitution_data.urlRecover.match(/http.\/\/tower\.dev:5037\/auth\/reset-password\/[\w*]/) &&
                    body.content.template_id === expectedRequestBody.content.template_id &&
                    body.recipients[0].address.email === expectedRequestBody.recipients[0].address.email
                );
            })
            .reply(200);

        const response = await requester
            .post(`/auth/reset-password`)
            .set('Content-Type', 'application/json')
            .send({
                email: 'potato@gmail.com'
            });

        response.status.should.equal(200);
        response.header['content-type'].should.equal('application/json; charset=utf-8');
        response.body.should.have.property('message').and.equal(`Email sent`);
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
