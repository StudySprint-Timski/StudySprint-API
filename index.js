const express = require('express');
const http = require('http');
const passport = require('passport');
const socketio = require('socket.io');
const connectDB = require('./utils/db');

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

const app = express();
const server = http.createServer(app);
const io = socketio(server);
app.use(express.json());

app.use(passport.initialize());

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/auth', authRoutes);
app.use('/auth/google', googleAuthRoutes);
app.use('/auth/discord', discordAuthRoutes);
app.use('/test', [authenticate, extractUser], testRoutes);
app.use('/pomodoro', [authenticate, extractUser], sessionRoutes);
app.use('/file', [authenticate, extractUser], fileRoutes);
app.use('/user', [authenticate, extractUser], userRoutes);
app.use('/friends', [authenticate, extractUser], friendsRoutes);

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('disconnect', () => {
      console.log('Client disconnected');
  });
});

connectDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;