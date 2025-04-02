const express = require('express');
const router = express.Router();
const db = require('../db');

// 재연마 페이지 렌더링
router.get('/', async (req, res) => {
  try {
    // 기간 필터 파라미터 처리
    const startDate = req.query.startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const endDate = req.query.endDate || new Date().toISOString().split('T')[0];

    console.log('조회 기간:', { startDate, endDate });

    // 재작업 상태 정보 조회
    const [statusRows] = await db.query('SELECT * FROM rework_status ORDER BY RNumber');
    console.log('상태 정보:', statusRows);
    
    const statusMap = statusRows.reduce((acc, row) => {
      acc[row.RNumber] = row.RStatus;
      return acc;
    }, {});
    console.log('상태 매핑:', statusMap);

    // 대기 중인 재연마 데이터 조회 (기간 필터 제거)
    const [regrindWait] = await db.query(`
      SELECT 
        Seq,
        Mat,
        TotalQty,
        NormalQty,
        PatternQty,
        InDate,
        OStatus,
        Misc
      FROM rework_w001_wait
      ORDER BY InDate DESC
    `);
    console.log('대기 중인 재연마 데이터:', regrindWait);

    // 임시 데이터 (나중에 실제 데이터로 교체)
    const regrindOut = [];
    const regrindIn = [];
    const regrindCompleted = [];

    res.render('regrind', {
      title: '재연마 관리',
      startDate,
      endDate,
      regrindWait,
      regrindOut,
      regrindIn,
      regrindCompleted,
      statusMap
    });
  } catch (error) {
    console.error('재연마 페이지 로드 중 오류:', error);
    res.status(500).send('서버 오류가 발생했습니다.');
  }
});

module.exports = router; 