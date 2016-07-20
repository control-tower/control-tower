const mongoose = require('mongoose');
require('mongoose-regexp')(mongoose);
const Schema = mongoose.Schema;

const Endpoint = new Schema({
    path: { type: String, required: true, trim: true },
    method: { type: String, required: true, trim: true },
    pathRegex: { type: RegExp, required: true },
    pathKeys: [{ type: String, trim: true }],
    authenticated: { type: Boolean, default: false },
    redirect: [{
        path: { type: String, required: true, trim: true },
        url: { type: String, required: true, trim: true },
        method: { type: String, required: true, trim: true },
    }],
});

module.exports = mongoose.model('Endpoint', Endpoint);
