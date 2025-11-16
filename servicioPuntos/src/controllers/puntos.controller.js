// src/controllers/puntos.controller.js
import { pool } from "../config/db.js";

/**
 * Obtener puntaje total del usuario (tabla puntajes)
 */
export const getPuntos = async (req, res) => {
  try {
    const idUsuario = req.user.id;
    const [rows] = await pool.query(
      "SELECT puntajeTotal FROM puntajes WHERE idUsuario = ?",
      [idUsuario]
    );
    const puntos = rows.length ? rows[0].puntajeTotal : 0;
    return res.json({ puntos });
  } catch (error) {
    console.error("getPuntos error:", error);
    return res.status(500).json({ error: "Error interno" });
  }
};

/**
 * Obtener historial de movimientos del usuario
 */
export const getHistorial = async (req, res) => {
  try {
    const idUsuario = req.user.id;
    const [rows] = await pool.query(
      "SELECT idHistorial, puntos, tipoMovimiento, fechaMovimiento FROM historial_puntos WHERE idUsuario = ? ORDER BY fechaMovimiento DESC LIMIT 200",
      [idUsuario]
    );
    return res.json({ historial: rows });
  } catch (error) {
    console.error("getHistorial error:", error);
    return res.status(500).json({ error: "Error interno" });
  }
};

/**
 * Escaneo QR: valida checkpoint, evita duplicados, suma puntos, registra historial
 * body: { codigo }
 */
export const scanQR = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const idUsuario = req.user.id;
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ message: "Falta código QR" });

    await connection.beginTransaction();

    // 1. Buscar checkpoint tipo QR
    const [checkpointRows] = await connection.query(
      "SELECT * FROM checkpoints WHERE codigoUnico = ? AND tipo = 'QR' LIMIT 1",
      [codigo]
    );
    if (checkpointRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "QR inválido" });
    }
    const checkpoint = checkpointRows[0];

    // 2. Verificar duplicado (ya hizo check-in en ese checkpoint)
    const [used] = await connection.query(
      "SELECT * FROM historial_checkins WHERE idUsuario = ? AND idCheckpoint = ? LIMIT 1",
      [idUsuario, checkpoint.idCheckpoint]
    );
    if (used.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Este QR ya fue escaneado por el usuario" });
    }

    // 3. Registrar checkin
    await connection.query(
      "INSERT INTO historial_checkins (idUsuario, idCheckpoint) VALUES (?, ?)",
      [idUsuario, checkpoint.idCheckpoint]
    );

    // 4. Actualizar puntaje (insert or update)
    // Usamos INSERT ... ON DUPLICATE KEY UPDATE con la estructura actual: puntajes tiene UNIQUE idUsuario
    await connection.query(
      `INSERT INTO puntajes (idUsuario, puntajeTotal)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE puntajeTotal = puntajeTotal + VALUES(puntajeTotal)`,
      [idUsuario, checkpoint.puntos]
    );

    // 5. Registrar en historial_puntos
    await connection.query(
      "INSERT INTO historial_puntos (idUsuario, puntos, tipoMovimiento) VALUES (?, ?, ?)",
      [idUsuario, checkpoint.puntos, 'QR']
    );

    await connection.commit();

    return res.json({
      ok: true,
      puntosGanados: checkpoint.puntos,
      idLugar: checkpoint.idLugar
    });

  } catch (error) {
    await connection.rollback().catch(() => {});
    console.error("scanQR error:", error);
    return res.status(500).json({ error: "Error interno" });
  } finally {
    connection.release();
  }
};

/**
 * Escaneo BLE (beacon)
 * body: { codigo } // codigo del checkpoint del tipo BEACON
 */
export const scanBLE = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const idUsuario = req.user.id;
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ message: "Falta código BEACON" });

    await connection.beginTransaction();

    // 1. Buscar checkpoint tipo BEACON
    const [checkpointRows] = await connection.query(
      "SELECT * FROM checkpoints WHERE codigoUnico = ? AND tipo = 'BEACON' LIMIT 1",
      [codigo]
    );
    if (checkpointRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Beacon inválido" });
    }
    const checkpoint = checkpointRows[0];

    // 2. Evitar registros múltiples
    const [used] = await connection.query(
      "SELECT * FROM historial_checkins WHERE idUsuario = ? AND idCheckpoint = ? LIMIT 1",
      [idUsuario, checkpoint.idCheckpoint]
    );
    if (used.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Beacon ya registrado por el usuario" });
    }

    // 3. Registrar checkin
    await connection.query(
      "INSERT INTO historial_checkins (idUsuario, idCheckpoint) VALUES (?, ?)",
      [idUsuario, checkpoint.idCheckpoint]
    );

    // 4. Actualizar puntaje
    await connection.query(
      `INSERT INTO puntajes (idUsuario, puntajeTotal)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE puntajeTotal = puntajeTotal + VALUES(puntajeTotal)`,
      [idUsuario, checkpoint.puntos]
    );

    // 5. Registrar historial_puntos
    await connection.query(
      "INSERT INTO historial_puntos (idUsuario, puntos, tipoMovimiento) VALUES (?, ?, ?)",
      [idUsuario, checkpoint.puntos, 'BEACON']
    );

    await connection.commit();

    return res.json({
      ok: true,
      puntosGanados: checkpoint.puntos,
      idLugar: checkpoint.idLugar
    });

  } catch (error) {
    await connection.rollback().catch(() => {});
    console.error("scanBLE error:", error);
    return res.status(500).json({ error: "Error interno" });
  } finally {
    connection.release();
  }
};
