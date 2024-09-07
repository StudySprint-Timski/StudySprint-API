const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FriendRequestSchema = new Schema({
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestDate: { type: Date, default: Date.now, required: true },
    responseDate: { type: Date, default: undefined },
    status: { type: string, default: 'created', required: true }
});

module.exports = mongoose.model('friend_requests', FriendRequestSchema);