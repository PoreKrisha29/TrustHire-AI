const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { env } = require('./env');
const fs = require('fs');
const path = require('path');

let isMock = false;
const uploadsDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Detect if S3 credentials are local defaults and endpoint is localhost (which is down since Docker is not running)
if (!env.AWS_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID === 'trusthire_minio') {
  isMock = true;
  console.log('ℹ️ AWS S3/MinIO running in local folder mock mode');
}

const s3ClientConfig = {
  region: env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID || 'mock',
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || 'mock',
  },
};

if (env.AWS_S3_ENDPOINT) {
  s3ClientConfig.endpoint = env.AWS_S3_ENDPOINT;
  s3ClientConfig.forcePathStyle = true;
}

const s3Client = !isMock ? new S3Client(s3ClientConfig) : null;
const S3_BUCKET = env.AWS_S3_BUCKET || 'trusthire-files';

/**
 * Upload a file buffer to S3 or local directory.
 */
async function uploadToS3(key, body, contentType) {
  if (isMock) {
    const filePath = path.join(uploadsDir, key);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, body);
    console.log(`ℹ️ Local Storage: Uploaded ${key}`);
    return key;
  }
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    return key;
  } catch (err) {
    console.warn('⚠️ S3 Upload failed. Falling back to local storage. Error:', err.message);
    isMock = true;
    return uploadToS3(key, body, contentType);
  }
}

/**
 * Generate a pre-signed GET URL for a private S3 object or local route.
 */
async function getPresignedUrl(key, expiresIn = 900) {
  if (isMock) {
    // Return relative URL pointing to our local express server uploads endpoint
    return `${env.FRONTEND_URL.replace('3000', '3001')}/uploads/${key}`;
  }
  try {
    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (err) {
    console.warn('⚠️ S3 Presigned URL generation failed. Falling back to local URL.');
    isMock = true;
    return `${env.FRONTEND_URL.replace('3000', '3001')}/uploads/${key}`;
  }
}

/**
 * Delete an object from S3 or local directory.
 */
async function deleteFromS3(key) {
  if (isMock) {
    const filePath = path.join(uploadsDir, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`ℹ️ Local Storage: Deleted ${key}`);
    }
    return;
  }
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
  } catch (err) {
    console.warn('⚠️ S3 Delete failed. Falling back to local delete.');
    isMock = true;
    const filePath = path.join(uploadsDir, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

module.exports = { s3Client, S3_BUCKET, uploadToS3, getPresignedUrl, deleteFromS3 };

