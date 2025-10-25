-- Script para verificar que las tablas existen y tienen las columnas correctas

-- 1. Verificar que la tabla usuarios existe y tiene nombreUsuario
DESCRIBE usuarios;

-- 2. Verificar que la tabla resenas existe
DESCRIBE resenas;

-- 3. Probar la consulta que está fallando (cambia el 1 por un ID real)
SELECT 
    r.idReview, 
    r.comentario, 
    r.calificacion, 
    r.fechaCreacion, 
    u.nombreUsuario 
FROM resenas r 
JOIN usuarios u ON r.idUsuario = u.idUsuario 
WHERE r.idLugar = 1 
ORDER BY r.fechaCreacion DESC;

-- 4. Ver todas las reseñas sin el JOIN (para verificar que existen)
SELECT * FROM resenas LIMIT 5;

-- 5. Ver todos los usuarios (para verificar que existen)
SELECT idUsuario, nombreUsuario FROM usuarios LIMIT 5;
