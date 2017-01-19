const logger = require('logger');

const CONTROL_TOWER = 'control-tower';

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


async function isCTAdmin(ctx, next) {
    logger.debug('Checking if user is admin in control-tower');
    const user = getUser(ctx);
    let find = false;
    if (user.roles) {
        for (let i = 0, length = user.roles.length; i < length; i++) {
            if (user.roles[i].name === CONTROL_TOWER && user.roles[i].role === 'ADMIN') {
                find = true;
                break;
            }
        }
    }
    if (find) {
        await next();
    } else {
        logger.debug('Not admin');
        ctx.throw(401, 'Not authenticated');
    }
}

module.exports = {
    isLogged,
    isCTAdmin,
};
