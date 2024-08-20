const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now
  },
  googleId: {
    type: String,
    unique: true
  },
  discordId: {
    type: String,
    unique: true
  },
  userType: {
    type: String,
    default: 'generic'
  },
  profilePicture: {
    type: String,
    default: null
  }
});

module.exports = mongoose.model('users', UserSchema);