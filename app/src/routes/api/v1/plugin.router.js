const Router = require('koa-router');
const Plugin = require('models/plugin.model');
const logger = require('logger');
const Utils = require('utils');

const router = new Router({
    prefix: '/plugin',
});

class PluginRouter {

    static async get(ctx) {
        logger.info('Obtaining plugins');
        ctx.session.plugin = true;
        ctx.body = await Plugin.find({}, {
            __v: 0,
        });
    }

    static async update(ctx) {
        logger.info(`Update plugin with id ${ctx.params.id}`);
        const plugin = await Plugin.findById(ctx.params.id, {
            __v: 0,
        });
        if (!plugin) {
            ctx.throw(404, 'Plugin not found');
            return;
        }
        logger.debug(ctx.request.body);
        plugin.active = ctx.request.body.active;
        if (ctx.request.body.config) {
            plugin.config = ctx.request.body.config;
        }
        await plugin.save();
        logger.debug('active', plugin.active);
        logger.debug('Plugin updated successfully');
        ctx.body = plugin;
    }

}


router.get('/', Utils.isLogged, Utils.isCTAdmin, PluginRouter.get);
router.patch('/:id', Utils.isLogged, Utils.isCTAdmin, PluginRouter.update);

module.exports = router;
