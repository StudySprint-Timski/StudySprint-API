const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');  // Import the User model
const router = express.Router();

// Google OAuth2 login route
router.get('/', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth2 callback route
router.get('/callback', passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    // Successful authentication
    User.findOne({ googleId: req.user.googleId })
      .then(existingUser => {
        if (existingUser) {
            existingUser.userType = 'google';
            existingUser.save()
          // User exists, generate and return JWT token
          const payload = { id: existingUser.id, name: existingUser.name };
          jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION }, (err, token) => {
            if (err) {
              return res.status(500).json({ error: 'Error signing token' });
            }
            res.json({
              success: true,
              token: 'Bearer ' + token
            });
          });
        } else {
          // User does not exist, create a new user
          const newUser = new User({
            googleId: req.user.id,  // Use the Google ID from the profile
            name: req.user.name,
            email: req.user.email,
            userType: 'google'
          });

          newUser.save()
            .then(user => {
              // Generate and return JWT token
              const payload = { id: user.id, name: user.name };
              jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION }, (err, token) => {
                if (err) {
                  return res.status(500).json({ error: 'Error signing token' });
                }
                res.json({
                  success: true,
                  token: 'Bearer ' + token
                });
              });
            })
            .catch(err => res.status(500).json({ error: 'Error saving user' }));
        }
      })
      .catch(err => res.status(500).json({ error: 'Error finding user' }));
  }
);

router.post('/callback', async (req, res) => {
  const accessToken = req.headers.authorization.split(' ')[1];

  try {
    // Verify the Google token with Google's API to get user info
    const ticket = await client.verifyIdToken({
      idToken: accessToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    console.log('ticket:', ticket)

    const payload = ticket.getPayload();

    console.log('payload:', payload)

    User.findOne({ googleId: payload.sub })
      .then(existingUser => {
        if (existingUser) {
          // Issue JWT token and send to client
          const tokenPayload = { id: existingUser.id, name: existingUser.name };
          jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION }, (err, token) => {
            if (err) {
              return res.status(500).json({ error: 'Error signing token' });
            }
            res.json({ success: true, token: 'Bearer ' + token });
          });
        } else {
          // Create new user and then issue JWT
          const newUser = new User({
            googleId: payload.sub,
            name: payload.name,
            email: payload.email,
            userType: 'google'
          });

          newUser.save()
            .then(user => {
              const tokenPayload = { id: user.id, name: user.name };
              jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION }, (err, token) => {
                if (err) {
                  return res.status(500).json({ error: 'Error signing token' });
                }
                res.json({ success: true, token: 'Bearer ' + token });
              });
            })
            .catch(err => res.status(500).json({ error: 'Error saving user' }));
        }
      })
      .catch(err => res.status(500).json({ error: 'Error finding user' }));
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
});


module.exports = router;
