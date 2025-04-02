const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: 'dbsngood2',
  database: 'WMSQR',
  charset: 'UTF8'
});

module.exports = pool; 