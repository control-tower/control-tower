const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');

let requester;

chai.use(chaiHttp);

exports.getTestServer = async function getTestServer() {
    if (requester) {
        return requester;
    }

    nock(`${process.env.CT_URL}`)
        .post(`/api/v1/microservice`)
        .reply(200);

    const serverPromise = require('../../src/app');
    const { server } = await serverPromise();
    requester = chai.request(server).keepOpen();
    //
    return requester;
};
