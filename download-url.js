#!/usr/bin/env node
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('./config.json');

const s3Client = new S3Client({ region: config.region });

async function generateDownloadUrl(key, expirationHours) {
  const hours = expirationHours || config.defaultExpirationHours;
  const expiresIn = hours * 3600;

  console.log(`🔗 Generating download URL for: s3://${config.bucketName}/${key}`);
  console.log(`⏰ Expiration: ${hours} hours`);

  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });

  console.log(`\n✅ Download URL:\n${url}`);
  return url;
}

// CLI usage
if (require.main === module) {
  const key = process.argv[2];
  const hours = parseInt(process.argv[3]) || config.defaultExpirationHours;

  if (!key) {
    console.error('Usage: node download-url.js <s3-key> [expiration-hours]');
    process.exit(1);
  }

  generateDownloadUrl(key, hours).catch(err => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  });
}

module.exports = { generateDownloadUrl };
