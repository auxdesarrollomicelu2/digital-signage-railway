/**
 * Script para reintentar videos en estado pending
 * Encola nuevamente los jobs para renders que quedaron en pending
 */

require('dotenv').config();
const { MediaRender } = require('./src/models');
const { videoQueue } = require('./src/config/queue');

(async () => {
  try {
    console.log('🔍 Buscando renders en estado pending...');
    
    const pendingRenders = await MediaRender.findAll({
      where: { status: 'pending' }
    });

    if (pendingRenders.length === 0) {
      console.log('✅ No hay renders pendientes');
      process.exit(0);
    }

    console.log(`📋 Encontrados ${pendingRenders.length} renders pendientes:`);
    pendingRenders.forEach(r => {
      console.log(`   - Render ${r.id}: media ${r.media_id}, ${r.width}x${r.height}, rot${r.rotation}°`);
    });

    console.log('\n🔄 Encolando jobs nuevamente...');
    
    for (const render of pendingRenders) {
      await videoQueue.add('process-video', {
        mediaId: render.media_id,
        renderId: render.id,
        width: render.width,
        height: render.height,
        rotation: render.rotation
      });
      console.log(`✅ Job encolado para render ${render.id}`);
    }

    console.log('\n✅ Todos los jobs han sido encolados');
    console.log('💡 Asegúrate de que el worker esté corriendo: npm run worker');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
