//
import { pool } from '../config/db.js';

//
export const getLugares = async (req, res) => {
  // Obtenemos los posibles filtros desde los query params de la URL
  const { categoria, provincia } = req.query;

  try {
    // 1. Empezamos con una consulta base que siempre es verdadera
    let sql = 'SELECT * FROM lugares WHERE estado=1';
    
    // 2. Creamos un array para guardar los parámetros de forma segura (previene inyección SQL)
    const params = [];

    // 3. Si el filtro "categoria" existe, lo añadimos a la consulta y al array de parámetros
    if (categoria) {
      sql += ' AND idCategoria = ?';
      params.push(categoria);
    }

    // 4. Hacemos lo mismo para el filtro "provincia" (para el futuro)
    if (provincia) {
      sql += ' AND idProvincia = ?';
      params.push(provincia);
    }

    // 5. Ejecutamos la consulta SQL construida dinámicamente con sus parámetros
    const [rows] = await pool.query(sql, params);
    res.json(rows);

  } catch (error) {
    // Si hay un error, lo devolvemos para poder depurar
    console.error("Error en la consulta de lugares:", error); // Añadimos un log en el servidor
    return res.status(500).json({ message: 'Algo salió mal en el servidor', error: error.message });
  }
};

//Obtener ID del lugar
export const getLugarById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM Lugares WHERE idLugar = ? and estado = 1', [id]);

        if (rows.length <= 0) {
            return res.status(404).json({ message: 'Lugar no encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Algo salio Mal', error: error.message });
    }
};

//Obtener Las Categorias
export const getCategorias = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM categorias');
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Algo salio Mal' });
    }
};

//Obtener las Provincias
export const getProvincias = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM provincias');
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Algo salio Mal' });
    }
};