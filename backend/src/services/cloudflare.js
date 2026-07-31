/**
 * CLOUDFLARE R2 SERVICE
 * 
 * Servicio para gestionar archivos multimedia en Cloudflare R2
 * Compatible con S3 API usando AWS SDK v3
 * 
 * Responsabilidades:
 * - Subir archivos a R2 organizados por empresa
 * - Eliminar archivos de R2
 * - Generar URLs públicas para acceso
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const fs = require('fs');
const path = require('path');

// Configuración del cliente S3 para Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL;

/**
 * Determinar si un archivo es imagen o video según su MIME type
 * @param {string} mimeType - Tipo MIME del archivo
 * @returns {string} - 'images' o 'videos'
 */
const getMediaFolder = (mimeType) => {
  if (mimeType && mimeType.startsWith('image/')) {
    return 'images';
  }
  if (mimeType && mimeType.startsWith('video/')) {
    return 'videos';
  }
  return 'other';
};

/**
 * Construir el nombre de carpeta de la empresa
 * Formato: company-{id}-{name}
 * Sanitiza el nombre para evitar caracteres problemáticos en URLs
 * @param {number} companyId - ID de la empresa
 * @param {string} companyName - Nombre de la empresa
 * @returns {string} - Nombre de carpeta sanitizado
 */
const getCompanyFolder = (companyId, companyName) => {
  // Sanitizar nombre: remover caracteres especiales, espacios → guiones
  const sanitizedName = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return `company-${companyId}-${sanitizedName}`;
};

/**
 * Subir archivo a Cloudflare R2
 * Estructura: company-{id}-{name}/images/filename.ext
 *             company-{id}-{name}/videos/filename.ext
 * 
 * @param {Object} file - Objeto de archivo de multer
 * @param {number} companyId - ID de la empresa
 * @param {string} companyName - Nombre de la empresa
 * @returns {Promise<string>} - Key del archivo en R2
 */
const uploadToR2 = async (file, companyId, companyName) => {
  try {
    const companyFolder = getCompanyFolder(companyId, companyName);
    const mediaFolder = getMediaFolder(file.mimetype);
    
    // Key formato: company-2-versat/images/uuid-abc123.jpg
    const key = `${companyFolder}/${mediaFolder}/${file.filename}`;

    // Leer archivo desde el sistema local
    const uploadDir = path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || './uploads');
    const filePath = path.join(uploadDir, file.filename);
    const fileStream = fs.createReadStream(filePath);

    // Configurar upload con multipart para archivos grandes
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileStream,
        ContentType: file.mimetype,
      },
    });

    // Ejecutar upload
    await upload.done();

    console.log(`✅ Archivo subido a R2: ${key}`);
    return key;
  } catch (error) {
    console.error('❌ Error al subir archivo a R2:', error);
    throw new Error(`Error al subir a Cloudflare R2: ${error.message}`);
  }
};

/**
 * Eliminar archivo de Cloudflare R2
 * @param {string} cloudflareKey - Key del archivo en R2
 * @returns {Promise<boolean>} - true si se eliminó exitosamente
 */
const deleteFromR2 = async (cloudflareKey) => {
  try {
    if (!cloudflareKey) {
      console.warn('⚠️ No se proporcionó cloudflare_key para eliminar');
      return false;
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: cloudflareKey,
    });

    await s3Client.send(command);
    console.log(`✅ Archivo eliminado de R2: ${cloudflareKey}`);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar archivo de R2:', error);
    // No lanzar error para no bloquear la eliminación local
    return false;
  }
};

/**
 * Construir URL pública para acceder al archivo desde R2
 * @param {string} cloudflareKey - Key del archivo en R2
 * @returns {string} - URL pública completa
 */
const getPublicUrl = (cloudflareKey) => {
  if (!cloudflareKey) return null;
  // Formato: https://pub-xxx.r2.dev/company-2-versat/images/uuid.jpg
  return `${PUBLIC_URL}/${cloudflareKey}`;
};

/**
 * Verificar configuración de Cloudflare R2
 * @returns {boolean} - true si todas las variables están configuradas
 */
const isR2Configured = () => {
  return !!(
    process.env.CLOUDFLARE_R2_ENDPOINT_URL &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_BUCKET_NAME &&
    process.env.CLOUDFLARE_R2_PUBLIC_URL
  );
};

module.exports = {
  uploadToR2,
  deleteFromR2,
  getPublicUrl,
  isR2Configured,
};
