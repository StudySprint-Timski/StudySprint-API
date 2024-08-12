const passport = require('passport');

// Authentication middleware
const authenticate = passport.authenticate('jwt', { session: false });

module.exports = authenticate;