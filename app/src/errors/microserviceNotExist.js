class MicroserviceNotExist extends Error {

    constructor(message) {
        super(message);
        this.name = 'MicroserviceNotExist';
        this.message = message;
    }

}
module.exports = MicroserviceNotExist;
