class MicroserviceDuplicated extends Error {

    constructor(message) {
        super(message);
        this.name = 'MicroserviceDuplicated';
        this.message = message;
    }

}
module.exports = MicroserviceDuplicated;
