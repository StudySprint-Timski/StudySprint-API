const express = require('express');
const router = express.Router();
const session = require('../../models/PomodoroSession');
const User = require('../../models/User');

router.post('/add', async (req, res) => {
    try {
        const userId = req.user.id;
        const users = req.body.users

        console.log('users:', users)

        if(!users.includes(userId)) {
            users.push(userId);
        }

        for(let i=0;i<users.length;i++) {
            const user = await User.findById(users[i])
            if(!user) {
                return res.status(400).send({
                    success: false,
                    message: "User not found"
                })
            }

            const userSession = await session.findOne({
                users: {
                    $in: [user._id.toString()]
                }
            })

            if(userSession) {
                return res.status(400).send({
                    success: false,
                    message: "User already in session",
                    user: user._id.toString()
                })
            }
        };

        const sessionBody = {sessionName: req.body.sessionName, users: users, date: Date.now()}
        const newSession = new session(sessionBody);
        const savedSession = await newSession.save();
        res.status(200).json(savedSession);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const sessions = await session.find().populate('users');
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/current', async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId);
        if(!user) {
            return res.status(404).json({ "success": false, reason: 'User not found' });
        }

        const currentSession = await session.findOne({
            users: {
                $in: [user._id.toString()]
            }
        })

        res.status(200).json({
            "success": true,
            session: currentSession ?? null
        })
    } catch (error) {
        console.error('Error getting current session:', error);
        res.status(500).send({ success: false, message: 'Failed to get current session' });
    }
})

router.get('/friends-status', async (req, res) => {
    const userId = req.user.id;

    const user = await User.findById(userId).populate('friends');
    if(!user) {
        return res.status(404).json({ "success": false, reason: 'User not found' });
    }

    const friendsList = [];

    for(let i=0;i<user.friends.length;i++) {
        let friend = await User.findById(user.friends[i]._id);
        if(!friend) {
            continue;
        }

        const friendSession = await session.findOne({
            users: {
                $in: [friend._id.toString()]
            }
        })

        friendsList.push({
            _id: friend._id,
            name: friend.name,
            email: friend.email,
            profilePicture: friend.profilePicture,
            isInSession: friendSession !== null
        })
    }

    res.status(200).send({
        success: true,
        friendsList: friendsList
    })
})

router.get('/:id', async (req, res) => {
    try {
        const sessionVariable = await session.findById(req.params.id).populate('users');
        if (!sessionVariable)
            return res.status(404).json({ message: 'Session not found' });
        res.json(sessionVariable);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/edit/:id', async (req, res) => {
    try {
        const updatedSession = await session.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedSession) return res.status(404).json({ message: 'Session not found' });
        res.json(updatedSession);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/delete/:id', async (req, res) => {
    try {
        const deletedSession = await session.findByIdAndDelete(req.params.id);
        if (!deletedSession) return res.status(404).json({ message: 'Session not found' });
        res.json({ message: 'Session deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
