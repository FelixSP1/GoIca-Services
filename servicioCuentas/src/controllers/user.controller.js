import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';
import cloudinary from "../config/cloudinary.js";
import jwt from 'jsonwebtoken';


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
  const idUsuario = req.user.id;

  // 1. Obtener campos de texto de req.body (Multer los parsea)
  const { nombreUsuario, ApellidoPa, ApellidoMa, telefono, currentPassword, newPassword } = req.body;

  // 2. Obtener la URL de la foto existente (si el usuario no sube una nueva)
  // El frontend debe enviar la URL_actual si no se sube un archivo nuevo.
  let fotoPerfilUrl = req.body.fotoPerfil_url || req.body.fotoPerfil || null;

  if (!nombreUsuario) {
    return res.status(400).json({ message: "El nombre es obligatorio." });
  }

  try {
    // 3. Si se subió un archivo nuevo (req.file existe)
    if (req.file) {
      console.log("Subiendo nueva imagen de perfil a Cloudinary...");
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const uploadResult = await cloudinary.uploader.upload(base64Image, {
        folder: "goica/profiles",
        overwrite: true,
        resource_type: "image",
      });
      fotoPerfilUrl = uploadResult.secure_url; // Sobrescribe la URL
    }

    // 4. Lógica de contraseña (tu código actual está bien)
    let updatePassword = false;
    let hashedNewPassword = '';

    if (currentPassword && newPassword) {
      // ... (tu lógica de bcrypt.compare y bcrypt.hash) ...
      // (Asegúrate de que bcrypt esté importado)
      const [users] = await pool.query('SELECT Password FROM usuarios WHERE idUsuario = ?', [idUsuario]);
      if (users.length === 0) throw new Error("Usuario no encontrado");
      const isMatch = await bcrypt.compare(currentPassword, users[0].Password);
      if (!isMatch) return res.status(401).json({ message: "La contraseña actual es incorrecta." });
      const salt = await bcrypt.genSalt(10);
      hashedNewPassword = await bcrypt.hash(newPassword, salt);
      updatePassword = true;
    }

    // 5. Construir y ejecutar la consulta SQL
    let sql = `UPDATE usuarios SET 
                 nombreUsuario = ?, ApellidoPa = ?, ApellidoMa = ?, 
                 telefono = ?, fotoPerfil = ?`;
    let params = [
      nombreUsuario,
      ApellidoPa || null,
      ApellidoMa || null,
      telefono || null,
      fotoPerfilUrl // Usa la URL (nueva o la que venía)
    ];

    if (updatePassword) {
      sql += `, Password = ?`;
      params.push(hashedNewPassword);
    }

    sql += ` WHERE idUsuario = ?`;
    params.push(idUsuario);

    await pool.query(sql, params);

    // 6. OBTENER DATOS ACTUALIZADOS Y CREAR NUEVO TOKEN
    // (Esto es crucial para que el AuthContext se actualice)
    const [rows] = await pool.query(
      'SELECT u.*, r.nombreRol FROM usuarios u JOIN roles r ON u.idRol = r.idRol WHERE u.idUsuario = ?',
      [idUsuario]
    );
    const user = rows[0];

    const payload = {
      id: user.idUsuario,
      nombre: user.nombreUsuario, // Asegúrate que el token use 'nombre'
      email: user.Email,         // Asegúrate que el token use 'email'
      rol: user.nombreRol
    };

    const newToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });

    res.json({
      message: "Perfil actualizado exitosamente.",
      token: newToken,
      user: {
        ...payload,
        fotoPerfil: user.fotoPerfil, // 👈 se añade aquí
      },
    });

  } catch (error) {
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