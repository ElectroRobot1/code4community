import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// Cloudflare R2 Configuration
// Replace these with your actual Cloudflare R2 credentials
const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID || 'YOUR_CLOUDFLARE_ACCOUNT_ID',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || 'YOUR_ACCESS_KEY_ID',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'YOUR_SECRET_ACCESS_KEY',
  bucketName: process.env.R2_BUCKET_NAME || 'writing-center-files',
  region: 'auto' // Cloudflare R2 uses 'auto' for region
};

// Create S3 client configured for Cloudflare R2
const r2Client = new S3Client({
  region: R2_CONFIG.region,
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
});

/**
 * Upload a file to Cloudflare R2
 * @param {File} file - The file to upload
 * @param {string} key - The key (path) for the file in R2
 * @returns {Promise<string>} The URL of the uploaded file
 */
export async function uploadToR2(file, key) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    });

    await r2Client.send(command);

    // Return a public URL (you may need to configure R2 bucket for public access)
    // Or use a signed URL for private access
    return `https://pub-${R2_CONFIG.accountId}.r2.dev/${R2_CONFIG.bucketName}/${key}`;
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw new Error('Failed to upload file');
  }
}

/**
 * Get a file from Cloudflare R2
 * @param {string} key - The key (path) of the file in R2
 * @returns {Promise<Uint8Array>} The file data
 */
export async function getFromR2(key) {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
    });

    const response = await r2Client.send(command);
    const chunks = [];
    const stream = response.Body;

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Error getting from R2:', error);
    throw new Error('Failed to get file');
  }
}

export { r2Client, R2_CONFIG };
