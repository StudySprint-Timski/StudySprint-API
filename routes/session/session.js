const express = require('express');
const router = express.Router();
require('express-ws')(router);
const dayjs = require('dayjs')

const Session = require('../../models/PomodoroSession');
const User = require('../../models/User');

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
        const sessionBody = { sessionName, users, date: new Date() };
        const newSession = new Session(sessionBody);
        const savedSession = await newSession.save();

        // Broadcast the creation of the session via socket.io
        req.io.emit('newSession', savedSession);

        res.status(200).json(savedSession);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});


router.ws('/', async (ws, req) => {
    const user = await User.findById(req.user.id);
    if(!user) {
        ws.send('No user found!')
        ws.close();
    }

    const findExistingSession = async () => {
        const existingSession = await Session.findOne({
            users: { $in: [user]},
            state: { $ne: 'ended' }
        }).populate('users');

        const currentDate = new Date();

        if(existingSession.state === 'work' && currentDate < dayjs(existingSession.lastUpdateDate).add(existingSession.workTimeDuration, 'minute').toDate()) {
            if(existingSession.cycles === existingSession.passedCycles) {
                existingSession.state = 'ended'
            } else {
                existingSession.state = 'break'
            }
            session.lastUpdateDate = currentDate;
        } else if(existingSession.state === 'break' && currentDate < dayjs(existingSession.lastUpdateDate).add(existingSession.breakTimeDuration, 'second').toDate()) {
            existingSession.state = 'work';
            existingSession.passedCycles++;
            session.lastUpdateDate = currentDate;
        }

        await existingSession.save();

        ws.send(JSON.stringify({
            status: 'update_session',
            session: existingSession ?? null,
            ownedByUser: existingSession?.owner?._id.toString() === user._id.toString()
        }))
    }

    findExistingSession();

    setInterval(() => {
        findExistingSession();
    }, [100])

    ws.on('message', async (messageString) => {
        const message = JSON.parse(messageString);
        if(message.action === 'create_session') {
            const existingSessions = await Session.findOne({
                users: { $in: [user]}
            });
            if(existingSessions) {
                ws.send(JSON.stringify({
                    message: 'user_already_has_session'
                }))
            } else if(!message.workTimeInMinutes || !message.breakTimeInSeconds || !message.numOfCycles) {
                ws.send(JSON.stringify({
                    message: 'invalid_params'
                }))
            } else {
                const newSession = new Session({
                    sessionName: 'test123',
                    workTimeDuration: message.workTimeInMinutes,
                    breakTimeDuration: message.breakTimeInSeconds,
                    cycles: message.numOfCycles,
                    owner: user,
                    users: [user]
                })
                await newSession.save();

                ws.send(JSON.stringify({
                    status: 'created_session',
                    session: newSession,
                    ownedByUser: newSession.owner._id.toString() === user._id.toString()
                }))
            }
        } else if (message.action === 'delete_session') {
            await Session.findByIdAndDelete(message.id);
            ws.send(JSON.stringify({
                status: 'update_session',
                session: null
            }))
        } else if (message.action === 'join_session') {
            const session = await Session.findOne({ sessionId: message.id });
            if(!session) {
                ws.send(JSON.stringify({
                    status: 'no_session_found',
                    session: null
                }))
            } else {
                session.users.push(user);
                await session.save();
    
                ws.send(JSON.stringify({
                    status: 'update_session',
                    session: session
                }))
            }
        } else if(message.action === 'start_session') {
            const session = await Session.findOne({ sessionId: message.id });
            if(!session) {
                ws.send(JSON.stringify({
                    status: 'no_session_found',
                    session: null
                }))
            } else {
                session.state = 'work';
                session.lastUpdateDate = new Date();
                await session.save();
    
                ws.send(JSON.stringify({
                    status: 'update_session',
                    session: session
                }))
            }
        } else if(message.action === 'end_session') {
            const session = await Session.findOne({ sessionId: message.id });
            if(!session) {
                ws.send(JSON.stringify({
                    status: 'no_session_found',
                    session: null
                }))
            } else {
                session.state = 'ended';
                session.lastUpdateDate = new Date();
                await session.save();
    
                ws.send(JSON.stringify({
                    status: 'update_session',
                    session: session
                }))
            }
        }
    });

    // Handle WebSocket disconnection
    ws.on('close', () => {
        console.log('Closed')
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
