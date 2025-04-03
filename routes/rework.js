const express = require('express');
const router = express.Router();
const db = require('../db');

// 재작업 페이지 렌더링
router.get('/', async (req, res) => {
  try {
    // 기간 필터 파라미터 처리
    const startDate = req.query.startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const endDate = req.query.endDate || new Date().toISOString().split('T')[0];

    // 재작업 상태 정보 조회
    const [statusRows] = await db.query('SELECT * FROM rework_status ORDER BY RNumber');
    const statusMap = statusRows.reduce((acc, row) => {
      acc[row.RNumber] = row.RStatus;
      return acc;
    }, {});

    // 대기 중인 재작업 데이터 조회
    const [reworkWait] = await db.query('SELECT * FROM rework_w000_wait ORDER BY InDate DESC');

    // 출고된 재작업 데이터 조회
    const [reworkOut] = await db.query(`
      SELECT 
        Seq,
        Mat,
        OutDate,
        OutQty,
        LastQty,
        OutCom,
        OStatus
        -- MatSeq 컬럼은 필요시 추가
      FROM rework_w000_out
      WHERE DATE(OutDate) BETWEEN ? AND ?
      ORDER BY OutDate DESC
    `, [startDate, endDate]);

    // 입고된 재작업 데이터 조회
    const [reworkIn] = await db.query(`
      SELECT 
        Seq,
        Mat,
        InDate,
        OrgQty,
        InTotalQty,
        InQty,
        InBad,
        InNormal,
        InPattern,
        InMisc,
        InStatus,
        Memo
        -- OutSeq, MatInSeq 컬럼은 필요시 추가
      FROM rework_w000_in
      WHERE DATE(InDate) BETWEEN ? AND ?
      ORDER BY InDate DESC
    `, [startDate, endDate]);

    // 임시 데이터 (나중에 실제 데이터로 교체)
    const reworkCompleted = [];

    res.render('rework', {
      title: '재작업 관리',
      startDate,
      endDate,
      reworkWait,
      reworkOut,
      reworkIn,
      reworkCompleted,
      statusMap
    });
  } catch (error) {
    console.error('재작업 페이지 로드 중 오류:', error);
    res.status(500).send('서버 오류가 발생했습니다.');
  }
});

module.exports = router; 