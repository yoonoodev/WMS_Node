const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const regrindRouter = require('./routes/regrind');
const reworkRouter = require('./routes/rework');

const app = express();
const PORT = process.env.PORT || 3000;

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// body-parser 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// EJS 템플릿 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 라우터 등록
app.use('/regrind', regrindRouter);
app.use('/rework', reworkRouter);

// MySQL 연결 풀 생성
const pool = mysql.createPool({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: 'dbsngood2',
  database: 'WMSQR',
  charset: 'UTF8'
});

// 데이터베이스 연결 테스트
app.get('/test-db', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    console.log('데이터베이스 연결 성공');
    
    // 테이블 목록 확인
    const [tables] = await connection.query('SHOW TABLES');
    console.log('테이블 목록:', tables);
    
    // materialmng 테이블의 대체 이름 찾기
    let tableStructure = null;
    let correctTableName = null;
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      try {
        const [structure] = await connection.query(`DESCRIBE ${tableName}`);
        console.log(`${tableName} 테이블 구조:`, structure);
        
        // 테이블이 MatCode나 ComName 필드를 가지고 있는지 확인
        if (structure.some(field => field.Field === 'MatCode' || field.Field === 'ComName')) {
          console.log(`자재 관리와 관련된 테이블 발견: ${tableName}`);
          tableStructure = structure;
          correctTableName = tableName;
          
          // 테이블 데이터 샘플 확인
          const [rows] = await connection.query(`SELECT * FROM ${tableName} LIMIT 5`);
          console.log(`${tableName} 데이터 샘플:`, rows);
          break;
        }
      } catch (err) {
        console.error(`${tableName} 테이블 구조 확인 중 오류:`, err);
      }
    }
    
    connection.release();
    res.json({ tables, correctTableName, tableStructure });
  } catch (err) {
    console.error('데이터베이스 테스트 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// Material과 제조사로 그룹화된 데이터 가져오기
async function getGroupedMaterials() {
  const connection = await pool.getConnection();
  try {
    // Material과 제조사별로 그룹화하여 집계 데이터 조회
    const [rows] = await connection.query(`
      SELECT 
        m.MatCode AS material, 
        m.ComName AS manufacturer,
        SUM(m.QTY) AS total_quantity,
        
        /* 양품 수량 = 렉 수량 + 완료 수량으로 변경 */
        SUM(CASE 
          WHEN m.Loc1 NOT IN ('검사', '보관', '완료', '불량', '예정', '기타') THEN m.QTY 
          ELSE 0 
        END) + SUM(CASE WHEN m.Loc1 = '완료' THEN m.QTY ELSE 0 END) AS good_quantity,
        
        /* Loc1 값에 따른 항목별 합계 */
        SUM(CASE 
          WHEN m.Loc1 NOT IN ('검사', '보관', '완료', '불량', '예정', '기타') THEN m.QTY 
          ELSE 0 
        END) AS rack,
        
        SUM(CASE WHEN m.Loc1 = '검사' THEN m.QTY ELSE 0 END) AS inspection,
        SUM(CASE WHEN m.Loc1 = '보관' THEN m.QTY ELSE 0 END) AS storage,
        SUM(CASE WHEN m.Loc1 = '완료' THEN m.QTY ELSE 0 END) AS completed,
        SUM(CASE WHEN m.Loc1 = '불량' THEN m.QTY ELSE 0 END) AS defective,
        SUM(CASE WHEN m.Loc1 = '예정' THEN m.QTY ELSE 0 END) AS scheduled,
        SUM(CASE WHEN m.Loc1 = '기타' THEN m.QTY ELSE 0 END) AS etc_qty,
        
        /* 보관 위치 정보 */
        GROUP_CONCAT(DISTINCT CONCAT(m.Loc1, '-', m.Loc2) SEPARATOR ', ') AS storage_locations,
        
        /* 검사 상태 */
        MAX(m.InStatus) AS inspection_status,
        
        /* 기타 정보 */
        GROUP_CONCAT(DISTINCT m.InDate SEPARATOR ', ') AS etc_info,
        
        /* maker를 info_prdcompany_mng 테이블의 comcode로 변경 */
        IFNULL(p.comcode, m.ComName) AS maker
      FROM materialmng m
      LEFT JOIN info_prdcompany_mng p ON m.ComName = p.comname
      GROUP BY m.MatCode, m.ComName
      ORDER BY m.ComName, m.MatCode
    `);
    
    return rows;
  } catch (err) {
    console.error('그룹화된 데이터 조회 오류:', err);
    throw err;
  } finally {
    connection.release();
  }
}

// 메인 페이지 라우트
app.get('/', async (req, res) => {
  try {
    // 그룹화된 자재 데이터 가져오기
    const groupedMaterials = await getGroupedMaterials();
    
    // 테이블의 전체 레코드 수 가져오기
    const connection = await pool.getConnection();
    const [totalRecords] = await connection.query('SELECT COUNT(*) as total FROM materialmng');
    
    // 제조사-Material 조합 수 계산 (총 자재 종류로 표시)
    const [materialComboCount] = await connection.query(`
      SELECT COUNT(*) as total FROM (
        SELECT DISTINCT MatCode, ComName FROM materialmng
      ) as distinct_materials
    `);
    
    connection.release();
    
    // 통계 데이터 계산
    const uniqueMaterials = new Set(groupedMaterials.map(item => item.material));
    const uniqueManufacturers = new Set(groupedMaterials.map(item => item.manufacturer));
    const totalQuantity = groupedMaterials.reduce((sum, item) => sum + parseInt(item.total_quantity || 0), 0);
    
    // 데이터를 뷰로 전달
    res.render('index', { 
      materials: groupedMaterials,
      stats: {
        materialCount: materialComboCount[0].total, // 제조사-Material 조합 수
        manufacturerCount: uniqueManufacturers.size,
        totalQuantity: totalQuantity,
        totalRecords: totalRecords[0].total
      }
    });
  } catch (err) {
    console.error('데이터베이스 오류:', err);
    res.status(500).send('서버 오류가 발생했습니다: ' + err.message);
  }
});

// 자재 관리 페이지 라우트
app.get('/manage', async (req, res) => {
  try {
    // 데이터베이스에서 모든 자재 목록 가져오기 (수량이 0보다 큰 것만)
    const connection = await pool.getConnection();
    const [materials] = await connection.query(`
      SELECT 
        SEQ as id, 
        MatCode AS material, 
        ComName AS manufacturer, 
        QTY AS quantity, 
        Loc1 AS location1, 
        Loc2 AS location2, 
        InStatus AS status, 
        InDate AS date
      FROM materialmng
      WHERE QTY > 0
      ORDER BY SEQ DESC
    `);
    connection.release();
    
    res.render('manage', { materials });
  } catch (err) {
    console.error('자재 관리 페이지 로드 오류:', err);
    res.status(500).send('서버 오류가 발생했습니다: ' + err.message);
  }
});

// 자재 추가 API
app.post('/api/materials', async (req, res) => {
  try {
    const { material, manufacturer, quantity, location1, location2, status, date } = req.body;
    
    // 필수 필드 검증
    if (!material || !manufacturer || !quantity) {
      return res.status(400).json({ error: '자재코드, 제조사, 수량은 필수 입력 항목입니다.' });
    }
    
    const connection = await pool.getConnection();
    await connection.query(`
      INSERT INTO materialmng 
      (MatCode, ComName, QTY, Loc1, Loc2, InStatus, InDate) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [material, manufacturer, quantity, location1 || null, location2 || null, status || null, date || null]);
    
    connection.release();
    res.status(201).json({ success: true, message: '자재가 추가되었습니다.' });
  } catch (err) {
    console.error('자재 추가 오류:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다: ' + err.message });
  }
});

// 자재 수정 API
app.put('/api/materials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { material, manufacturer, quantity, location1, location2, status, date } = req.body;
    
    // 필수 필드 검증
    if (!material || !manufacturer || !quantity) {
      return res.status(400).json({ error: '자재코드, 제조사, 수량은 필수 입력 항목입니다.' });
    }
    
    const connection = await pool.getConnection();
    await connection.query(`
      UPDATE materialmng 
      SET MatCode = ?, ComName = ?, QTY = ?, Loc1 = ?, Loc2 = ?, InStatus = ?, InDate = ? 
      WHERE SEQ = ?
    `, [material, manufacturer, quantity, location1 || null, location2 || null, status || null, date || null, id]);
    
    connection.release();
    res.json({ success: true, message: '자재가 수정되었습니다.' });
  } catch (err) {
    console.error('자재 수정 오류:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다: ' + err.message });
  }
});

// 자재 삭제 API
app.delete('/api/materials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const connection = await pool.getConnection();
    await connection.query('DELETE FROM materialmng WHERE SEQ = ?', [id]);
    
    connection.release();
    res.json({ success: true, message: '자재가 삭제되었습니다.' });
  } catch (err) {
    console.error('자재 삭제 오류:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다: ' + err.message });
  }
});

// 재작업 페이지 라우트
app.get('/rework', async (req, res) => {
  try {
    // 기간 파라미터 처리
    const startDate = req.query.startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const endDate = req.query.endDate || new Date().toISOString().split('T')[0];

    // 재작업 상태 정보 조회
    const [statusRows] = await pool.query('SELECT * FROM rework_status ORDER BY RNumber');
    const statusMap = statusRows.reduce((acc, row) => {
      acc[row.RNumber] = row.RStatus;
      return acc;
    }, {});

    // 대기 중인 재작업 데이터 조회
    const [reworkWait] = await pool.query(`
      SELECT 
        Seq,
        Mat as material,
        MQty as quantity,
        InDate as date,
        Misc as memo
      FROM rework_w000_wait 
      WHERE DATE(InDate) BETWEEN ? AND ?
      ORDER BY InDate DESC
    `, [startDate, endDate]);
    
    // 출고된 재작업 데이터 조회
    const [reworkOut] = await pool.query(`
      SELECT 
        Seq,
        Mat as material,
        OutDate as date,
        OutQty as quantity,
        LastQty as last_quantity,
        OutCom as company,
        OStatus as status,
        MatSeq as material_seq
      FROM rework_w000_out 
      WHERE DATE(OutDate) BETWEEN ? AND ?
      ORDER BY OutDate DESC
    `, [startDate, endDate]);
    
    // 입고된 재작업 데이터 조회
    const [reworkIn] = await pool.query(`
      SELECT 
        Seq,
        OutSeq as out_seq,
        Mat as material,
        InDate as date,
        OrgQty as original_quantity,
        InTotalQty as total_quantity,
        InQty as quantity,
        InBad as bad_quantity,
        InNormal as normal_quantity,
        InPattern as normal_quantity,
        InPattern as pattern_quantity,
        InMisc as misc_quantity,
        InStatus as status,
        Memo as memo,
        MatInSeq as material_in_seq
      FROM rework_w000_in 
      WHERE DATE(InDate) BETWEEN ? AND ?
      ORDER BY InDate DESC
    `, [startDate, endDate]);

    // 완료된 재작업 데이터 조회
    const [reworkCompleted] = await pool.query(`
      SELECT 
        Seq,
        OutSeq as out_seq,
        Mat as material,
        InDate as date,
        OrgQty as original_quantity,
        InTotalQty as total_quantity,
        InQty as quantity,
        InBad as bad_quantity,
        InNormal as normal_quantity,
        InPattern as normal_quantity,
        InPattern as pattern_quantity,
        InMisc as misc_quantity,
        InStatus as status,
        Memo as memo,
        MatInSeq as material_in_seq
      FROM rework_w000_in 
      WHERE InStatus = 7 AND DATE(InDate) BETWEEN ? AND ?
      ORDER BY InDate DESC
    `, [startDate, endDate]);

    res.render('rework', {
      reworkWait: reworkWait,
      reworkOut: reworkOut,
      reworkIn: reworkIn,
      reworkCompleted: reworkCompleted,
      statusMap: statusMap,
      startDate: startDate,
      endDate: endDate
    });
  } catch (err) {
    console.error('재작업 데이터 조회 중 오류 발생:', err);
    res.status(500).send('서버 오류가 발생했습니다.');
  }
});

// 재연마 페이지 라우트
app.get('/regrind', async (req, res) => {
  try {
    // 기간 파라미터 처리
    const startDate = req.query.startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const endDate = req.query.endDate || new Date().toISOString().split('T')[0];

    // 재작업 상태 정보 조회 (재연마도 같은 상태 테이블 사용)
    const [statusRows] = await pool.query('SELECT * FROM rework_status ORDER BY RNumber');
    const statusMap = statusRows.reduce((acc, row) => {
      acc[row.RNumber] = row.RStatus;
      return acc;
    }, {});

    // 대기 중인 재연마 데이터 조회
    const [regrindWait] = await pool.query(`
      SELECT 
        Seq,
        Mat as material,
        TotalQty as quantity,
        InDate as date,
        Misc as memo
      FROM rework_w001_wait 
      WHERE DATE(InDate) BETWEEN ? AND ?
      ORDER BY InDate DESC
    `, [startDate, endDate]);
    
    // 출고된 재연마 데이터 조회
    const [regrindOut] = await pool.query(`
      SELECT 
        Seq,
        Mat as material,
        OutDate as date,
        OutQty as quantity,
        LastQty as last_quantity,
        OutCom as company,
        OStatus as status
      FROM rework_w001_out 
      WHERE DATE(OutDate) BETWEEN ? AND ?
      ORDER BY OutDate DESC
    `, [startDate, endDate]);
    
    // 입고된 재연마 데이터 조회
    const [regrindIn] = await pool.query(`
      SELECT 
        Seq,
        OutSeq as out_seq,
        Mat as material,
        InDate as date,
        OutQty as original_quantity,
        InGoodQty as good_quantity,
        InWonBadQty as won_bad_quantity,
        InGongBadQty as gong_bad_quantity,
        MiscQty as misc_quantity,
        GoodMatQty as good_mat_quantity,
        OStatus as status,
        Memo as memo,
        MatSeq as material_in_seq
      FROM rework_w001_in 
      WHERE DATE(InDate) BETWEEN ? AND ?
      ORDER BY InDate DESC
    `, [startDate, endDate]);

    // 완료된 재연마 데이터 조회
    const [regrindCompleted] = await pool.query(`
      SELECT 
        Seq,
        OutSeq as out_seq,
        Mat as material,
        InDate as date,
        OutQty as original_quantity,
        InGoodQty as good_quantity,
        InWonBadQty as won_bad_quantity,
        InGongBadQty as gong_bad_quantity,
        MiscQty as misc_quantity,
        GoodMatQty as good_mat_quantity,
        OStatus as status,
        Memo as memo,
        MatSeq as material_in_seq
      FROM rework_w001_in 
      WHERE OStatus = 7 AND DATE(InDate) BETWEEN ? AND ?
      ORDER BY InDate DESC
    `, [startDate, endDate]);

    res.render('regrind', {
      regrindWait: regrindWait,
      regrindOut: regrindOut,
      regrindIn: regrindIn,
      regrindCompleted: regrindCompleted,
      statusMap: statusMap,
      startDate: startDate,
      endDate: endDate
    });
  } catch (err) {
    console.error('재연마 데이터 조회 중 오류 발생:', err);
    res.status(500).send('서버 오류가 발생했습니다.');
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  console.log(`데이터베이스 연결 테스트: http://localhost:${PORT}/test-db`);
}); 