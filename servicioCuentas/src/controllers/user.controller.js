import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';
import cloudinary from "../config/cloudinary.js";


//Funcion Obtener informacion del User
export const getUserProfile = async (req, res) => {
  try {
    const idUsuario = req.user.id;
    const [rows] = await pool.query(
      'SELECT idUsuario, nombreUsuario, ApellidoPa, ApellidoMa, Email, telefono, fotoPerfil FROM usuarios WHERE idUsuario = ?',
      [idUsuario]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no Encontrado' });
    }
    const userData = {
      ...rows[0],
      nombreUsuario: rows[0].nombreUsuario || '',
      ApellidoPa: rows[0].ApellidoPa || '',
      ApellidoMa: rows[0].ApellidoMa || '',
      telefono: rows[0].telefono || '',
      fotoPerfil: rows[0].fotoPerfil || '' // Uncomment if you add this column
    };
    res.json(userData);
  } catch (error) {
    console.error("Error buscando el perfil del Usuario:", error);
    res.status(500).json({ message: 'Error en el Servidor', error: error.message })
  }
}

//Funcion para Actualizar Informacion
export const updateProfile = async (req, res) => {
  // 1. Obtenemos el ID del usuario directamente del token.
  // Esto es seguro porque el middleware 'authRequired' ya lo validó.
  const idUsuario = req.user.id;

  // 2. Obtenemos los nuevos datos del cuerpo de la petición.
  const { nombreUsuario, ApellidoPa, ApellidoMa, telefono, fotoPerfil, currentPassword, newPassword } = req.body;

  // 3. Validación simple
  if (!nombreUsuario) {
    return res.status(400).json({ message: "El nombre es obligatorio." });
  }

  let updatePassword = false;
  let hashedNewPassword = '';

  if (currentPassword && newPassword) { // This condition now works correctly
    // Basic validation for new password length (add more if needed)
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "La nueva contraseña debe tener al menos 8 caracteres." });
    }
    try {
      // Fetch current hash (No need for transaction just for this read)
      const [users] = await pool.query('SELECT Password FROM usuarios WHERE idUsuario = ?', [idUsuario]);
      if (users.length === 0) {
        return res.status(404).json({ message: "Usuario no encontrado" }); // Should not happen if token is valid
      }
      const currentHashedPassword = users[0].Password;

      // Compare
      const isMatch = await bcrypt.compare(currentPassword, currentHashedPassword);
      if (!isMatch) {
        return res.status(401).json({ message: "La contraseña actual es incorrecta." });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      hashedNewPassword = await bcrypt.hash(newPassword, salt);
      updatePassword = true;

    } catch (passwordError) {
      console.error("Error during password verification/hashing:", passwordError);
      return res.status(500).json({ message: "Error al procesar la contraseña.", error: passwordError.message });
    }
  }

  try {
    // Build UPDATE query dynamically
    let sql = `UPDATE usuarios SET 
                 nombreUsuario = ?, 
                 ApellidoPa = ?, 
                 ApellidoMa = ?, 
                 telefono = ?,
                 fotoPerfil = ?`; // Use Telefono if that's the column name
    let params = [nombreUsuario, ApellidoPa, ApellidoMa, telefono, fotoPerfil];

    if (updatePassword) {
      sql += `, Password = ?`;
      params.push(hashedNewPassword);
    }
    sql += ` WHERE idUsuario = ?`;
    params.push(idUsuario);

    await pool.query(sql, params); // Execute update

    // Fetch updated data (excluding password) to return
    const [updatedUserRows] = await pool.query(
      'SELECT idUsuario, nombreUsuario, ApellidoPa, ApellidoMa, Email, telefono, fotoPerfil FROM usuarios WHERE idUsuario = ?',
      [idUsuario]
    );

    res.json({
      message: "Perfil actualizado exitosamente.",
      user: updatedUserRows[0] // Return updated user data
    });

  } catch (error) {
    // Handle specific DB errors if needed (like duplicate email if it were changeable)
    console.error("Error updating profile in DB:", error);
    res.status(500).json({ message: "Error en el servidor al guardar.", error: error.message });
  }
};

export const uploadUserProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No se ha subido ningún archivo." });
        }

        // Optional: Get user ID if needed for folder structure, etc.
        // const idUsuario = req.user.id;

        // Convert buffer to base64 data URL for Cloudinary
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        // Upload to Cloudinary (adjust folder as needed)
        const result = await cloudinary.uploader.upload(base64Image, {
            folder: "goica/profiles" // Specific folder for profile pictures
            // public_id: `user_${idUsuario}_profile`, // Optional: Custom public ID
            // overwrite: true // Optional: Replace existing image with same public_id
        });

        // Return the secure URL provided by Cloudinary
        res.json({ imageUrl: result.secure_url });

    } catch (error) {
        console.error("Error al subir imagen de perfil:", error);
        res.status(500).json({ message: "Error al subir la imagen", error: error.message });
    }
};