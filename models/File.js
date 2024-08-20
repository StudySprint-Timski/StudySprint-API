const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const User = require('./User')

const File = new Schema({
    bucketName: String,
    fileName: String,
    contentType: String,
    fileUrl: String,
    uploadDate: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: User }
});

module.exports = mongoose.model('files', File);