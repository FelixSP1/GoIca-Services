import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

//Funcion crear usuario
export const register = async (req, res) => {
  const { nombreUsuario, ApellidoPa, ApellidoMa, Email, Password, Telefono } = req.body;

  if (!nombreUsuario || !Email || !Password) {
    return res.status(400).json({ message: "Por favor, proporciona nombre, email y contraseña." });
  }

  try {
    //Definimos Rol 1
    const ROL_BASE = 1;

    // Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(Password, salt);

    // Guardar en la base de datos
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombreUsuario, ApellidoPa, ApellidoMa, Email, Password, Telefono, idRol) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nombreUsuario, ApellidoPa, ApellidoMa, Email, hashedPassword, Telefono, ROL_BASE]
    );

    //Creacion del Puntaje
    await pool.query('INSERT INTO puntajes (idUsuario, puntajeTotal) VALUES (?, 0)', [result.insertId]);

    res.status(201).json({ id: result.insertId, message: "Usuario registrado exitosamente." });
  } catch (error) {
    // Manejar error de email duplicado
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: "El email ya está registrado." });
    }
    res.status(500).json({ message: "Error en el servidor.", error: error.message });
  }
};

// Función para iniciar sesión
export const login = async (req, res) => {
  const { Email, Password } = req.body;

  // DIAGNÓSTICO: Ver qué datos llegan
    console.log("👉 Login intentado con:", { Email, Password });
    console.log("👉 JWT_SECRET existe?", !!process.env.JWT_SECRET);

  if (!Email || !Password) {
    return res.status(400).json({ message: "Por favor, proporciona email y contraseña." });
  }

  try {

    // Buscar usuario por email
    console.log("⏳ Buscando usuario en DB...");
    const [users] = await pool.query(
      'SELECT u.*, r.nombreRol FROM usuarios u JOIN roles r ON u.idRol = r.idRol WHERE u.Email = ?', [Email]);

    if (users.length === 0) {
      console.log("❌ Usuario no encontrado");
      return res.status(401).json({ message: "Credenciales inválidas." }); // Usuario no encontrado
    }

    const user = users[0];

    // Comparar la contraseña ingresada con la encriptada en la BD
    const isMatch = await bcrypt.compare(Password, user.Password);

    if (!isMatch) {
      console.log("❌ Contraseña incorrecta");
      return res.status(401).json({ message: "Credenciales inválidas." }); // Contraseña incorrecta
    }

    // Si todo es correcto, crear el token JWT
    // Crear token
    console.log("⏳ Generando Token...");
    const payload = {
      id: user.idUsuario,
      nombre: user.nombreUsuario,
      rol: user.nombreRol
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1h' // El token expira en 1 hora
    });

    res.json({
      message: "Inicio de sesión exitoso.",
      token: token
    });

  } catch (error) {
    // ESTO ES LO QUE NECESITAMOS VER EN EL LOG:
    console.error("🔴 ERROR CRÍTICO EN LOGIN:", error);
    res.status(500).json({ message: "Error en el servidor.", error: error.message });
  }
};
