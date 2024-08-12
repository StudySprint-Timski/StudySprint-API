const express = require('express');
const router = express.Router();
const session = require('../../models/PomodoroSession');

router.post('/add', async (req, res) => {
    try {
        const newSession = new session(req.body);
        const savedSession = await newSession.save();
        res.status(201).json(savedSession);
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
