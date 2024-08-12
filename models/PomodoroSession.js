const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('./User');

const PomodoroSessionSchema = new Schema({
  sessionName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: User }]
});

module.exports = mongoose.model('sessions', PomodoroSessionSchema);