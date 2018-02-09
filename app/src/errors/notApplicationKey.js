class NotApplicationKey extends Error {

    constructor(message) {
        super(message);
        this.name = 'NotApplicationKey';
        this.message = message;
    }

}
module.exports = NotApplicationKey;
