const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('./User');
const crypto = require('crypto')

function generateUniqueId() {
  return '@'+crypto.randomBytes(3).toString('hex').toUpperCase();
}

const PomodoroSessionSchema = new Schema({
  sessionId: {
    type: String,
    required: true,
    default: generateUniqueId
  },
  startDate: {
    type: Date,
    default: null
  },
  createdDate: {
    type: Date,
    default: Date.now
  },
  lastUpdateDate: {
    type: Date,
    default: Date.now
  },
  state: {
    type: String,
    enum: ['not_started', 'work', 'break', 'ended'],
    default: 'not_started'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: User
  },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: User }],
  workTimeDuration: {
    type: Number,  // Work time duration in minutes
    required: true
  },
  breakTimeDuration: {
    type: Number,  // Break time duration in seconds
    required: true
  },
  cycles: {
    type: Number,  // Number of work/break cycles
    required: true,
  },
  passedCycles: {
    type: Number,
    default: 1
  }
});

module.exports = mongoose.model('sessions', PomodoroSessionSchema);
