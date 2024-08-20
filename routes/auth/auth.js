const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const mongoose = require('mongoose');
const User = require('../../models/User');
const router = express.Router();

const authenticate = require('../../middleware/authenticate')
const extractUser = require('../../middleware/extractUser')

// Register new user with email, name and password
router.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  User.findOne({ email }).then(user => {
    if (user) {
      return res.status(400).json({ email: 'Email already exists' });
    } else {
      const newUser = new User({ name, email, password });
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          newUser.save()
            .then(user => res.json(user))
            .catch(err => console.log(err));
        });
      });
    }
  });
});

// Login user with email and password and return JWT token
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  User.findOne({ email }).then(user => {
    if (!user) {
      return res.status(404).json({ email: 'User not found' });
    }
    bcrypt.compare(password, user.password).then(isMatch => {
      if (isMatch) {
        const payload = { id: user.id, name: user.name };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION }, (err, token) => {
          res.json({
            success: true,
            token: 'Bearer ' + token
          });
        });
      } else {
        return res.status(400).json({
            success: false,
            reason: 'Password incorrect'
        });
      }
    });
  });
});

router.put('/update-password', [authenticate, extractUser], (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if(currentPassword === undefined || newPassword === undefined) {
      res.status(400).json({ message: 'No current or new password provided' })
    }

    // Find the authenticated user by ID
    User.findById(req.user.id).then(user => {
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if the current password is correct
      bcrypt.compare(currentPassword, user.password).then(isMatch => {
        if (!isMatch) {
          return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Hash the new password and update it
        bcrypt.genSalt(10, (err, salt) => {
          if (err) throw err;
          bcrypt.hash(newPassword, salt, (err, hash) => {
            if (err) throw err;
            user.password = hash;
            user.save()
              .then(() => res.json({ message: 'Password updated successfully' }))
              .catch(err => res.status(500).json({ error: err.message }));
          });
        });
      });
    });
  }
  catch(e) {
    res.status(400).send();
  }
});

module.exports = router;