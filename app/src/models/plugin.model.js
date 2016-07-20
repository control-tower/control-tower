const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Plugin = new Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    mainFile: { type: String, required: true, trim: true },
    active: { type: Boolean, default: false },
    config: { type: Schema.Types.Mixed, required: false },
});


module.exports = mongoose.model('Plugin', Plugin);
