const express = require('express');
const router = express.Router();

const User = require('../../models/User');
const FriendRequest = require('../../models/FriendRequest');

router.post("/create-friend-request", async(req, res) => {
    const userId = req.user.id;

    await User.findById(userId).then(async (user) => {
        if (!user) {
            return res.status(404).json({ "success": false, reason: 'User not found' });
        }

        const friendUser = await User.findById(req.body.friendId);

        if(!friendUser) {
            return res.status(404).json({ "success": false, reason: 'User not found' })
        }

        const existingFriendRequest = await FriendRequest.find({'from': user, 'to': friendUser, 'status': 'created'});

        if(existingFriendRequest.length === 0) {
            const newFriendRequest = new FriendRequest({
                from: user,
                to: friendUser,
            })
    
            await newFriendRequest.save();
        }

        return res.send({ "success": true })
    })
})

router.post('/accept-friend-request', async (req, res) => {
    const userId = req.user.id;

    try {
        // Find the current user
        const user = await User.findById(userId).populate('friends');
        if (!user) {
            return res.status(404).json({ "success": false, reason: 'User not found' });
        }

        // Find the friend request
        const friendRequest = await FriendRequest.findById(req.body.friendRequestId).populate('from to');
        if (!friendRequest) {
            return res.status(404).json({ "success": false, reason: 'Friend request not found' });
        }

        if (!friendRequest.from || !friendRequest.to) {
            return res.status(404).json({ "success": false, reason: 'Friend not found' });
        }

        friendRequest.status = 'accepted';
        friendRequest.responseDate = Date.now();

        friendRequest.from.friends.push(friendRequest.to);
        friendRequest.to.friends.push(friendRequest.from);

        await friendRequest.save();

        await user.save();
        await friendRequest.from.save();
        await friendRequest.to.save();

        return res.send({ "success": true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ "success": false, reason: 'Server error' });
    }
});


router.post('/reject-friend-request', async (req, res) => {
    const userId = req.user.id;

    try {
        // Find the current user
        const user = await User.findById(userId).populate('friends');
        if (!user) {
            return res.status(404).json({ "success": false, reason: 'User not found' });
        }

        // Find the friend request
        const friendRequest = await FriendRequest.findById(req.body.friendRequestId).populate('from to');
        if (!friendRequest) {
            return res.status(404).json({ "success": false, reason: 'Friend request not found' });
        }

        if (!friendRequest.from || !friendRequest.to) {
            return res.status(404).json({ "success": false, reason: 'Friend not found' });
        }

        friendRequest.status = 'rejected';
        friendRequest.responseDate = Date.now();

        await friendRequest.save();

        return res.send({ "success": true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ "success": false, reason: 'Server error' });
    }
});

router.get('/get-friend-request', async(req, res) => {
    const userId = req.user.id;

    await User.findById(userId).then(async (user) => {
        if (!user) {
            return res.status(404).json({ "success": false, reason: 'User not found' });
        }

        const friendRequests = await FriendRequest
            .find({'to': user, 'status': 'created'})
            .populate('from', 'name email profilePicture')
            .populate('to', 'name email profilePicture');

        return res.send({ "success": true, friendRequests })
    })
})

router.post('/remove-friend', async (req, res) => {
    const userId = req.user.id;
    const friendId = req.body.friendId;

    await User.findById(userId).populate('friends').then(async (user) => {
        if (!user) {
            return res.status(404).json({ "success": false, reason: 'User not found' });
        }

        const friendUser = await User.findById(friendId).populate('friends');
        if (!friendUser) {
            return res.status(404).json({ "success": false, reason: 'User not found' });
        }

        user.friends = user.friends.filter(f => f._id.toString() !== friendUser._id.toString());
        friendUser.friends = friendUser.friends.filter(f => f._id.toString() !== user._id.toString());
        
        await user.save();
        await friendUser.save();

        return res.send({ "success": true })
    })
})

module.exports = router;