const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { ApkVersion } = require('../models');

// Lazy initialization of S3 client
let s3Client = null;
let BUCKET_NAME = null;

const getS3Client = () => {
  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT_URL,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
    });
    BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  }
  return { s3Client, BUCKET_NAME };
};

/**
 * Calculate SHA-256 checksum of a file
 * @param {string} filePath - Path to file
 * @returns {Promise<string>} - Hexadecimal hash
 */
const calculateSHA256 = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

/**
 * Upload APK file to R2 and create database record
 * @param {Object} file - Multer file object
 * @param {Object} body - Request body with version info
 * @param {Object} user - User context (role, companyId)
 * @returns {Promise<Object>} - Created APK version record
 */
const uploadApkFile = async (file, body, user) => {
  const { version_code, version_name, release_notes } = body;

  // Validations
  if (!version_code || !version_name) {
    throw new Error('version_code y version_name son requeridos');
  }

  if (user.role !== 'super_admin') {
    throw new Error('No tienes permiso para subir APKs');
  }

  // Check if version already exists
  const existingVersion = await ApkVersion.findOne({
    where: { version_code: parseInt(version_code) }
  });

  if (existingVersion) {
    throw new Error(`La versión ${version_code} ya existe`);
  }

  // Calculate checksum
  const uploadDir = path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || './uploads');
  const filePath = path.join(uploadDir, file.filename);
  const sha256 = await calculateSHA256(filePath);

  // Upload to R2 with immutable key
  const { s3Client, BUCKET_NAME } = getS3Client();
  const r2Key = `apk/player-${version_code}.apk`;
  const fileStream = fs.createReadStream(filePath);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: r2Key,
    Body: fileStream,
    ContentType: 'application/vnd.android.package-archive',
  });

  await s3Client.send(command);
  console.log(`✅ APK subido a R2: ${r2Key}`);

  // Deactivate all previous versions
  await ApkVersion.update(
    { is_active: false },
    { where: { is_active: true } }
  );

  // Create database record
  const version = await ApkVersion.create({
    version_code: parseInt(version_code),
    version_name,
    r2_key: r2Key,
    sha256,
    release_notes: release_notes || null,
    file_size_bytes: file.size,
    is_active: true,
    created_by: user.companyId,
  });

  // Delete local file after successful upload
  try {
    fs.unlinkSync(filePath);
    console.log(`✅ Archivo local eliminado: ${file.filename}`);
  } catch (err) {
    console.warn(`⚠️ No se pudo eliminar archivo local: ${err.message}`);
  }

  return {
    version: {
      id: version.id,
      version_code: version.version_code,
      version_name: version.version_name,
      r2_key: version.r2_key,
      sha256: version.sha256,
      file_size_bytes: version.file_size_bytes,
      release_notes: version.release_notes,
      is_active: version.is_active,
      created_at: version.created_at,
    },
  };
};

/**
 * Get signed download URL for an APK version
 * @param {string} versionId - APK version ID
 * @returns {Promise<string|null>} - Signed URL or null if not found
 */
const getDownloadUrl = async (versionId) => {
  const { s3Client, BUCKET_NAME } = getS3Client();
  const version = await ApkVersion.findByPk(versionId);

  if (!version || !version.is_active) {
    return null;
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: version.r2_key,
  });

  // Generate signed URL valid for 1 hour
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return signedUrl;
};

/**
 * Get latest active APK version
 * @returns {Promise<Object|null>} - Latest version or null
 */
const getLatestActiveVersion = async () => {
  const latest = await ApkVersion.findOne({
    where: { is_active: true },
    order: [['version_code', 'DESC']],
  });

  return latest;
};

/**
 * List all APK versions (super admin only)
 * @param {Object} context - User context
 * @returns {Promise<Array>} - List of versions
 */
const listVersions = async (context) => {
  if (context.role !== 'super_admin') {
    throw new Error('No tienes permiso para listar versiones');
  }

  const versions = await ApkVersion.findAll({
    order: [['version_code', 'DESC']],
    include: [
      {
        association: 'CreatedBy',
        attributes: ['id', 'name', 'username'],
      },
    ],
  });

  return versions;
};

module.exports = {
  uploadApkFile,
  getDownloadUrl,
  getLatestActiveVersion,
  listVersions,
};
