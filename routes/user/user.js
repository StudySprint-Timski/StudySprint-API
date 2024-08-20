const express = require('express');
const router = express.Router();
const multer = require('multer');

const uploadFileToMinio = require('../../utils/upload_file');
const User = require('../../models/User');

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

module.exports = router;