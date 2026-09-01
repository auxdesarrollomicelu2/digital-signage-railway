-- Agregar dimensiones y duración a la tabla Media
ALTER TABLE digital_signage."Media" 
ADD COLUMN IF NOT EXISTS width INTEGER,
ADD COLUMN IF NOT EXISTS height INTEGER,
ADD COLUMN IF NOT EXISTS duration DOUBLE PRECISION;

-- Verificar columnas agregadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'digital_signage' 
AND table_name = 'Media'
ORDER BY ordinal_position;
