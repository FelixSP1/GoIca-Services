import  { pool } from '../config/db.js';

//Obtener la lista de todas las recompensas activas
export const getRecompensas = async (res, req) =>{
    try {
        const [recompensas] = await pool.query(
            'SELECT r.*, s.razonSocial FROM recompensas r JOIN socios s ON r.idSocio = s.idSocio WHERE r.fechaFin >= CURDATE() AND (r.limite >0 OR r.limite IS NULL)'
        );
        res.json(recompensas);
    } catch (error) {
        res.status(500).json({ message: "Error en el servidor.", error: error.message});
    }
}

//Ruta protegida
export const getPuntosUsuario = async (req,res) => {
    const idUsuario = req.user.id;
    try {
        const [rows] = await pool.query('SELECT puntajeTotal FROM puntajes WHERE idUsuario = ?', [idUsuario]);
        if (rows.length === 0 ) {
            return res.json({ puntajeTota : 0});
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: "Error en el Servidor.", error: error.message})
    }
}

//Canjear Recompensa
export const canjearRecompensa = async (req,res) => {
    const { idRecompensa } = req.body;
    const idUsuario = req.user.id;
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        //
        const [usuarioPuntaje] = await connection.query("SELECT puntajeTotal FROM puntajes WHERE idUsuario = ? FOR UPDATE", [idUsuario]);
        const [recompensaData] = await connection.query("SELECT costePunto, limite FROM recompensas WHERE idRecompensa = ?", [idRecompensa]);

        if (usuarioPuntaje.length === 0 || recompensaData.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Usuario o Recompensa no encontrada"})
        }

        const puntajeActual = usuarioPuntaje[0].puntajeTotal;
        const costeRecompensa = recompensaData[0].costePuntos;
        const limiteRecompensa = recompensaData[0].limite;

        //2
        if (puntajeActual < costeRecompensa) {
            await connection.rollback();
            return res.status(400).json({ message: "Esta recompensa se ha agotado."})
        }

        //3.- Ejecutar Operaciones
        await connection.query('UPDATE puntajes SET puntajeTotal = puntajeTotal - ? WHERE idUsuario = ? ', [costeRecompensa, idUsuario]);

        await connection.query('INSERT INTO historial_puntos (idUsuarios, puntos, tipoMovimiento) VALUES (?,?,?)', [idUsuario, -costeRecompensa, `Canje de recompensa ID ${idRecompensa}`]);

        await connection.query('INSERT INTO usuario_recompensa (idUsuario, idRecompensa, estado) VALUES (?,?,"CANJEADO")', [idUsuario, idRecompensa]);

        if (limiteRecompensa !== null) {
            await connection.query('UPDATE recompensas SET limite - 1 WHERE idRecompensa = ?', [idRecompensa])
        }

        //Si todo sale bien
        await connection.commit();

        res.json({ success: true, message: "Recompensa Canjeada"});
    } catch (error) {
        if (connection) await connection.rollback();
        res.status(500).json({ message: "Error en el servidor durante el canje", error: error.message})
    } finally{
        if (connection) connection.release()
    }
}

//Registro de Recompensas
export const checkIn = async (req, res) => {
  const { codigoUnico } = req.body;
  const idUsuario = req.user.id;
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Validar que el checkpoint existe
    const [checkpoints] = await connection.query('SELECT * FROM checkpoints WHERE codigoUnico = ?', [codigoUnico]);
    if (checkpoints.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Punto de control no válido." });
    }
    const checkpoint = checkpoints[0];

    // 2. 🛡️ SEGURIDAD: Verificar que el usuario no haya hecho check-in aquí recientemente (ej: en las últimas 24 horas)
    const [historial] = await connection.query(
      'SELECT * FROM historial_checkins WHERE idUsuario = ? AND idCheckpoint = ? AND fechaCheckin > NOW() - INTERVAL 24 HOUR',
      [idUsuario, checkpoint.idCheckpoint]
    );
    if (historial.length > 0) {
      await connection.rollback();
      return res.status(409).json({ message: "Ya has obtenido puntos en este lugar recientemente." });
    }

    // 3. Otorgar los puntos
    const puntosAGanar = checkpoint.puntos;
    await connection.query('UPDATE puntajes SET puntajeTotal = puntajeTotal + ? WHERE idUsuario = ?', [puntosAGanar, idUsuario]);
    
    // 4. Registrar en el historial de puntos
    await connection.query(
      'INSERT INTO historial_puntos (idUsuario, puntos, tipoMovimiento) VALUES (?, ?, ?)',
      [idUsuario, puntosAGanar, `Check-in en checkpoint #${checkpoint.idCheckpoint}`]
    );
    
    // 5. Registrar en el historial de check-ins para evitar abusos
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