class NotAuthenticated extends Error {

    constructor(message) {
        super(message);
        this.name = 'NotAuthenticated';
        this.message = message;
    }

}
module.exports = NotAuthenticated;
