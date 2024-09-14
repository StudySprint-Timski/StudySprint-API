const express = require('express');
const router = express.Router();
const Session = require('../../models/PomodoroSession');
const User = require('../../models/User');
const mongoose = require('mongoose');

// Add a new session
router.post('/add', async (req, res) => {
    try {
        const userId = req.user.id;
        let { users, sessionName } = req.body;

        // Ensure the user initiating the session is included
        if (!users.includes(userId)) {
            users.push(userId);
        }

        // Verify all users exist in one query using $in
        const validUsers = await User.find({
            _id: { $in: users }
        });

        if (validUsers.length !== users.length) {
            return res.status(400).json({
                success: false,
                message: "One or more users not found."
            });
        }

        // Check if any user is already in an active session
        const usersInSession = await Session.find({
            users: { $in: users }
        });

        if (usersInSession.length > 0) {
            return res.status(400).json({
                success: false,
                message: "One or more users are already in an active session.",
                conflictingUsers: usersInSession.map(s => s.users)
            });
        }

        // Create new session
        const sessionBody = { sessionName, users, date: Date.now() };
        const newSession = new Session(sessionBody);
        const savedSession = await newSession.save();

        // Broadcast the creation of the session via socket.io
        req.io.emit('newSession', savedSession);

        res.status(200).json(savedSession);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get all sessions
router.get('/', async (req, res) => {
    try {
        const sessions = await Session.find().populate('users');
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get current session for the logged-in user
router.get('/current', async (req, res) => {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);

    const userId = req.user.id;

    const currentSession = await Session.findOne({
        users: { $in: [userId] }
    }).populate('users');

    setInterval(async () => {
        if (!currentSession) {
            const noSessionMessage = {
                message: 'no_active_session'
            }
            res.write(`data: ${JSON.stringify(noSessionMessage)}\n\n`)
        } else {
            const sessionMessage = {
                message: 'currentSession',
                sessionId: currentSession._id,
            }
            res.write(`data: ${JSON.stringify(sessionMessage)}\n\n`)
        }
    }, 5000)

    res.on('close', () => {
        return res.end();
    });
});

// Get friends' session status
router.get('/friends-status', async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId).populate('friends');
        if (!user) {
            return res.status(404).json({ success: false, reason: 'User not found' });
        }

        const friendsIds = user.friends.map(friend => friend._id);

        // Fetch friends and their session status in a single query
        const friendsSessions = await Session.find({
            users: { $in: friendsIds }
        }).populate('users');

        const friendsList = user.friends.map(friend => {
            const isInSession = friendsSessions.some(session =>
                session.users.some(u => u._id.toString() === friend._id.toString())
            );
            return {
                _id: friend._id,
                name: friend.name,
                email: friend.email,
                profilePicture: friend.profilePicture,
                isInSession
            };
        });

        res.status(200).json({ success: true, friendsList });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch friends status' });
    }
});

// Get session by ID
router.get('/:id', async (req, res) => {
    try {
        const sessionVariable = await Session.findById(req.params.id).populate('users');
        if (!sessionVariable) {
            return res.status(404).json({ message: 'Session not found' });
        }
        res.json(sessionVariable);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update a session
router.put('/edit/:id', async (req, res) => {
    try {
        const updatedSession = await Session.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedSession) return res.status(404).json({ message: 'Session not found' });
        res.json(updatedSession);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a session
router.delete('/delete/:id', async (req, res) => {
    try {
        const deletedSession = await Session.findByIdAndDelete(req.params.id);
        if (!deletedSession) return res.status(404).json({ message: 'Session not found' });
        res.json({ message: 'Session deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
