const mongoose = require('mongoose');
require('mongoose-regexp')(mongoose);
const Schema = mongoose.Schema;

const Endpoint = new Schema({
    path: { type: String, required: true, trim: true },
    method: { type: String, required: true, trim: true },
    pathRegex: { type: RegExp, required: true },
    pathKeys: [{ type: String, trim: true }],
    authenticated: { type: Boolean, default: false },
    applicationRequired: { type: Boolean, default: false },
    binary: { type: Boolean, default: false },
    cache: [{ type: String, required: false }],
    uncache: [{ type: String, required: false }],
    toDelete: { type: Boolean, required: false, default: false },
    redirect: [{
        path: { type: String, required: true, trim: true },
        url: { type: String, required: true, trim: true },
        method: { type: String, required: true, trim: true },
        filters: [{
            name: { type: String, required: true, trim: true },
            path: { type: String, required: true, trim: true },
            condition: { type: String, required: true, trim: true, default: 'AND' },
            method: { type: String, required: true, trim: true },
            pathRegex: { type: RegExp, required: true },
            pathKeys: [{ type: String, trim: true }],
            params: Schema.Types.Mixed,
            compare: Schema.Types.Mixed,
        }],
    }],
    version: { type: Number, required: true },
});

module.exports = mongoose.model('Endpoint', Endpoint);
