const logger = require('logger');
require('dotenv').config({ silent: true });
require('app')().then(() => {
    logger.info('Server running');
}, (err) => {
    logger.error('Error running server', err);
});
