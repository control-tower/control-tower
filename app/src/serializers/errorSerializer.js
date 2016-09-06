class ErrorSerializer {

    static serializeValidationError(data, typeParam) {
        const keys = Object.keys(data);
        let message = '';
        switch (typeParam) {

        case 'body':
            message = 'Invalid body parameter';
            break;
        case 'query':
            message = 'Invalid query parameter';
            break;
        default:
            message = '';

        }

        return {
            source: {
                parameter: keys[0],
            },
            code: message.replace(/ /g, '_').toLowerCase(),
            title: message,
            detail: data[keys[0]],
        };
    }

    static serializeValidationBodyErrors(data) {
        const errors = [];
        if (data) {
            for (let i = 0, length = data.length; i < length; i++) {
                errors.push(ErrorSerializer.serializeValidationError(data[i], 'body'));
            }
        }
        return {
            errors,
        };
    }

    static serializeError(status, message) {
        return {
            errors: [{
                status,
                detail: message,
            }],
        };
    }

}

module.exports = ErrorSerializer;
