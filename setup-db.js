const mysql = require('mysql2/promise');

const init = async () => {
  let connection;
  
  try {
    // 초기 DB 연결 (데이터베이스 지정 없이)
    console.log('MySQL 서버에 연결 중...');
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3307,
      user: 'root',
      password: 'dbsngood2'
    });
    
    console.log('MySQL 서버 연결 성공!');
    
    // WMSQR 데이터베이스 생성 (없는 경우)
    console.log('WMSQR 데이터베이스 생성 중...');
    await connection.query('CREATE DATABASE IF NOT EXISTS WMSQR CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('WMSQR 데이터베이스 생성 완료!');
    
    // WMSQR 데이터베이스 사용
    await connection.query('USE WMSQR');
    
    // materialmng 테이블 생성
    console.log('materialmng 테이블 생성 중...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS materialmng (
        id INT AUTO_INCREMENT PRIMARY KEY,
        MATERIAL VARCHAR(100),
        MANUFACTURER VARCHAR(100),
        TOTAL_QUANTITY INT,
        GOOD_QUANTITY INT,
        WASTE_QUANTITY INT,
        INSPECTION VARCHAR(100),
        STORAGE VARCHAR(100),
        ITEM VARCHAR(100),
        DEFECT INT,
        SCHEDULED INT,
        ETC VARCHAR(255),
        MAKER VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('materialmng 테이블 생성 완료!');
    
    // 샘플 데이터 입력
    console.log('샘플 데이터 추가 중...');
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM materialmng');
    if (rows[0].count === 0) {
      await connection.query(`
        INSERT INTO materialmng 
        (MATERIAL, MANUFACTURER, TOTAL_QUANTITY, GOOD_QUANTITY, WASTE_QUANTITY, INSPECTION, STORAGE, ITEM, DEFECT, SCHEDULED, ETC, MAKER)
        VALUES
        ('M001', '삼성전자', 100, 90, 5, '완료', '창고A', '반도체', 2, 3, '', '홍길동'),
        ('M002', 'LG전자', 150, 140, 3, '진행중', '창고B', '디스플레이', 5, 2, '긴급', '김철수'),
        ('M003', 'SK하이닉스', 200, 190, 2, '대기중', '창고A', '메모리', 3, 5, '', '이영희'),
        ('M004', '현대자동차', 80, 75, 5, '완료', '창고C', '모터', 0, 0, '', '박민수'),
        ('M005', 'KT', 120, 110, 8, '진행중', '창고B', '통신장비', 2, 0, '품질검사 필요', '최지영')
      `);
      console.log('샘플 데이터 추가 완료!');
    } else {
      console.log('기존 데이터가 있어 샘플 데이터를 추가하지 않았습니다.');
    }
    
    console.log('데이터베이스 초기화가 완료되었습니다!');
    
  } catch (err) {
    console.error('데이터베이스 초기화 오류:', err);
  } finally {
    if (connection) {
      await connection.end();
      console.log('데이터베이스 연결이 종료되었습니다.');
    }
  }
};

// 실행
init(); 