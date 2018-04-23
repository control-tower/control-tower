const appConstants = require('app.constants');
const bluebird = require('bluebird');
const redis = require('redis');
bluebird.promisifyAll(redis.RedisClient.prototype);

class VersionService {

    constructor() {
        this.redisClient = redis.createClient({
            url: process.env.REDIS_URL
        });
    }

    async get() {
        let data = await this.redisClient.getAsync(appConstants.ENDPOINT_VERSION);
        if (data) {
            data = JSON.parse(data);
            data.lastUpdated = new Date(data.lastUpdated);

        }
        return null;
    }
    
    set(obj) {
        this.redisClient.set(appConstants.ENDPOINT_VERSION, JSON.stringify(obj));
    }

}

module.exports = new VersionService();
