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

const authenticate = require('./middleware/authenticate');

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
app.use("/test", [authenticate], testRoutes)
app.use('/session', [authenticate], sessionRoutes )

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;