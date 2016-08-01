class FilterError extends Error {

    constructor(message) {
        super(message);
        this.name = 'FilterError';
        this.message = message;
    }

}
module.exports = FilterError;
