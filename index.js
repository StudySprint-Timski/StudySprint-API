const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');

require('dotenv').config();
require('./passport')(passport);

const authRoutes = require('./routes/auth/auth');
const googleAuthRoutes = require('./routes/auth/auth_google');
const discordAuthRoutes = require('./routes/auth/auth_discord');
const testRoutes = require('./routes/test/test')
const sessionRoutes = require('./routes/session/session')
const fileRoutes = require('./routes/file/file')
const userRoutes = require('./routes/user/user')
const friendsRoutes = require('./routes/friends/friends')

const authenticate = require('./middleware/authenticate');
const extractUser = require('./middleware/extractUser');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: process.env.MONGO_DB_NAME
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const app = express();
app.use(express.json());

app.use(passport.initialize());

app.use('/auth', authRoutes);
app.use('/auth/google', googleAuthRoutes);
app.use('/auth/discord', discordAuthRoutes);
app.use('/test', [authenticate, extractUser], testRoutes);
app.use('/session', [authenticate, extractUser], sessionRoutes);
app.use('/file', [authenticate, extractUser], fileRoutes);
app.use('/user', [authenticate, extractUser], userRoutes);
app.use('/friends', [authenticate, extractUser], friendsRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;