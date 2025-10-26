import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';

//GET - /api/admin/users
export const getAllUsers = async (req, res) => {
    try {
        const [users] = await pool.query(
            `SELECT u.idUsuario, u.nombreUsuario, u.ApellidoPa, u.ApellidoMa, u.Email, u.telefono, u.fechaCreacion, u.estado, u.idRol, r.nombreRol
             FROM usuarios u
             JOIN roles r ON u.idRol = r.idRol
             ORDER BY u.fechaCreacion DESC`
        );
        res.json(users);
    } catch (error) {
        console.error("Error fetching all users:", error);
        res.status(500).json({ message: "Error en el servidor.", error: error.message });
    }
};

// --- GET /api/admin/users/stats ---
export const getUserStats = async (req, res) => {
    try {
        const [stats] = await pool.query(
            `SELECT
               COUNT(*) AS totalGlobal,
               SUM(CASE WHEN estado = 1 THEN 1 ELSE 0 END) AS totalActivos,
               SUM(CASE WHEN idRol = 1 THEN 1 ELSE 0 END) AS totalUsuarios,
               SUM(CASE WHEN idRol = 2 THEN 1 ELSE 0 END) AS totalSocios,
               SUM(CASE WHEN idRol = 3 THEN 1 ELSE 0 END) AS totalAdmins
             FROM usuarios`
        );
         // Ensure stats[0] exists and provide defaults
         const result = stats[0] || {};
         res.json({
             totalUsuarios: result.totalUsuarios || 0,
             totalSocios: result.totalSocios || 0,
             totalAdmins: result.totalAdmins || 0,
             totalActivos: result.totalActivos || 0
             // totalGlobal: result.totalGlobal || 0 // Optional: If you need total count
         });
    } catch (error) {
        console.error("Error fetching user stats:", error);
        res.status(500).json({ message: "Error en el servidor.", error: error.message });
    }
};

// --- POST /api/admin/users ---
export const createUserAdmin = async (req, res) => {
    // Note: This duplicates logic from auth.controller register.
    // Consider refactoring into a shared user service/function later.
    const { nombreUsuario, ApellidoPa, ApellidoMa, Email, Password, telefono, idRol } = req.body;

    if (!nombreUsuario || !Email || !Password || !idRol) {
        return res.status(400).json({ message: "Nombre, Email, Contraseña y Rol son requeridos." });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(Password, salt);

        const [result] = await pool.query(
            'INSERT INTO usuarios (nombreUsuario, ApellidoPa, ApellidoMa, Email, Password, telefono, idRol) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nombreUsuario, ApellidoPa || null, ApellidoMa || null, Email, hashedPassword, telefono || null, idRol]
        );

        // Also create entry in puntajes table if needed for this user type
        if (idRol === 1) { // Assuming only standard 'Usuario' gets points entry
           await pool.query('INSERT INTO puntajes (idUsuario, puntajeTotal) VALUES (?, 0)', [result.insertId]);
        }

        res.status(201).json({ id: result.insertId, message: "Usuario creado exitosamente por admin." });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: "El email ya está registrado." });
        }
        console.error("Error creating user (admin):", error);
        res.status(500).json({ message: "Error en el servidor.", error: error.message });
    }
};

// --- PUT /api/admin/users/:id ---
export const updateUserAdmin = async (req, res) => {
    const { id } = req.params; // User ID to update
    // Get data sent by admin - Password might be optional here
    const { nombreUsuario, ApellidoPa, ApellidoMa, Email, telefono, idRol, Password, estado } = req.body;

    if (!nombreUsuario || !Email || !idRol) {
        return res.status(400).json({ message: "Nombre, Email y Rol son requeridos." });
    }

    try {
        let sql = `UPDATE usuarios SET nombreUsuario = ?, ApellidoPa = ?, ApellidoMa = ?, Email = ?, telefono = ?, idRol = ?, estado = ?`;
        let params = [nombreUsuario, ApellidoPa || null, ApellidoMa || null, Email, telefono || null, idRol, estado !== undefined ? estado : 1]; // Default to active if not provided

        // Handle optional password update
        let hashedNewPassword = null;
        if (Password) {
            const salt = await bcrypt.genSalt(10);
            hashedNewPassword = await bcrypt.hash(Password, salt);
            sql += `, Password = ?`;
            params.push(hashedNewPassword);
        }

        sql += ` WHERE idUsuario = ?`;
        params.push(id);

        const [result] = await pool.query(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        res.json({ message: "Usuario actualizado exitosamente por admin." });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: "El email ya está en uso por otro usuario." });
        }
        console.error(`Error updating user ${id} (admin):`, error);
        res.status(500).json({ message: "Error en el servidor.", error: error.message });
    }
};

// --- DELETE /api/admin/users/:id ---
export const deactivateUserAdmin = async (req, res) => {
    const { id } = req.params; // User ID to deactivate

    try {
        // Soft delete by setting estado = 0
        const [result] = await pool.query(
            'UPDATE usuarios SET estado = 0 WHERE idUsuario = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        res.json({ message: "Usuario desactivado exitosamente." });
    } catch (error) {
        console.error(`Error deactivating user ${id} (admin):`, error);
        res.status(500).json({ message: "Error en el servidor.", error: error.message });
    }
};