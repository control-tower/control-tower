const Plugin = require('models/plugin.model');
const mongoose = require('mongoose');
const config = require('config');
const mongoUri = process.env.CT_MONGO_URI || `mongodb://${config.get('mongodb.host')}:${config.get('mongodb.port')}/${config.get('mongodb.database')}`;


async function setPluginSetting(pluginName, settingKey, settingValue) {
    return new Promise((resolve, reject) => {
        async function onDbReady(err) {
            if (err) {
                reject(new Error(err));
            }

            const plugin = await Plugin.findOne({ name: pluginName }).exec();
            if (!plugin) {
                throw new Error(`Plugin '${pluginName}' could not be found.`);
            }

            const obj = {};
            obj[settingKey] = settingValue;

            plugin.config = Object.assign({}, plugin.config, obj);

            return plugin.save().then(resolve);
        }

        mongoose.connect(mongoUri, onDbReady);
    });
}

module.exports = {
    setPluginSetting
};
