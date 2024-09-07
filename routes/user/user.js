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

        const newFriendRequest = new FriendRequest({
            from: user,
            to: friendUser,
        })

        await newFriendRequest.save();

        return res.send({ "success": true })
    })
})

router.post('/accept-friend-request', async(req, res) => {
    const userId = req.user.id;

    await User.findById(userId).then(async (user) => {
        if (!user) {
            return res.status(404).json({ "success": false, reason: 'User not found' });
        }

        const friendRequest = await FriendRequest.findById(req.body.friendRequestId);

        if(!friendRequest) {
            return res.status(404).json({ "success": false, reason: 'Friend request not found' })
        }

        const friendUser = friendRequest.to

        friendRequest.status = 'accepted';
        friendRequest.responseDate = Date.now;

        user.friends = [...user.friends, friendUser];
        friendUser.friends = [...friendUser.friends, user];

        await user.save();
        await friendUser.save();

        await friendRequest.save();

        return res.send({ "success": true })
    })
})

router.post('/reject-friend-request', async(req, res) => {
    const userId = req.user.id;

    await User.findById(userId).then(async (user) => {
        if (!user) {
            return res.status(404).json({ "success": false, reason: 'User not found' });
        }

        const friendRequest = await FriendRequest.findById(req.body.friendRequestId);

        if(!friendRequest) {
            return res.status(404).json({ "success": false, reason: 'Friend request not found' })
        }

        friendRequest.status = 'rejected';
        friendRequest.responseDate = Date.now;

        await friendRequest.save();

        return res.send({ "success": true })
    })
})

router.get('/get-friend-request', async(req, res) => {
    const userId = req.user.id;

    await User.findById(userId).then(async (user) => {
        if (!user) {
            return res.status(404).json({ "success": false, reason: 'User not found' });
        }

        const friendRequests = await FriendRequest.find(f => f.to = user);

        return res.send({ "success": true, friendRequests })
    })
})

module.exports = router;