# 🚀 Scripts de Inicialización de Servicios GoIca

## 📋 Opciones Disponibles

Tienes **4 opciones** para iniciar los servicios, cada una con diferentes ventajas:

---

## 1️⃣ `iniciar_servicios_simple.bat` ⭐ **RECOMENDADO**

### **Descripción:**
Inicia todos los servicios en **segundo plano** (sin ventanas visibles) y guarda los logs en archivos.

### **Ventajas:**
- ✅ **Una sola ventana** de control
- ✅ Sin ventanas molestas
- ✅ Logs guardados en archivos
- ✅ Fácil de detener (presiona cualquier tecla)

### **Cómo usar:**
```bash
# Doble clic en el archivo o ejecutar:
iniciar_servicios_simple.bat
```

### **Ver logs:**
Los logs se guardan en archivos `logs_*.log` en la raíz del proyecto:
- `logs_cuentas.log`
- `logs_contenido.log`
- `logs_interaccion.log`
- etc.

Puedes abrirlos con cualquier editor de texto o usar:
```bash
# Ver logs en tiempo real (requiere Git Bash o WSL)
tail -f logs_*.log
```

---

## 2️⃣ `iniciar_servicios_minimizado.bat`

### **Descripción:**
Inicia todos los servicios en **ventanas minimizadas** en la barra de tareas.

### **Ventajas:**
- ✅ Ventanas minimizadas (no ocupan espacio)
- ✅ Puedes ver logs individuales haciendo clic en cada ventana
- ✅ Fácil de identificar cada servicio

### **Cómo usar:**
```bash
iniciar_servicios_minimizado.bat
```

### **Ver logs:**
Haz clic en los iconos de CMD en la barra de tareas para ver cada servicio.

---

## 3️⃣ `iniciar_servicios_terminal.bat` ⭐⭐ **MÁS PROFESIONAL**

### **Descripción:**
Inicia todos los servicios en **una sola ventana de Windows Terminal** con pestañas.

### **Requisitos:**
- Windows Terminal instalado (desde Microsoft Store)

### **Ventajas:**
- ✅ **Una sola ventana** con múltiples pestañas
- ✅ Interfaz moderna y profesional
- ✅ Fácil navegación con `Ctrl + Tab`
- ✅ Logs visibles en tiempo real

### **Cómo usar:**
```bash
iniciar_servicios_terminal.bat
```

### **Navegación:**
- `Ctrl + Tab`: Cambiar entre pestañas
- `Ctrl + Shift + T`: Nueva pestaña
- `Ctrl + W`: Cerrar pestaña actual

---

## 4️⃣ `iniciar_servicios.ps1` 🚀 **MÁS AVANZADO**

### **Descripción:**
Script PowerShell con **panel de control interactivo** para gestionar servicios.

### **Ventajas:**
- ✅ Panel de control interactivo
- ✅ Ver logs de cualquier servicio
- ✅ Ver estado de servicios
- ✅ Control total desde una ventana

### **Cómo usar:**
```powershell
# Ejecutar en PowerShell:
.\iniciar_servicios.ps1
```

### **Comandos disponibles:**
- `L`: Ver logs de un servicio específico
- `S`: Ver estado de todos los servicios
- `Q`: Detener todos los servicios y salir

### **Nota de Seguridad:**
Si te sale un error de permisos, ejecuta esto en PowerShell como Administrador:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 📊 Comparación Rápida

| Característica | Simple | Minimizado | Terminal | PowerShell |
|----------------|--------|------------|----------|------------|
| **Ventanas** | 1 | 8 (minimizadas) | 1 | 1 |
| **Logs en archivos** | ✅ | ❌ | ❌ | ✅ |
| **Logs en tiempo real** | ❌ | ✅ | ✅ | ✅ |
| **Fácil de usar** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Profesional** | ⭐⭐ | ⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Control avanzado** | ❌ | ❌ | ❌ | ✅ |

---

## 🎯 Recomendaciones

### **Para uso diario:**
→ `iniciar_servicios_simple.bat` o `iniciar_servicios_terminal.bat`

### **Para debugging:**
→ `iniciar_servicios_minimizado.bat` (ver logs individuales)

### **Para desarrollo avanzado:**
→ `iniciar_servicios.ps1` (control total)

---

## 🛑 Detener Servicios

### **Opción Simple/Terminal:**
- Presiona cualquier tecla en la ventana del script

### **Opción Minimizado:**
- Cierra cada ventana manualmente
- O ejecuta: `taskkill /F /IM node.exe`

### **Opción PowerShell:**
- Presiona `Q` en el panel de control

---

## 📝 Notas

- Todos los scripts verifican si Docker está corriendo y lo inician si es necesario
- Los servicios se inician con un delay de 2 segundos entre cada uno
- LibreTranslate se inicia con los idiomas: es, en, de, fr, pt

---

## 🔧 Personalización

Puedes editar cualquier script para:
- Cambiar el orden de inicio
- Agregar/quitar servicios
- Modificar los delays
- Cambiar los idiomas de LibreTranslate

---

**Última actualización:** 18 de octubre de 2025
