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
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: User }],
  workTimeDuration: {
    type: Number,  // Work time duration in seconds
    required: true
  },
  breakTimeDuration: {
    type: Number,  // Break time duration in seconds
    required: true
  },
  cycles: {
    type: Number,  // Number of work/break cycles
    required: true
  }
});

module.exports = mongoose.model('sessions', PomodoroSessionSchema);
