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
                reject(`Plugin '${pluginName}' could not be found.`);
            }

            const newConfig = {};
            const pluginObjkey = `config.${settingKey}`;
            newConfig[pluginObjkey] = settingValue;

            return Plugin.update({ name: pluginName }, { $set: newConfig }).exec().then(resolve);
        }

        mongoose.connect(mongoUri, onDbReady);
    });
}

const getUUID = () => Math.random().toString(36).substring(7);

module.exports = {
    setPluginSetting,
    getUUID
};
