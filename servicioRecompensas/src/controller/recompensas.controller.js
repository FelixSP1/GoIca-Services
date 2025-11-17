import { pool } from '../config/db.js';

//Obtener la lista de todas las recompensas activas
// ✅ CORRECCIÓN: Parámetros (req, res) en el orden correcto
export const getRecompensas = async (req, res) => {
  try {
    const [recompensas] = await pool.query(
      `SELECT r.*, s.razonSocial 
       FROM recompensas r
       JOIN socios s ON r.idSocio = s.idSocio
       WHERE r.fechaFin >= CURDATE() AND (r.limite > 0 OR r.limite IS NULL)
       AND r.estado = 1`
    );
    res.json(recompensas);
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor.", error: error.message });
  }
}

//Ruta protegida

export const getPuntosUsuario = async (req, res) => {
  const idUsuario = req.user.id;
  try {
    const [rows] = await pool.query('SELECT puntajeTotal FROM puntajes WHERE idUsuario = ?', [idUsuario]);
    if (rows.length === 0) {
      // ✅ CORRECCIÓN: Error de tipeo, era 'puntajeTota'
      return res.json({ puntajeTotal: 0 });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Error en el Servidor.", error: error.message })
  }
}

//Canjear Recompensa
export const canjearRecompensa = async (req, res) => {
  const { idRecompensa } = req.body;
  const idUsuario = req.user.id;
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [usuarioPuntaje] = await connection.query("SELECT puntajeTotal FROM puntajes WHERE idUsuario = ? FOR UPDATE", [idUsuario]);
    // ✅ CORRECCIÓN: El campo es 'costePuntos' (plural)
    const [recompensaData] = await connection.query("SELECT costePuntos, limite FROM recompensas WHERE idRecompensa = ? FOR UPDATE", [idRecompensa]);

    if (usuarioPuntaje.length === 0 || recompensaData.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Usuario o Recompensa no encontrada" })
    }

    const puntajeActual = usuarioPuntaje[0].puntajeTotal;
    // ✅ CORRECCIÓN: El campo es 'costePuntos' (plural)
    const costeRecompensa = recompensaData[0].costePuntos;
    const limiteRecompensa = recompensaData[0].limite;

    // 2. Validaciones
    if (puntajeActual < costeRecompensa) {
      await connection.rollback();
      // ✅ CORRECCIÓN: Mensaje de error correcto
      return res.status(400).json({ message: "Puntos insuficientes." });
    }
    if (limiteRecompensa !== null && limiteRecompensa <= 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Esta recompensa se ha agotado." });
    }

    // 3. Ejecutar Operaciones
    await connection.query('UPDATE puntajes SET puntajeTotal = puntajeTotal - ? WHERE idUsuario = ? ', [costeRecompensa, idUsuario]);

    // ✅ CORRECCIÓN: El campo es 'idUsuario' (singular)
    await connection.query('INSERT INTO historial_puntos (idUsuario, puntos, tipoMovimiento) VALUES (?,?,?)', [idUsuario, -costeRecompensa, `Canje de recompensa ID ${idRecompensa}`]);

    await connection.query('INSERT INTO usuario_recompensa (idUsuario, idRecompensa, estado) VALUES (?,?,"CANJEADO")', [idUsuario, idRecompensa]);

    if (limiteRecompensa !== null) {
      // ✅ CORRECCIÓN: Sintaxis SQL de UPDATE
      await connection.query('UPDATE recompensas SET limite = limite - 1 WHERE idRecompensa = ?', [idRecompensa])
    }

    await connection.commit();
    res.json({ success: true, message: "Recompensa Canjeada" });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: "Error en el servidor durante el canje", error: error.message })
  } finally {
    if (connection) connection.release()
  }
}

//Registro de Recompensas (Check-in)
export const checkIn = async (req, res) => {
  // (Esta función estaba bien)
  const { codigoUnico } = req.body;
  const idUsuario = req.user.id;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [checkpoints] = await connection.query('SELECT * FROM checkpoints WHERE codigoUnico = ?', [codigoUnico]);
    if (checkpoints.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Punto de control no válido." });
    }
    const checkpoint = checkpoints[0];
    const [historial] = await connection.query(
      'SELECT * FROM historial_checkins WHERE idUsuario = ? AND idCheckpoint = ? AND fechaCheckin > NOW() - INTERVAL 24 HOUR',
      [idUsuario, checkpoint.idCheckpoint]
    );
    if (historial.length > 0) {
      await connection.rollback();
      return res.status(409).json({ message: "Ya has obtenido puntos en este lugar recientemente." });
    }
    const puntosAGanar = checkpoint.puntos;
    await connection.query('UPDATE puntajes SET puntajeTotal = puntajeTotal + ? WHERE idUsuario = ?', [puntosAGanar, idUsuario]);
    await connection.query(
      'INSERT INTO historial_puntos (idUsuario, puntos, tipoMovimiento) VALUES (?, ?, ?)',
      [idUsuario, puntosAGanar, `Check-in en checkpoint #${checkpoint.idCheckpoint}`]
    );
    await connection.query('INSERT INTO historial_checkins (idUsuario, idCheckpoint) VALUES (?, ?)', [idUsuario, checkpoint.idCheckpoint]);
    await connection.commit();
    res.json({ success: true, message: `¡Has ganado ${puntosAGanar} puntos!` });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: "Error en el servidor.", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// --- 👇 FUNCIÓN AÑADIDA 👇 ---
/**
 * RUTA: GET /historial
 * Obtener historial de movimientos del usuario (para la app móvil)
 */
export const getHistorialPuntos = async (req, res) => {
  try {
    const idUsuario = req.user.id;
    const [rows] = await pool.query(
      "SELECT idHistorial, puntos, tipoMovimiento, fechaMovimiento FROM historial_puntos WHERE idUsuario = ? ORDER BY fechaMovimiento DESC LIMIT 200",
      [idUsuario]
    );
    return res.json(rows); // Devuelve el array directamente
  } catch (error) {
    console.error("getHistorialPuntos error:", error);
    return res.status(500).json({ error: "Error interno" });
  }
};

//----- Funciones Dashboard de Socio ---- 

const getSocioIdFromToken = async (idUsuario) => {
  const [rows] = await pool.query('SELECT idSocio FROM socios WHERE idUsuario = ?', [idUsuario]);
  if (rows.length === 0) {
    throw new Error('Usuario no esta vinculado a un socio.');
  }
  return rows[0].idSocio;
}

//1.- Endpoint - Tarjeta Estadisticas
export const getSocioStats = async (req, res) => {
  try {
    console.log('📊 Obteniendo stats del socio...');
    console.log('Usuario ID:', req.user.id);

    const idSocio = await getSocioIdFromToken(req.user.id);
    console.log('Socio ID encontrado:', idSocio);

    const [recompensasRes] = await pool.query('SELECT COUNT(*) as totalRecompensas FROM recompensas WHERE idSocio = ?', [idSocio]);
    console.log('✅ Recompensas obtenidas');

    // --- INICIO DE BLOQUE DE PRUEBA ---
    let canjesRes = [{ totalCanjes: 0 }]; // Valor por defecto
    try {
      [canjesRes] = await pool.query(
        `SELECT COUNT(ur.idUsuarioRecompensa) as totalCanjes 
         FROM usuario_recompensa ur
         JOIN recompensas r ON ur.idRecompensa = r.idRecompensa
         WHERE r.idSocio = ? AND ur.estado = 'CANJEADO'`,
        [idSocio]
      );
      console.log('✅ Canjes obtenidos');
    } catch (err) {
      console.warn('⚠️ Error al obtener totalCanjes:', err.message);
    }
    console.log('✅ Canjes obtenidos');

    // Consulta de reseñas con manejo de error si socio_lugar no existe
    let resenasStats = [{ totalResenas: 0, promedioResenas: 0 }];
    try {
      [resenasStats] = await pool.query(
        `SELECT 
           COUNT(res.idReview) as totalResenas, 
           AVG(res.calificacion) as promedioResenas
         FROM resenas res
         JOIN socio_lugar sl ON res.idLugar = sl.idLugar
         WHERE sl.idSocio = ?`,
        [idSocio]
      );
      console.log('✅ Reseñas stats obtenidas');
    } catch (err) {
      console.warn('⚠️ Error al obtener reseñas (tabla socio_lugar puede no existir):', err.message);
    }

    // Stats de 5 Estrellas
    let resenas5EstrellasRes = [{ resenas5Estrellas: 0 }];
    try {
      [resenas5EstrellasRes] = await pool.query(
        `SELECT COUNT(res.idReview) as resenas5Estrellas
         FROM resenas res
         JOIN socio_lugar sl ON res.idLugar = sl.idLugar
         WHERE sl.idSocio = ? AND res.calificacion = 5`,
        [idSocio]
      );
      console.log('✅ Reseñas 5 estrellas obtenidas');
    } catch (err) {
      console.warn('⚠️ Error al obtener reseñas 5 estrellas:', err.message);
    }

    // Stats de Este Mes
    let resenasMesRes = [{ resenasMes: 0 }];
    try {
      [resenasMesRes] = await pool.query(
        `SELECT COUNT(res.idReview) as resenasMes
         FROM resenas res
         JOIN socio_lugar sl ON res.idLugar = sl.idLugar
         WHERE sl.idSocio = ? AND MONTH(res.fechaCreacion) = MONTH(CURDATE()) AND YEAR(res.fechaCreacion) = YEAR(CURDATE())`,
        [idSocio]
      );
      console.log('✅ Reseñas del mes obtenidas');
    } catch (err) {
      console.warn('⚠️ Error al obtener reseñas del mes:', err.message);
    }

    const response = {
      totalRecompensas: recompensasRes[0].totalRecompensas || 0,
      totalCanjes: canjesRes[0].totalCanjes || 0,
      totalResenas: resenasStats[0].totalResenas || 0,
      promedioCalificacion: parseFloat(resenasStats[0].promedioResenas || 0).toFixed(1),
      resenas5Estrellas: resenas5EstrellasRes[0].resenas5Estrellas || 0,
      resenasMes: resenasMesRes[0].resenasMes || 0
    };

    console.log('📤 Enviando respuesta:', response);
    res.json(response);
  } catch (error) {
    console.error('❌ Error en getSocioStats:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ message: "Error a nivel Servidor.", error: error.message })
  }
};

//2.- Endpoint para Grafico de Barras (Canjes por Mes)
export const getSocioCanjesPorMes = async (req, res) => {
  try {
    console.log('📈 Obteniendo canjes por mes...');
    const idSocio = await getSocioIdFromToken(req.user.id);
    console.log('Socio ID:', idSocio);

    const [rows] = await pool.query(
      `SELECT 
         DATE_FORMAT(ur.fechaCanje, '%Y-%m') as mes,
         COUNT(ur.idUsuarioRecompensa) as canjes
       FROM usuario_recompensa ur
       JOIN recompensas r ON ur.idRecompensa = r.idRecompensa
       WHERE r.idSocio = ? AND ur.fechaCanje >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY mes
       ORDER BY mes ASC`,
      [idSocio] // ✅ Ahora [idSocio] está definido
    );
    console.log('📤 Enviando canjes por mes:', rows);
    res.json(rows);
  } catch (error) {
    console.error('❌ Error en getSocioCanjesPorMes:', error.message);
    res.status(500).json({ message: "Error a nivel servidor", error: error.message });
  }
};

// 3.- Endpoint para el Grafico de Dona - Estado de Canjes
export const getSocioCanjesEstado = async (req, res) => {
  try {
    console.log('🍩 Obteniendo canjes por estado...');
    const idSocio = await getSocioIdFromToken(req.user.id);
    console.log('Socio ID:', idSocio);
    const [rows] = await pool.query(
      `SELECT 
         ur.estado as name, 
         COUNT(ur.idUsuarioRecompensa) as value
       FROM usuario_recompensa ur
       JOIN recompensas r ON ur.idRecompensa = r.idRecompensa
       WHERE r.idSocio = ?
       GROUP BY ur.estado`,
      [idSocio]
    );
    const dataWithColors = rows.map(row => ({
      ...row,
      color: row.name === 'CANJEADO' ? '#84cc16' : (row.name === 'PENDIENTE' ? '#f59e0b' : '#ef4444')
    }));
    console.log('📤 Enviando canjes por estado:', dataWithColors);
    res.json(dataWithColors);
  } catch (error) {
    console.error('❌ Error en getSocioCanjesEstado:', error.message);
    res.status(500).json({ message: "Error en el servidor.", error: error.message });
  }
};

//4.- Endpoint para la tabla de Top usuario
export const getSocioTopUsuarios = async (req, res) => {
  try {
    console.log('🏆 Obteniendo top usuarios...');
    const idSocio = await getSocioIdFromToken(req.user.id);
    console.log('Socio ID:', idSocio);
    const [rows] = await pool.query(
      `SELECT 
         u.idUsuario as id, 
         u.nombreUsuario as nombre, 
         u.Email as email, 
         COUNT(ur.idUsuarioRecompensa) as canjes,
         SUM(r.costePuntos) as puntos
       FROM usuario_recompensa ur
       JOIN recompensas r ON ur.idRecompensa = r.idRecompensa
       JOIN usuarios u ON ur.idUsuario = u.idUsuario
       WHERE r.idSocio = ?
       GROUP BY u.idUsuario
       ORDER BY canjes DESC
       LIMIT 5`,
      [idSocio]
    );
    console.log('📤 Enviando top usuarios:', rows);
    res.json(rows);
  } catch (error) {
    console.error('❌ Error en getSocioTopUsuarios:', error.message);
    res.status(500).json({ message: "Error en el servidor.", error: error.message });
  }
};

//---- CRUD----
// (Estas funciones estaban bien)
export const getMisRecompensas = async (req, res) => {
  try {
    const idSocio = await getSocioIdFromToken(req.user.id);
    const [rows] = await pool.query(
      'SELECT * FROM recompensas WHERE idSocio = ?',
      [idSocio]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor.", error: error.message });
  }
};

export const createRecompensa = async (req, res) => {
  try {
    const idSocio = await getSocioIdFromToken(req.user.id);
    const { nombreRecompensa, descRecompensa, imagenRecompensa, costePuntos, limite, fechaInicio, fechaFin } = req.body;
    const [result] = await pool.query(
      `INSERT INTO recompensas (idSocio, nombreRecompensa, descRecompensa, imagenRecompensa, costePuntos, limite, fechaInicio, fechaFin) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [idSocio, nombreRecompensa, descRecompensa, imagenRecompensa, costePuntos, limite, fechaInicio, fechaFin]
    );
    res.status(201).json({ id: result.insertId, message: "Recompensa creada exitosamente." });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor.", error: error.message });
  }
};

export const updateRecompensa = async (req, res) => {
  try {
    const idSocio = await getSocioIdFromToken(req.user.id);
    const { id } = req.params;
    const { nombreRecompensa, descRecompensa, imagenRecompensa, costePuntos, limite, fechaInicio, fechaFin } = req.body;
    const [result] = await pool.query(
      `UPDATE recompensas SET
         nombreRecompensa = ?, descRecompensa = ?, imagenRecompensa = ?, 
         costePuntos = ?, limite = ?, fechaInicio = ?, fechaFin = ?
       WHERE idRecompensa = ? AND idSocio = ?`,
      [nombreRecompensa, descRecompensa, imagenRecompensa, costePuntos, limite, fechaInicio, fechaFin, id, idSocio]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Recompensa no encontrada o no tienes permiso para editarla." });
    }
    res.json({ message: "Recompensa actualizada exitosamente." });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor.", error: error.message });
  }
};

export const deleteRecompensa = async (req, res) => {
  // (Esta función estaba bien)
  try {
    const idSocio = await getSocioIdFromToken(req.user.id);
    const { id } = req.params;
    const [result] = await pool.query(
      `UPDATE recompensas SET estado = 0 
       WHERE idRecompensa = ? AND idSocio = ?`,
      [id, idSocio]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Recompensa no encontrada o no tienes permiso." });
    }
    res.json({ message: "Recompensa desactivada exitosamente." });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor.", error: error.message });
  }
};

// 5. OBTENER TODAS LAS RESEÑAS DE LOS LUGARES DEL SOCIO
export const getSocioResenas = async (req, res) => {
  try {
    const idSocio = await getSocioIdFromToken(req.user.id);
    const [rows] = await pool.query(
      `SELECT
res.idReview, COALESCE(u.nombreUsuario, 'Usuario Eliminado') as nombreUsuario, res.comentario, res.calificacion, res.fechaCreacion
FROM resenas res LEFT JOIN usuarios u ON res.idUsuario = u.idUsuario JOIN socio_lugar sl ON res.idLugar = sl.idLugar
WHERE sl.idSocio = ?
ORDER BY res.fechaCreacion DESC`,
      [idSocio]
    );
    res.json(rows);
    console.log('Filas obtenidas de la BD:', rows);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener reseñas.", error: error.message });
  }
};

// 6. ELIMINAR UNA RESEÑA (DELETE EN BRUTO, como pide tu frontend)
export const deleteSocioResena = async (req, res) => {
  try {
    const idSocio = await getSocioIdFromToken(req.user.id);
    const { id: idReview } = req.params; // ID de la reseña a eliminar

    // Verificación de seguridad: Asegurarse de que el socio tenga permiso para borrar esta reseña
    const [permisoRes] = await pool.query(
      `SELECT * FROM resenas res
       JOIN socio_lugar sl ON res.idLugar = sl.idLugar
       WHERE res.idReview = ? AND sl.idSocio = ?`,
      [idReview, idSocio]
    );

    if (permisoRes.length === 0) {
      return res.status(403).json({ message: "Acceso denegado. Esta reseña no pertenece a uno de tus lugares." });
    }

    // Si tiene permiso, la elimina
    await pool.query('DELETE FROM resenas WHERE idReview = ?', [idReview]);

    res.json({ message: "Reseña eliminada exitosamente." });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar la reseña.", error: error.message });
  }
};