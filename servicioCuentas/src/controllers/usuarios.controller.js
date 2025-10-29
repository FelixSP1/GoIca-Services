import { pool } from '../config/db.js';

// Obtener perfil del usuario autenticado
export const getPerfil = async (req, res) => {
    try {
        const userId = req.user.idUsuario; // Del token JWT
        
        const [rows] = await pool.query(`
            SELECT 
                idUsuario,
                CONCAT(nombreUsuario, ' ', ApellidoPa, ' ', IFNULL(ApellidoMa, '')) as nombre,
                Email,
                telefono,
                fotoPerfil,
                fechaCreacion
            FROM usuarios
            WHERE idUsuario = ?
        `, [userId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ message: 'Error al obtener perfil del usuario' });
    }
};

// Actualizar perfil del usuario autenticado
export const updatePerfil = async (req, res) => {
    try {
        const userId = req.user.idUsuario;
        const { nombre, telefono, fotoPerfil } = req.body;
        
        // Dividir el nombre completo
        const nombreParts = nombre ? nombre.trim().split(' ') : [];
        const nombreUsuario = nombreParts[0] || '';
        const ApellidoPa = nombreParts[1] || '';
        const ApellidoMa = nombreParts.length > 2 ? nombreParts.slice(2).join(' ') : '';
        
        // Construir la query dinámicamente
        const updates = [];
        const values = [];
        
        if (nombreUsuario) {
            updates.push('nombreUsuario = ?');
            values.push(nombreUsuario);
        }
        
        if (ApellidoPa) {
            updates.push('ApellidoPa = ?');
            values.push(ApellidoPa);
        }
        
        if (ApellidoMa) {
            updates.push('ApellidoMa = ?');
            values.push(ApellidoMa);
        }
        
        if (telefono !== undefined) {
            updates.push('telefono = ?');
            values.push(telefono);
        }
        
        if (fotoPerfil !== undefined) {
            updates.push('fotoPerfil = ?');
            values.push(fotoPerfil);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ message: 'No hay datos para actualizar' });
        }
        
        values.push(userId);
        
        const sql = `UPDATE usuarios SET ${updates.join(', ')} WHERE idUsuario = ?`;
        
        await pool.query(sql, values);
        
        // Obtener los datos actualizados
        const [updatedUser] = await pool.query(`
            SELECT 
                idUsuario,
                CONCAT(nombreUsuario, ' ', ApellidoPa, ' ', IFNULL(ApellidoMa, '')) as nombre,
                Email,
                telefono,
                fotoPerfil,
                fechaCreacion
            FROM usuarios
            WHERE idUsuario = ?
        `, [userId]);
        
        res.json({
            message: 'Perfil actualizado exitosamente',
            data: updatedUser[0]
        });
        
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ message: 'Error al actualizar perfil del usuario' });
    }
};
