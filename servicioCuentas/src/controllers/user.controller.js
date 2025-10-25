import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

//Futuras Adiciones para Usuario