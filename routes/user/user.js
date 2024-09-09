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

router.get('/get-user-profile', async(req, res) => {
    const userId = req.user.id;

    const user = await User.findById(userId).select('_id name email profilePicture');
    if (!user) {
        return res.status(404).json({ "success": false, reason: 'User not found' });
    }

    return res.json({ "success": true, "user": user });
})

module.exports = router;