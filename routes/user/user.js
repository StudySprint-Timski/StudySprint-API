const express = require('express');
const router = express.Router();
const multer = require('multer');

const uploadFileToMinio = require('../../utils/upload_file');
const User = require('../../models/User');
const FriendRequest = require('../../models/FriendRequest');

// Set up Multer for file handling
const storage = multer.memoryStorage()
const upload = multer({ storage: storage });

router.put("/profile-picture", upload.single('file'), async (req, res) => {
    const file = req.file;
    const userId = req.user.id;

    if(!file){
        return res.status(400).json({ "success": false, "message": "No file sent" })
    }

    if (!file?.mimetype?.startsWith('image/')) {
        return res.status(400).json({ "success": false, message: 'Uploaded file is not an image' });
    }

    await User.findById(userId).then(async (user) => {
        if (!user) {
            return res.status(404).json({ "success": false, message: 'User not found' });
        }

        const upload_result = await uploadFileToMinio(file, userId);

        user.profilePicture = upload_result.fileUrl;
        await user.save();

        return res.send({ "success": true, "url": upload_result.fileUrl })
    })

})

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

        const existingFriendRequest = await FriendRequest.find({'from': user, 'to': friendUser});

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

router.post('/get-users', async(req, res) => {
    const userId = req.user.id;
    const searchParam = req.body.searchParam;

    await User.findById(userId).then(async (user) => {
        if (!user) {
            return res.status(404).json({ "success": false, reason: 'User not found' });
        }

        const friendIds = user.friends.map(f => f._id.toString());

        console.log('friendIds:',friendIds)

        const friendRequestsSent = (await FriendRequest.find({'from': user, 'status': 'created'}).select('to')).map(fr => fr.to._id.toString());
        const friendRequestsReceived = (await FriendRequest.find({'to': user, 'status': 'created'}).select('from')).map(fr => fr.from._id.toString());

        const users = await User.find({
            '_id': {$nin: [user._id, ...friendRequestsReceived]},
            $or: [
                {'name': {$regex: searchParam, $options: 'i'}},
                {'email': {$regex: searchParam, $options: 'i'}}
            ]
        }).select('_id name email profilePicture');

        const result = users.map(u => ({
            ...u.toObject(),
            isFriend: friendIds.indexOf(u._id.toString()) !== -1,
            friendRequestSent: friendRequestsSent.indexOf(u._id.toString()) !== -1,
        }));

        res.send({"success": true, result })
    })
})

module.exports = router;