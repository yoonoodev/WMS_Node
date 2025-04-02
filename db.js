const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'svc.sel4.cloudtype.app',
  port: '30408',
  user: 'root',
  password: 'dbsngood2',
  database: 'enttdb',
  charset: 'UTF8'
    //host: 'localhost',
    //port: 3307,
    //user: 'root',
    //password: 'dbsngood2',
    //database: 'WMSQR',
    //charset: 'UTF8'
});

module.exports = pool; 