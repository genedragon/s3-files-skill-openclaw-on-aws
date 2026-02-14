#!/usr/bin/env node
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const s3Client = new S3Client({ region: config.region });

async function uploadFile(filePath, s3Key) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const key = s3Key || fileName;

  console.log(`📤 Uploading ${fileName} to s3://${config.bucketName}/${key}...`);

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: fileContent,
    ContentType: getContentType(fileName),
  });

  await s3Client.send(command);
  console.log(`✅ Upload complete!`);

  // Generate download URL
  const downloadUrl = await generateDownloadUrl(key);
  
  const fileSize = (fileContent.length / 1024).toFixed(2);
  console.log(`\n📦 File: ${key} (${fileSize} KB)`);
  console.log(`🔗 Download URL (${config.defaultExpirationHours}h):\n${downloadUrl}`);

  return { key, downloadUrl };
}

async function generateDownloadUrl(key) {
  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  const expiresIn = config.defaultExpirationHours * 3600;
  return await getSignedUrl(s3Client, command, { expiresIn });
}

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.zip': 'application/zip',
    '.apk': 'application/vnd.android.package-archive',
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
  };
  return types[ext] || 'application/octet-stream';
}

// CLI usage
if (require.main === module) {
  const filePath = process.argv[2];
  const s3Key = process.argv[3];

  if (!filePath) {
    console.error('Usage: node upload.js <file-path> [s3-key-name]');
    process.exit(1);
  }

  uploadFile(filePath, s3Key).catch(err => {
    console.error('❌ Upload failed:', err.message);
    process.exit(1);
  });
}

module.exports = { uploadFile, generateDownloadUrl };
