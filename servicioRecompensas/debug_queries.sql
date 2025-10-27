-- QUERIES DE DEBUG PARA SERVICIOERECOMPENSAS

-- 1. Verificar si el usuario tiene un registro en la tabla socios
-- Reemplaza [TU_ID_USUARIO] con el ID del usuario que está intentando acceder
SELECT * FROM socios WHERE idUsuario = [TU_ID_USUARIO];

-- 2. Ver todos los socios registrados
SELECT * FROM socios;

-- 3. Verificar si existe la tabla socio_lugar
SHOW TABLES LIKE 'socio_lugar';

-- 4. Ver la estructura de la tabla socio_lugar
DESCRIBE socio_lugar;

-- 5. Ver todos los registros de socio_lugar
SELECT * FROM socio_lugar;

-- 6. Si necesitas crear un registro de socio para un usuario (ejemplo):
-- INSERT INTO socios (idUsuario, razonSocial, ruc, direccion, telefono) 
-- VALUES ([TU_ID_USUARIO], 'Mi Negocio', '12345678901', 'Av. Principal 123', '999999999');

-- 7. Verificar las tablas relacionadas
SHOW TABLES LIKE '%resena%';
SHOW TABLES LIKE '%recompensa%';

-- 8. Ver la estructura de la tabla usuarios para obtener el ID
SELECT idUsuario, nombreUsuario, Email, rol FROM usuarios;
