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
    endPoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKey: process.env.S3_USER,
    secretKey: process.env.S3_PASSWORD,
});

const uploadFileToMinio = async (file, userId) => {
    try {
      if (!file) {
        throw new Error('No file uploaded.');
      }
  
      // Create a bucket name using a timestamp
      const bucketName = `bucket-${Date.now()}`;
  
      // Create the bucket if it doesn't exist
      const bucketExists = await minioClient.bucketExists(bucketName);
      if (!bucketExists) {
        await minioClient.makeBucket(bucketName, 'us-east-1');
      }
  
      // Set bucket policy to make objects public
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
  
      // Upload the file buffer to MinIO
      const objectName = file.originalname;
  
      await minioClient.putObject(bucketName, objectName, file.buffer, {
        'Content-Type': file.mimetype,
      });
  
      // Generate a public URL for the file
      const fileUrl = `${minioClient.protocol}//${minioClient.endPoint || "localhost"}:${minioClient.port}/${bucketName}/${objectName}`;

      // Save file metadata to MongoDB
      const newFile = new File({
        bucketName: bucketName,
        fileName: objectName,
        contentType: file.mimetype,
        fileUrl: fileUrl,
        uploadedBy: userId
      });

      await newFile.save();
  
      // Return relevant data
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