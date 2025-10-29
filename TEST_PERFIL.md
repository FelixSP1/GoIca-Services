# 🧪 TEST - Endpoint de Perfil

## ⚠️ PROBLEMA DETECTADO

El Gateway está redirigiendo correctamente:
```
[GATEWAY] GET /api/usuarios/perfil
[Gateway] -> Cuentas: http://localhost:8082/api/usuarios/perfil
```

Pero el servicio de cuentas devuelve 404.

---

## 🔍 DIAGNÓSTICO

### **1. Verificar que el servicio de cuentas esté actualizado**

El servicio de cuentas debe tener los nuevos archivos:
- ✅ `src/routes/usuarios.routes.js`
- ✅ `src/controllers/usuarios.controller.js`
- ✅ `src/index.js` (con la ruta registrada)

### **2. Reiniciar el servicio de cuentas**

**IMPORTANTE:** Debes reiniciar el servicio después de agregar los archivos.

```bash
cd c:\Users\ASUS\Documents\GoIca-services\GoIca-Services\servicioCuentas

# Detener el servicio (Ctrl + C)
# Luego reiniciar:
npm run dev
```

### **3. Verificar logs del servicio de cuentas**

Deberías ver algo como:
```
Servicio Cuentas ejecutandose en el puerto 8082
```

---

## 🧪 PRUEBAS MANUALES

### **Paso 1: Obtener un token**

```bash
curl -X POST http://localhost:8089/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"Email\":\"tu@email.com\",\"Password\":\"tupassword\"}"
```

Respuesta esperada:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### **Paso 2: Probar endpoint de perfil**

```bash
curl http://localhost:8089/api/usuarios/perfil ^
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

Respuesta esperada:
```json
{
  "idUsuario": 1,
  "nombre": "Juan Pérez García",
  "Email": "juan@example.com",
  "telefono": "+51999999999",
  "fotoPerfil": "https://url-imagen.jpg",
  "fechaCreacion": "2025-01-15"
}
```

### **Paso 3: Probar directamente en el servicio (sin Gateway)**

```bash
curl http://localhost:8082/api/usuarios/perfil ^
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

Si esto funciona pero el Gateway no, el problema está en el Gateway.
Si esto NO funciona, el problema está en el servicio de cuentas.

---

## 🔧 SOLUCIONES POSIBLES

### **Solución 1: Reiniciar Servicio de Cuentas**

El servicio debe reiniciarse para cargar los nuevos archivos.

```bash
# En la terminal del servicio de cuentas
# Presiona Ctrl + C
# Luego:
npm run dev
```

### **Solución 2: Verificar que los archivos existan**

```bash
cd c:\Users\ASUS\Documents\GoIca-services\GoIca-Services\servicioCuentas

# Verificar archivos
dir src\routes\usuarios.routes.js
dir src\controllers\usuarios.controller.js
```

Si no existen, necesitas crearlos nuevamente.

### **Solución 3: Verificar imports en index.js**

**Archivo:** `servicioCuentas/src/index.js`

Debe tener:
```javascript
import usuariosRoutes from './routes/usuarios.routes.js';

// ...

app.use('/api/usuarios', usuariosRoutes);
```

### **Solución 4: Verificar que la BD tenga la columna fotoPerfil**

```sql
-- Conectarse a la BD
USE goicadb;

-- Verificar estructura de la tabla
DESCRIBE usuarios;

-- Si no existe la columna, agregarla:
ALTER TABLE usuarios ADD COLUMN fotoPerfil VARCHAR(500) NULL;
```

---

## 📋 CHECKLIST DE VERIFICACIÓN

- [ ] Archivos creados en servicioCuentas:
  - [ ] `src/routes/usuarios.routes.js`
  - [ ] `src/controllers/usuarios.controller.js`
- [ ] `src/index.js` actualizado con import y uso de usuariosRoutes
- [ ] Servicio de cuentas reiniciado
- [ ] Gateway reiniciado
- [ ] Columna `fotoPerfil` existe en la tabla `usuarios`
- [ ] Token JWT válido
- [ ] Endpoint responde correctamente

---

## 🆘 SI EL ERROR PERSISTE

### **Ver logs detallados del servicio de cuentas:**

Agrega logs en el controlador:

**Archivo:** `servicioCuentas/src/controllers/usuarios.controller.js`

```javascript
export const getPerfil = async (req, res) => {
    try {
        console.log('📍 getPerfil llamado');
        console.log('👤 Usuario del token:', req.user);
        
        const userId = req.user.idUsuario;
        console.log('🔍 Buscando usuario con ID:', userId);
        
        const [rows] = await pool.query(`
            SELECT 
                idUsuario,
                CONCAT(nombreUsuario, ' ', ApellidoPa, ' ', IFNULL(ApellidoMa, '')) as nombre,
                Email,
                telefono,
                fotoPerfil,
                fechaCreacion
            FROM usuarios
            WHERE idUsuario = ?
        `, [userId]);
        
        console.log('✅ Resultados:', rows);
        
        if (rows.length === 0) {
            console.log('❌ Usuario no encontrado');
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        console.log('✅ Enviando respuesta:', rows[0]);
        res.json(rows[0]);
    } catch (error) {
        console.error('❌ Error al obtener perfil:', error);
        res.status(500).json({ message: 'Error al obtener perfil del usuario' });
    }
};
```

---

## 🎯 ACCIÓN INMEDIATA

**REINICIA EL SERVICIO DE CUENTAS AHORA:**

1. Ve a la terminal donde corre el servicio de cuentas
2. Presiona `Ctrl + C`
3. Ejecuta: `npm run dev`
4. Verifica que diga: `Servicio Cuentas ejecutandose en el puerto 8082`
5. Prueba nuevamente desde la app

---

## 📞 COMANDO RÁPIDO DE PRUEBA

```bash
# Probar endpoint directamente (reemplaza el token)
curl http://localhost:8082/api/usuarios/perfil -H "Authorization: Bearer TU_TOKEN"
```

Si esto devuelve 404, el problema está en el servicio de cuentas.
Si esto funciona, el problema está en el Gateway.

---

**Última actualización:** 28 de Octubre, 2025 - 9:13 PM
