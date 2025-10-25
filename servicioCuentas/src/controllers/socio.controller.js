import { pool } from '../config/db.js';
import cloudinary from "../config/cloudinary.js";

// Gestion de Imagenes 
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No se ha subido ningun archivo" });
    }

    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const result = await cloudinary.uploader.upload(base64Image, {
      folder: "goica/lugares"
    });

    res.json({ imageUrl: result.secure_url });
  } catch (error) {
    console.error("error al subir la imagen", error);
    res.status(500).json({ message: "Error al subir la imagen", error: error.message });
  }
}

// Helper de idSocio con idUsuario del Token
const getSocioIdFromToken = async (idUsuario) => {
  const [rows] = await pool.query('SELECT idSocio FROM socios WHERE idUsuario = ?', [idUsuario])
  if (rows.length === 0) {
    throw new Error('Usuario no esta Vinculado a un socio.');
  }
  return rows[0].idSocio;
}

export const getSocioPerfil = async (req, res) => {
  try {
    const idSocio = await getSocioIdFromToken(req.user.id);

    //MAGIA
    const [rows] = await pool.query(
      `SELECT
         s.razonSocial,
         s.ruc,
         s.descSocios AS descripcion,
         sc.idCategoria,
         COALESCE(l.nombreLugar, s.razonSocial) AS nombreNegocio, -- Nombre: Lugar > Razón Social
         COALESCE(s.imagenSocio, l.imagenLugar) AS imagenSocio     -- Imagen: Socio > Lugar
       FROM socios s
       LEFT JOIN socio_categoria sc ON s.idSocio = sc.idSocio
       LEFT JOIN socio_lugar sl ON s.idSocio = sl.idSocio
       LEFT JOIN lugares l ON sl.idLugar = l.idLugar
       WHERE s.idSocio = ?
       LIMIT 1`, [idSocio]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Perfil de socio No necontrado" });
    }

    const perfilData = {
      razonSocial: rows[0].razonSocial || '',
      ruc: rows[0].ruc || '',
      descripcion: rows[0].descripcion || '',
      idCategoria: rows[0].idCategoria || 1, // Default a categoría 1 si no hay
      nombreNegocio: rows[0].nombreNegocio || rows[0].razonSocial || '', // Fallback si no hay lugar vinculado
      imagenSocio: rows[0].imagenSocio || '' // Fallback si no hay imagen
    };

    res.json(perfilData);

  } catch (error) {
    console.error("Error al obtener el perfil del Socio:", error);
    res.status(500).json({ message: "Error en el servidor al obtener perfil.", error: error.message });
  }
}

export const updateSocioPerfil = async (req, res) => {
  try {
    // 1. Obtiene el idSocio usando el helper y el idUsuario del token.
    const idSocio = await getSocioIdFromToken(req.user.id);

    // 2. Extrae los datos actualizados del cuerpo de la petición (enviados por el formulario).
    const {
      razonSocial, // Para tabla socios
      ruc,         // Para tabla socios
      descripcion, // Para columna descSocios en tabla socios
      idCategoria, // Para tabla socio_categoria
      // nombreNegocio, // Lo extraemos pero NO lo usamos para actualizar 'socios'
      imagenSocio    // Lo extraemos pero NO lo usamos para actualizar 'socios'
    } = req.body;

    console.log("Datos recibidos en backend:", req.body);

    // Validación básica (puedes añadir más validaciones si lo necesitas)
    if (!razonSocial || !ruc || !idCategoria) {
      return res.status(400).json({ message: "Faltan campos obligatorios (Razón Social, RUC, Categoría)." });
    }

    // Iniciar transacción (opcional pero recomendado para operaciones múltiples)
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {

      console.log(`Actualizando socio ${idSocio} con imagen: ${imagenSocio}`);

      // 3. Actualiza los datos en la tabla 'socios'.
      const [updateSociosResult] = await connection.query(
        `UPDATE socios SET
           razonSocial = ?,
           ruc = ?,
           descSocios = ?
         WHERE idSocio = ?`,
        [razonSocial, ruc, descripcion, idSocio] // Pasar 'descripcion' para 'descSocios'
      );

      // Si no se afectó ninguna fila, el socio no existía.
      if (updateSociosResult.affectedRows === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ message: "Perfil de socio no encontrado para actualizar." });
      }

      // 4. Actualiza la categoría en la tabla 'socio_categoria'.
      // Usamos INSERT ... ON DUPLICATE KEY UPDATE para manejar si ya existe o no.
      await connection.query(
        `INSERT INTO socio_categoria (idSocio, idCategoria)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE idCategoria = VALUES(idCategoria)`,
        [idSocio, idCategoria]
      );

      const [lugarVinculado] = await connection.query(
          'SELECT idLugar FROM socio_lugar WHERE idSocio = ? LIMIT 1',
          [idSocio]
      );

      //5. Actualiza el link de imagenLugares de la Tabla Lugares
      if (lugarVinculado.length > 0) {
          const idLugarPrincipal = lugarVinculado[0].idLugar;
          await connection.query(
              'UPDATE lugares SET imagenLugar = ? WHERE idLugar = ?',
              [imagenSocio, idLugarPrincipal] // Usa la URL del formulario
          );
          console.log(`Imagen actualizada para idLugar: ${idLugarPrincipal}`);
      } else {
          console.warn(`Socio ${idSocio} no tiene un lugar vinculado en socio_lugar. No se actualizó imagenLugar.`);
          // Podrías decidir si esto es un error o simplemente un aviso.
          // Por ahora, solo lo logueamos.
      }

      // Si todo fue bien, confirmar transacción
      await connection.commit();
      connection.release();

      // 5. Envía respuesta de éxito al frontend.
      res.json({ message: "Perfil actualizado exitosamente." });

    } catch (innerError) {
      // Si algo falla dentro de la transacción, deshacerla
      await connection.rollback();
      connection.release();
      throw innerError; // Re-lanzar el error para que lo capture el catch exterior
    }

  } catch (error) {
    console.error("Error al actualizar perfil de socio:", error); // Muestra el error real en consola
    if (error.code === 'ER_DUP_ENTRY' && error.message.includes('ruc')) {
      return res.status(409).json({ message: "El RUC ingresado ya está registrado por otro socio." });
    }
    // Devuelve el mensaje de error específico si es ReferenceError
    if (error instanceof ReferenceError) {
      return res.status(500).json({ message: `Error de referencia en el servidor: ${error.message}` });
    }
    res.status(500).json({ message: "Error en el servidor al actualizar perfil.", error: error.message });
  }
};