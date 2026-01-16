
CREATE TABLE inspecciones (
    id SERIAL PRIMARY KEY,
    planta VARCHAR(100) DEFAULT 'GREEN PACK SERVICE SPA', --
    productor VARCHAR(255),  -- Ejemplo: 0179-AGRICOLA EL RESGUARDO S.A
    lote VARCHAR(50),       -- Ejemplo: 18
    variedad VARCHAR(100),   -- Ejemplo: SANTINA
    calibre VARCHAR(20),     -- Ejemplo: 3JD
    peso_neto DECIMAL(10,2), -- Ejemplo: 5010 gr
    ss_promedio DECIMAL(5,2),-- Ejemplo: 14.00
    temp_pulpa DECIMAL(5,2), -- Ejemplo: 6.40
    nota_general INT,        -- Ejemplo: 4
    fecha_inspeccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE defectos (
    id SERIAL PRIMARY KEY,
    inspeccion_id INT REFERENCES inspecciones(id) ON DELETE CASCADE, -- Vincula el defecto al Lote
    nombre_defecto VARCHAR(100), -- Ejemplo: Pitting Punteadura, Virosis, Deforme
    porcentaje DECIMAL(5,2),     -- Ejemplo: 6.00, 4.00, 8.00
    foto_url TEXT                -- Ruta de la imagen en el servidor
);

-- Para ver si los defectos se amarraron correctamente
SELECT * FROM defectos;

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) DEFAULT 'inspector'
);

-- Insertamos un usuario de prueba (Contraseña: subsole123)
-- Nota: En producción las contraseñas deben ir encriptadas
INSERT INTO usuarios (nombre, email, password, rol) 
VALUES ('Admin QC', 'admin@subsole.cl', 'subsole123', 'admin')

-- Cambia el correo para el segundo usuario:
INSERT INTO usuarios (nombre, email, password, rol) 
VALUES ('Inspector Juan', 'juan@subsole.cl', 'juan123', 'inspector');

SELECT id, nombre, email, rol FROM usuarios;

ALTER TABLE inspecciones 
ADD COLUMN IF NOT EXISTS codigo_embalaje VARCHAR(100),
ADD COLUMN IF NOT EXISTS variedad VARCHAR(100),
ADD COLUMN IF NOT EXISTS calibre VARCHAR(50),
ADD COLUMN IF NOT EXISTS peso_neto DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS pitting_punteadura DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS pitting_adhesion DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS virosis DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS deforme DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS temperatura_pulpa DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS observaciones TEXT,
ADD COLUMN IF NOT EXISTS fotos TEXT[]; -- Para guardar las rutas de las imágenes

ALTER TABLE inspecciones 
ADD COLUMN IF NOT EXISTS nro_trypack VARCHAR(50),
ADD COLUMN IF NOT EXISTS peso_neto VARCHAR(50),
ADD COLUMN IF NOT EXISTS ss_promedio VARCHAR(50),
ADD COLUMN IF NOT EXISTS nota_general VARCHAR(20),
ADD COLUMN IF NOT EXISTS nota_apariencia VARCHAR(20),
ADD COLUMN IF NOT EXISTS nota_calidad VARCHAR(20),
ADD COLUMN IF NOT EXISTS nota_condicion VARCHAR(20);

ALTER TABLE inspecciones 
ALTER COLUMN peso_neto TYPE VARCHAR(50);

DROP TABLE IF EXISTS inspecciones;

DROP TABLE IF EXISTS inspecciones CASCADE;

CREATE TABLE inspecciones (
    id SERIAL PRIMARY KEY,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    productor VARCHAR(100),
    lote VARCHAR(50),
    variedad VARCHAR(50),
    calibre VARCHAR(50),
    cod_embalaje VARCHAR(50),
    embalaje VARCHAR(50),
    fecha_embalaje VARCHAR(50),
    nro_frutos VARCHAR(20),
    apariencia VARCHAR(20), 
    peso_neto VARCHAR(20),
    ss_promedio VARCHAR(20),
    pitting_punhead VARCHAR(10), -- Este es el nombre correcto
    pitting_adhesion VARCHAR(10),
    virosis VARCHAR(10),
    nota_condicion VARCHAR(20),
    deforme VARCHAR(10),
    mezcla_color VARCHAR(20),
    nota_calidad VARCHAR(20),
    t_agua_diping VARCHAR(20),
    t_ambiente VARCHAR(20),
    t_pulpa_embalada VARCHAR(20),
    nota_general VARCHAR(20),
    fotos TEXT[]
);

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) DEFAULT 'inspector'
);

-- 1. Borramos los usuarios de la empresa anterior para no confundirnos
DELETE FROM usuarios;

-- 2. Insertamos el Administrador de Insproduce
INSERT INTO usuarios (nombre, email, password, rol) 
VALUES ('Admin Insproduce', 'admin@insproduce.cl', 'insproduce123', 'admin');

-- 3. Insertamos el Inspector (Trabajador)
INSERT INTO usuarios (nombre, email, password, rol) 
VALUES ('Inspector Calidad', 'inspector@insproduce.cl', 'calidad123', 'inspector');

-- 4. Verificamos que todo esté correcto
SELECT * FROM usuarios;

CREATE TABLE asignaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id),
    productor VARCHAR(100),
    lote VARCHAR(50) NOT NULL,
    variedad VARCHAR(50),
    estado VARCHAR(20) DEFAULT 'pendiente', -- 'pendiente', 'completada'
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notas_admin TEXT
);

SELECT id, nombre, email, password, rol FROM usuarios;