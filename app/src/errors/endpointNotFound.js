class EndpointNotFound extends Error {

    constructor(message) {
        super(message);
        this.name = 'EndpointNotFound';
        this.message = message;
    }

}
module.exports = EndpointNotFound;
