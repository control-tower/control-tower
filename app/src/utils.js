const logger = require('logger');

function getUser(ctx) {
    if (ctx.state) {
        if (ctx.state.user) {
            return ctx.state.user;
        } else if (ctx.state.microservice) {
            return ctx.state.microservice;
        }
    }
    if (ctx.req && ctx.req.user) {
        return ctx.req.user;
    }
    return null;
}

async function isLogged(ctx, next) {
    logger.debug('Checking if user is logged');
    if (getUser(ctx)) {
        await next();
    } else {
        logger.debug('Not logged');
        ctx.throw(401, 'Not authenticated');
    }
}

async function isAdmin(ctx, next) {
    logger.debug('Checking if user is admin');
    const user = getUser(ctx);
    if (user && user.role === 'ADMIN') {
        await next();
    } else {
        logger.debug('Not admin');
        ctx.throw(401, 'Not authenticated');
    }
}

module.exports = {
    isAdmin,
    isLogged,
};
