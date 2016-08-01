const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Microservice = new Schema({
    name: { type: String, required: true, trim: true },
    swagger: { type: String, required: false, trim: true },
    url: { type: String, required: true, trim: true },
    pathInfo: { type: String, required: true, default: '/info' },
    pathLive: { type: String, required: true, default: '/ping' },
    status: { type: String, default: 'pending' },
    infoStatus: {
        _id: false,
        lastCheck: { type: Date, required: false },
        error: { type: String, required: false, trim: true },
    },
    updatedAt: { type: Date, default: Date.now, required: true },
    token: { type: String, required: true, trim: true },
    endpoints: [{
        _id: false,
        path: { type: String, required: true, trim: true },
        method: { type: String, required: true, trim: true },
        redirect: {
            path: { type: String, required: true, trim: true },
            method: { type: String, required: true, trim: true },
        },
    }],
    tags: [{ type: String, required: false, trim: true }],
    version: { type: Number, required: true },
});


module.exports = mongoose.model('Microservice', Microservice);
