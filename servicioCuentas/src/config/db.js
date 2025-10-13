// src/config/db.js
import { createPool } from 'mysql2/promise';
import 'dotenv/config';

export const pool = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT || 3310,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});