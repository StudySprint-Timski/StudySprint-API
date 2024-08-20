const express = require('express');
const router = express.Router();
const multer = require('multer');
const Minio = require('minio');
const path = require('path');
const fs = require('fs');
const File = require('../models/File');

require('dotenv').config();

// MinIO Client Configuration
const minioClient = new Minio.Client({
    endPoint: process.env.S3_ENDPOINT,
    port: parseInt(process.env.S3_PORT) || 9000,
    useSSL: process.env.S3_USE_SSL === 'true',
    accessKey: process.env.S3_USER,
    secretKey: process.env.S3_PASSWORD,
});

const uploadFileToMinio = async (file, userId, hostname) => {
    try {
        if (!file) {
            throw new Error('No file uploaded.');
        }

        const bucketName = `bucket-${Date.now()}`;

        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            await minioClient.makeBucket(bucketName, 'us-east-1');
        }

        const bucketPolicy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: "*",
                    Action: "s3:GetObject",
                    Resource: `arn:aws:s3:::${bucketName}/*`
                }
            ]
        };
        await minioClient.setBucketPolicy(bucketName, JSON.stringify(bucketPolicy));

        const objectName = file.originalname;
        await minioClient.putObject(bucketName, objectName, file.buffer, {
            'Content-Type': file.mimetype,
        });

        const fileUrl = `${minioClient.useSSL ? 'https' : 'http'}://${hostname || 'localhost'}:${minioClient.port}/${bucketName}/${objectName}`;

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

module.exports = uploadFileToMinio;