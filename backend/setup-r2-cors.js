/**
 * Script para configurar CORS en Cloudflare R2
 * Permite que el navegador descargue archivos desde R2
 */

require('dotenv').config();
const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;

(async () => {
  try {
    console.log(`📦 Configurando CORS para bucket: ${BUCKET_NAME}`);
    
    const command = new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ['*'], // Permitir todos los orígenes
            AllowedMethods: ['GET', 'HEAD'], // Solo lectura
            AllowedHeaders: ['*'],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    });

    await s3Client.send(command);
    
    console.log('✅ CORS configurado exitosamente');
    console.log('📝 Configuración aplicada:');
    console.log('   - AllowedOrigins: * (todos)');
    console.log('   - AllowedMethods: GET, HEAD');
    console.log('   - MaxAge: 3600 segundos');
    console.log('\n💡 Ahora el player debería poder descargar videos desde R2');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error configurando CORS:', error);
    console.error('\n💡 Si el error persiste, configura CORS manualmente desde el dashboard de Cloudflare:');
    console.error('   1. Ve a Cloudflare Dashboard → R2');
    console.error(`   2. Selecciona el bucket: ${BUCKET_NAME}`);
    console.error('   3. Ve a Settings → CORS Policy');
    console.error('   4. Agrega la regla CORS con AllowedOrigins: * y AllowedMethods: GET, HEAD');
    process.exit(1);
  }
})();
