const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Version = new Schema({
    name: { type: String, required: true, trim: true },
    version: { type: Number, required: true, trim: true },
});

module.exports = mongoose.model('Version', Version);
