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

  if (!Email || !Password) {
    return res.status(400).json({ message: "Por favor, proporciona email y contraseña." });
  }

  try {

    // Buscar usuario por email
    const [users] = await pool.query(
      'SELECT u.*, r.nombreRol FROM Usuarios u JOIN roles r ON u.idRol = r.idRol WHERE u.Email = ?', [Email]);

    if (users.length === 0) {
      return res.status(401).json({ message: "Credenciales inválidas." }); // Usuario no encontrado
    }

    const user = users[0];

    // Comparar la contraseña ingresada con la encriptada en la BD
    const isMatch = await bcrypt.compare(Password, user.Password);

    if (!isMatch) {
      return res.status(401).json({ message: "Credenciales inválidas." }); // Contraseña incorrecta
    }

    // Si todo es correcto, crear el token JWT
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
    res.status(500).json({ message: "Error en el servidor.", error: error.message });
  }
};

//Funcion para Actualizar Informacion
export const updateProfile = async (req, res) => {
  // 1. Obtenemos el ID del usuario directamente del token.
  // Esto es seguro porque el middleware 'authRequired' ya lo validó.
  const idUsuario = req.user.id;

  // 2. Obtenemos los nuevos datos del cuerpo de la petición.
  const { nombreUsuario, ApellidoPa, ApellidoMa, Email, telefono } = req.body;

  // 3. Validación simple
  if (!nombreUsuario || !Email) {
    return res.status(400).json({ message: "El nombre y el email son obligatorios." });
  }

  try {
    // 4. Ejecutamos la consulta SQL UPDATE
    await pool.query(
      `UPDATE usuarios SET 
         nombreUsuario = ?, 
         ApellidoPa = ?, 
         ApellidoMa = ?, 
         Email = ?, 
         telefono = ? 
       WHERE idUsuario = ?`,
      [nombreUsuario, ApellidoPa, ApellidoMa, Email, telefono, idUsuario]
    );

    // 5. (Opcional) Devolvemos los datos actualizados para confirmar
    const [rows] = await pool.query(
      'SELECT idUsuario, nombreUsuario, ApellidoPa, ApellidoMa, Email, telefono FROM usuarios WHERE idUsuario = ?',
      [idUsuario]
    );

    res.json({
      message: "Perfil actualizado exitosamente.",
      user: rows[0]
    });

  } catch (error) {
    // 6. Manejamos errores comunes, como un email duplicado
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: "El email que intentas usar ya está registrado." });
    }
    console.error(error);
    res.status(500).json({ message: "Error en el servidor.", error: error.message });
  }
};