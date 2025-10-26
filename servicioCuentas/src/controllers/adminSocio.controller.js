import { pool } from '../config/db.js';

// --- GET /api/admin/socios ---
export const getAllSociosAdmin = async (req, res) => {
    try {
        const [socios] = await pool.query(
            `SELECT
               s.idSocio, s.idUsuario, s.razonSocial, s.RUC, s.descSocios, s.imagenSocio, s.estado, s.fechaCreacion,
               u.Email, u.telefono,
               sc.idCategoria, c.nombreCategoria
             FROM socios s
             JOIN usuarios u ON s.idUsuario = u.idUsuario
             LEFT JOIN socio_categoria sc ON s.idSocio = sc.idSocio
             LEFT JOIN categorias c ON sc.idCategoria = c.idCategoria
             ORDER BY s.fechaCreacion DESC`
        );
        res.json(socios);
    } catch (error) {
        console.error("Error fetching all socios (admin):", error);
        res.status(500).json({ message: "Error en el servidor.", error: error.message });
    }
};

// --- GET /api/admin/socios/stats ---
export const getSocioStatsAdmin = async (req, res) => {
    try {
        const [stats] = await pool.query(
            `SELECT
               COUNT(s.idSocio) AS totalSocios,
               SUM(CASE WHEN s.estado = 1 THEN 1 ELSE 0 END) AS sociosActivos,
               SUM(CASE WHEN sc.idCategoria = 2 THEN 1 ELSE 0 END) AS restaurantes, -- ID 2 = Restaurante
               SUM(CASE WHEN sc.idCategoria = 3 THEN 1 ELSE 0 END) AS hoteles, -- ID 3 = Hotel
               SUM(CASE WHEN sc.idCategoria = 1 THEN 1 ELSE 0 END) AS lugaresTuristicos -- ID 1 = Turistico
               -- Add SUM(CASE...) for other category IDs if needed
             FROM socios s
             LEFT JOIN socio_categoria sc ON s.idSocio = sc.idSocio`
        );
        const result = stats[0] || {};
        res.json({
            totalSocios: result.totalSocios || 0,
            sociosActivos: result.sociosActivos || 0,
            restaurantes: result.restaurantes || 0,
            hoteles: result.hoteles || 0,
            lugaresTuristicos: result.lugaresTuristicos || 0
        });
    } catch (error) {
        console.error("Error fetching socio stats (admin):", error);
        res.status(500).json({ message: "Error en el servidor.", error: error.message });
    }
};

// --- POST /api/admin/socios ---
export const createSocioAdmin = async (req, res) => {
    const { idUsuario, razonSocial, RUC, descSocios, imagenSocio, idCategoria, estado } = req.body;

    if (!idUsuario || !razonSocial || !RUC || !idCategoria) {
        return res.status(400).json({ message: "ID Usuario, Razón Social, RUC y Categoría son requeridos." });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // 1. Check if idUsuario exists and is not already a socio or admin
        const [users] = await connection.query('SELECT idRol FROM usuarios WHERE idUsuario = ?', [idUsuario]);
        if (users.length === 0) {
            throw new Error(`El Usuario con ID ${idUsuario} no existe.`);
        }
        if (users[0].idRol !== 1) { // Assuming Role ID 1 is 'Usuario'
             throw new Error(`El Usuario con ID ${idUsuario} ya tiene un rol asignado (Socio o Admin) y no puede ser vinculado.`);
        }

        // 2. Insert into 'socios' table
        const [socioResult] = await connection.query(
            `INSERT INTO socios (idUsuario, razonSocial, RUC, descSocios, imagenSocio, estado)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [idUsuario, razonSocial, RUC, descSocios || null, imagenSocio || null, estado ?? 1]
        );
        const newSocioId = socioResult.insertId;

        // 3. Update the user's role in 'usuarios' table to 'Socio' (Assuming Role ID 2)
        await connection.query('UPDATE usuarios SET idRol = 2 WHERE idUsuario = ?', [idUsuario]);

        // 4. Insert into 'socio_categoria'
        await connection.query(
            'INSERT INTO socio_categoria (idSocio, idCategoria) VALUES (?, ?)',
            [newSocioId, idCategoria]
        );

        await connection.commit();
        connection.release();
        res.status(201).json({ id: newSocioId, message: "Socio creado y vinculado exitosamente." });

    } catch (error) {
        await connection.rollback();
        connection.release();
        if (error.code === 'ER_DUP_ENTRY' && error.message.includes('RUC')) {
             return res.status(409).json({ message: "El RUC ya está registrado." });
        }
         if (error.code === 'ER_DUP_ENTRY' && error.message.includes('idUsuario')) {
             return res.status(409).json({ message: "Este usuario ya está vinculado a otro socio." });
         }
        console.error("Error creating socio (admin):", error);
        res.status(500).json({ message: error.message || "Error en el servidor." }); // Return specific error message if available
    }
};

// --- PUT /api/admin/socios/:id ---
export const updateSocioAdmin = async (req, res) => {
    const { id } = req.params; // idSocio to update
    // Admin can update these fields. idUsuario usually shouldn't be changed.
    const { razonSocial, RUC, descSocios, imagenSocio, idCategoria, estado } = req.body;

    if (!razonSocial || !RUC || !idCategoria) {
        return res.status(400).json({ message: "Razón Social, RUC y Categoría son requeridos." });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // 1. Update 'socios' table
        const [updateSocioResult] = await connection.query(
            `UPDATE socios SET
               razonSocial = ?, RUC = ?, descSocios = ?, imagenSocio = ?, estado = ?
             WHERE idSocio = ?`,
            [razonSocial, RUC, descSocios || null, imagenSocio || null, estado ?? 1, id]
        );

        if (updateSocioResult.affectedRows === 0) {
             throw new Error("Socio no encontrado.");
        }

        // 2. Update 'socio_categoria'
        await connection.query(
            `INSERT INTO socio_categoria (idSocio, idCategoria) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE idCategoria = VALUES(idCategoria)`,
            [id, idCategoria]
        );

        await connection.commit();
        connection.release();
        res.json({ message: "Socio actualizado exitosamente." });

    } catch (error) {
        await connection.rollback();
        connection.release();
        if (error.code === 'ER_DUP_ENTRY' && error.message.includes('RUC')) {
             return res.status(409).json({ message: "El RUC ya está registrado por otro socio." });
        }
        console.error(`Error updating socio ${id} (admin):`, error);
        res.status(500).json({ message: error.message || "Error en el servidor." });
    }
};

// --- DELETE /api/admin/socios/:id ---
export const deactivateSocioAdmin = async (req, res) => {
    const { id } = req.params; // idSocio to deactivate

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // 1. Find the linked idUsuario BEFORE deactivating the socio
        const [socioLink] = await connection.query('SELECT idUsuario FROM socios WHERE idSocio = ?', [id]);
        if (socioLink.length === 0) {
            throw new Error("Socio no encontrado.");
        }
        const linkedUserId = socioLink[0].idUsuario;

        // 2. Soft delete the socio by setting estado = 0
        const [updateSocioResult] = await connection.query(
            'UPDATE socios SET estado = 0 WHERE idSocio = ?',
            [id]
        );

        if (updateSocioResult.affectedRows === 0) {
             // Should have been caught above, but as a safeguard
             throw new Error("Socio no encontrado al intentar desactivar.");
        }

        // 3. IMPORTANT: Revert the user's role back to 'Usuario' (Role ID 1)
        await connection.query('UPDATE usuarios SET idRol = 1 WHERE idUsuario = ? AND idRol = 2', [linkedUserId]);
        console.log(`User role reverted for idUsuario: ${linkedUserId}`);


        await connection.commit();
        connection.release();
        res.json({ message: "Socio desactivado y rol de usuario revertido exitosamente." });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error(`Error deactivating socio ${id} (admin):`, error);
        res.status(500).json({ message: error.message || "Error en el servidor." });
    }
};