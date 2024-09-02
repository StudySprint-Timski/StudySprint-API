const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, CreateBucketCommand, HeadBucketCommand, GetObjectCommand, PutObjectCommand, PutBucketPolicyCommand, PutPublicAccessBlockCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const path = require('path');
const fs = require('fs');
const File = require('../models/File');

require('dotenv').config();

// AWS S3 Client Configuration (v3)
const s3Client = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
    },
});

const uploadFile = async (file, userId, hostname) => {
    try {
        if (!file) {
            throw new Error('No file uploaded.');
        }

        const bucketName = `bucket-${Date.now()}`;

        // Check if the bucket exists
        try {
            await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
        } catch (error) {
            if (error.$metadata.httpStatusCode === 404) {
                // Bucket doesn't exist, create it
                await s3Client.send(new CreateBucketCommand({ Bucket: bucketName, ObjectOwnership: 'BucketOwnerPreferred' }));
            } else {
                throw error;
            }
        }

        const modifyBucketConfigParams = {
            Bucket: bucketName,
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: false,
              IgnorePublicAcls: false,
              BlockPublicPolicy: false,
              RestrictPublicBuckets: false,
              BlockPublicAccess: false,
            },
        };

        await s3Client.send(new PutPublicAccessBlockCommand(modifyBucketConfigParams));

        // Define the bucket policy
        const policy = {
            Version: "2012-10-17",
            Statement: [
              {
                Sid: "PublicReadGetObject",
                Effect: "Allow",
                Principal: "*",
                Action: "s3:GetObject",
                Resource: `arn:aws:s3:::${bucketName}/*`,
              },
            ],
        };

        await s3Client.send(new PutBucketPolicyCommand({
            Bucket: bucketName,
            Policy: JSON.stringify(policy)
        }));

        const objectName = file.originalname;

        // Upload the file to S3
        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: objectName,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: "public-read"
        }));

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: objectName,
        });

        // Generate a signed URL (you can configure expiration time as needed)
        const fileUrl = await getSignedUrl(s3Client, command); // 1-hour expiration

        // Save the file metadata to the database
        const newFile = new File({
            bucketName: bucketName,
            fileName: objectName,
            contentType: file.mimetype,
            fileUrl: fileUrl,
            uploadedBy: userId
        });

        await newFile.save();

        return {
            bucketName,
            objectName,
            fileUrl,
            contentType: file.mimetype,
            uploadDate: newFile.uploadDate,
            uploadedBy: newFile.uploadedBy
        };
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
};

module.exports = uploadFile;
