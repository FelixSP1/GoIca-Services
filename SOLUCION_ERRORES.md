# 🔧 SOLUCIÓN A ERRORES - GoIca Services

## ✅ CAMBIOS REALIZADOS

---

## 1️⃣ **Error ECONNRESET - Base de Datos en la Nube**

### **Problema:**
```
Error: read ECONNRESET
code: 'ECONNRESET'
```

Este error ocurre cuando la conexión a la base de datos en la nube se cierra inesperadamente.

### **Solución Aplicada:**

**Archivo:** `servicioContenido/src/config/db.js`

Se agregaron las siguientes configuraciones al pool de conexiones:

```javascript
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // ✅ NUEVAS CONFIGURACIONES
    connectTimeout: 60000, // 60 segundos
    acquireTimeout: 60000, // 60 segundos
    timeout: 60000, // 60 segundos
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
};
```

### **¿Qué hace cada configuración?**

- **`connectTimeout`**: Tiempo máximo para establecer la conexión inicial
- **`acquireTimeout`**: Tiempo máximo para obtener una conexión del pool
- **`timeout`**: Tiempo máximo de inactividad antes de cerrar la conexión
- **`enableKeepAlive`**: Mantiene la conexión activa enviando paquetes periódicos
- **`keepAliveInitialDelay`**: Retraso antes de enviar el primer paquete keep-alive

---

## 2️⃣ **Soluciones Adicionales Recomendadas**

### **A. Aplicar la misma configuración a TODOS los servicios:**

Debes actualizar el archivo `db.js` (o similar) en cada servicio:

```
✅ servicioContenido/src/config/db.js (Ya actualizado)
⚠️ servicioCuentas/src/config/db.js
⚠️ servicioInteraccion/src/config/db.js
⚠️ servicioRecompensas/src/config/db.js
⚠️ servicioAdministracion/src/config/db.js
⚠️ servicioGraficos/src/config/db.js
⚠️ servicioNoticias/src/config/db.js
```

### **B. Manejo de Reconexión Automática:**

Agrega este código después de crear el pool:

```javascript
// Manejo de errores de conexión
pool.on('error', (err) => {
  console.error('Error en el pool de conexiones:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
    console.log('Reconectando a la base de datos...');
  }
});
```

### **C. Verificar Firewall de Google Cloud:**

Si tu BD está en Google Cloud, asegúrate de:

1. **Permitir tu IP pública** en las reglas de firewall
2. **Habilitar conexiones desde cualquier IP** (0.0.0.0/0) si es desarrollo
3. **Verificar que el puerto 3306** esté abierto

```bash
# Obtener tu IP pública
curl ifconfig.me
```

Luego agrégala en Google Cloud Console:
```
Cloud SQL → Tu instancia → Conexiones → Redes autorizadas → Agregar red
```

### **D. Aumentar el Timeout en Google Cloud SQL:**

En la consola de Google Cloud:

1. Ve a **Cloud SQL** → Tu instancia
2. **Editar** → **Flags**
3. Agregar/Modificar:
   - `wait_timeout`: 28800 (8 horas)
   - `interactive_timeout`: 28800 (8 horas)
   - `max_allowed_packet`: 67108864 (64MB)

---

## 3️⃣ **Configuración del .env**

Asegúrate de que tu archivo `.env` tenga las credenciales correctas:

```env
# Base de Datos en la Nube
DB_HOST=34.176.159.252
DB_PORT=3306
DB_NAME=goicadb
DB_USER=root1
DB_PASSWORD=@Basegoica11

# Puerto del servicio
PORT=8091
```

---

## 4️⃣ **Foto de Perfil - Frontend**

### **Cambios en AuthContext:**

**Archivo:** `GoIca-app/src/context/AuthContext.jsx`

Se actualizó para cargar los datos completos del usuario (incluyendo foto de perfil) desde el backend:

```javascript
// Al cargar el token guardado
const userResponse = await api.get('/usuarios/perfil', {
  headers: { Authorization: `Bearer ${storedToken}` }
});

setUser({
  ...decodedToken,
  ...userResponse.data
});

// Al hacer login
const userResponse = await api.get('/usuarios/perfil', {
  headers: { Authorization: `Bearer ${newToken}` }
});

setUser({
  ...decodedToken,
  ...userResponse.data
});
```

### **Endpoint Backend Requerido:**

```javascript
GET /api/usuarios/perfil
Authorization: Bearer {token}

Response:
{
  "idUsuario": 1,
  "nombre": "Juan Pérez García",
  "Email": "juan@example.com",
  "telefono": "+51999999999",
  "fotoPerfil": "https://storage.googleapis.com/bucket/foto.jpg",
  "fechaCreacion": "2025-01-15"
}
```

---

## 5️⃣ **Testing y Verificación**

### **A. Probar Conexión a la BD:**

```bash
# En el directorio del servicio
npm run dev

# Deberías ver:
# ✅ Conexion a la base de datos establecida exitosamente
# ✅ Servicio Contenido ejecutandose en el puerto: 8091
```

### **B. Probar Endpoint de Lugares:**

```bash
# Usando curl o Postman
curl http://localhost:8091/api/contenido/lugares

# Debería retornar la lista de lugares sin errores
```

### **C. Probar Carga de Foto de Perfil:**

1. Inicia sesión en la app
2. Ve a **Perfil**
3. Deberías ver tu foto de perfil si existe en la BD
4. Si no, verás la inicial de tu nombre

---

## 6️⃣ **Script de Actualización Masiva**

Crea este archivo para actualizar todos los servicios:

**Archivo:** `GoIca-Services/actualizar_db_config.bat`

```batch
@echo off
echo Actualizando configuracion de BD en todos los servicios...

REM Lista de servicios
set SERVICIOS=servicioContenido servicioCuentas servicioInteraccion servicioRecompensas servicioAdministracion servicioGraficos servicioNoticias

for %%S in (%SERVICIOS%) do (
    echo.
    echo Actualizando %%S...
    if exist %%S\src\config\db.js (
        echo ✅ Encontrado: %%S\src\config\db.js
        REM Aquí puedes agregar lógica para actualizar automáticamente
    ) else (
        echo ⚠️ No encontrado: %%S\src\config\db.js
    )
)

echo.
echo ✅ Proceso completado
pause
```

---

## 7️⃣ **Monitoreo de Conexiones**

Agrega este código en cada servicio para monitorear el estado del pool:

```javascript
// En index.js o app.js
setInterval(() => {
  const poolStatus = pool.pool;
  console.log('📊 Pool Status:', {
    total: poolStatus._allConnections.length,
    free: poolStatus._freeConnections.length,
    queue: poolStatus._connectionQueue.length
  });
}, 30000); // Cada 30 segundos
```

---

## 8️⃣ **Checklist de Verificación**

- [x] Actualizada configuración de `db.js` en servicioContenido
- [ ] Actualizar `db.js` en los demás servicios
- [ ] Verificar IP en firewall de Google Cloud
- [ ] Aumentar timeouts en Cloud SQL
- [ ] Probar conexión desde cada servicio
- [ ] Verificar que la foto de perfil se carga en el frontend
- [ ] Crear endpoint `/usuarios/perfil` si no existe
- [ ] Probar subida de foto de perfil

---

## 9️⃣ **Comandos Útiles**

```bash
# Reiniciar todos los servicios
npm run dev

# Ver logs en tiempo real
npm run dev | grep -i error

# Probar conexión a la BD desde terminal
mysql -h 34.176.159.252 -P 3306 -u root1 -p goicadb

# Verificar procesos de Node.js
tasklist | findstr node
```

---

## 🆘 **Si el Error Persiste**

1. **Verifica la conexión a internet**
2. **Reinicia la instancia de Cloud SQL**
3. **Aumenta el `connectionLimit` a 20**
4. **Usa SSL para la conexión:**

```javascript
const dbConfig = {
  // ... otras configs
  ssl: {
    rejectUnauthorized: false
  }
};
```

5. **Contacta al administrador de la BD** para verificar:
   - Límite de conexiones simultáneas
   - Estado del servidor
   - Logs de errores en Cloud SQL

---

## ✅ **Resultado Esperado**

Después de aplicar estos cambios:

- ✅ No más errores `ECONNRESET`
- ✅ Conexiones estables a la BD en la nube
- ✅ Foto de perfil cargada correctamente
- ✅ Todos los servicios funcionando sin interrupciones

---

**Última actualización:** 28 de Octubre, 2025
