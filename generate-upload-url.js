#!/usr/bin/env node
const { S3Client } = require('@aws-sdk/client-s3');
const { createPresignedPost } = require('@aws-sdk/s3-presigned-post');
const config = require('./config.json');

const s3Client = new S3Client({ region: config.region });

async function generateUploadUrl(filename, maxSizeMB) {
  const maxSize = maxSizeMB || config.maxUploadSizeMB;
  const key = filename || `uploads/${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  console.log(`📤 Generating upload URL for: ${key}`);
  console.log(`📏 Max file size: ${maxSize} MB`);
  console.log(`⏰ Expiration: 1 hour\n`);

  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: config.bucketName,
    Key: key,
    Conditions: [
      ['content-length-range', 0, maxSize * 1024 * 1024],
    ],
    Expires: 3600, // 1 hour
  });

  console.log(`✅ Upload form generated!\n`);
  console.log(`POST URL: ${url}`);
  console.log(`\nForm fields (include these in your POST request):`);
  console.log(JSON.stringify(fields, null, 2));
  console.log(`\n📝 To upload, POST a multipart/form-data request with:`);
  console.log(`   - All the fields above as hidden inputs`);
  console.log(`   - A file input named "file"`);
  console.log(`\n💡 Example cURL command:`);
  
  const curlFields = Object.entries(fields)
    .map(([k, v]) => `-F "${k}=${v}"`)
    .join(' ');
  console.log(`curl ${curlFields} -F "file=@yourfile.ext" "${url}"`);

  return { url, fields, key };
}

// CLI usage
if (require.main === module) {
  const filename = process.argv[2];
  const maxSizeMB = parseInt(process.argv[3]) || config.maxUploadSizeMB;

  generateUploadUrl(filename, maxSizeMB).catch(err => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  });
}

module.exports = { generateUploadUrl };
