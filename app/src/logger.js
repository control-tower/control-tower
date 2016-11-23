const config = require('config');
const bunyan = require('bunyan');
const bsyslog = require('node-bunyan-syslog-udp');
/**
 * Create Logger
 */
module.exports = (function createLogger() {
    const streams = [];

    switch(config.get('logger.type')) {
        case 'syslog':
            streams.push({
                type: 'raw', // Always use 'raw' bunyan stream 
                level: config.get('logger.level') || 'debug',
                stream: bsyslog.createBunyanStream({
                    name: 'control-tower',    
                    host: config.get('logger.syslog.host'),  
                    port: config.get('logger.syslog.port'), 
                    facility: 'local0' 
                })
            });
        break;
        case 'console':
            streams.push({
                level: config.get('logger.level') || 'debug',
                stream: process.stdout,
            });
        break;
    }

    if (config.get('logger.toFile')) {
        streams.push({
            level: config.get('logger.level') || 'debug',
            path: config.get('logger.dirLogFile'),
        });
    } else if (config.get('logger.type') === 'syslog') {
    const logger = bunyan.createLogger({
        name: config.get('logger.name'),
        streams,
    });
    return logger;

}());

