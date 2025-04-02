/**
 * WMS 자재 관리 시스템 스크립트
 * 정렬 기능 및 기타 인터랙션 관련 로직
 */

// DOM이 로드되면 실행
document.addEventListener('DOMContentLoaded', () => {
  // 데이터 로드, 완료 메시지
  console.log('자재 관리 시스템이 로드되었습니다.');

  // 테이블 정렬 기능
  const table = document.querySelector('.table');
  if (table) {
    const headers = table.querySelectorAll('th.sortable');
    let currentSort = {
      column: null,
      direction: 'asc'
    };

    // 초기 정렬 아이콘 표시
    headers.forEach(header => {
      header.classList.add('sortable');
    });

    headers.forEach(header => {
      header.addEventListener('click', () => {
        const column = header.dataset.sort;
        const direction = currentSort.column === column && currentSort.direction === 'asc' ? 'desc' : 'asc';
        
        // 정렬 방향 표시 아이콘 업데이트
        headers.forEach(h => {
          h.classList.remove('sort-asc', 'sort-desc');
          if (h.dataset.sort === column) {
            h.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
          }
        });

        // 테이블 정렬
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));

        rows.sort((a, b) => {
          const aValue = a.querySelectorAll('td')[Array.from(header.parentElement.children).indexOf(header)].textContent;
          const bValue = b.querySelectorAll('td')[Array.from(header.parentElement.children).indexOf(header)].textContent;

          // 숫자 정렬
          if (!isNaN(aValue) && !isNaN(bValue)) {
            return direction === 'asc' 
              ? parseFloat(aValue.replace(/,/g, '')) - parseFloat(bValue.replace(/,/g, ''))
              : parseFloat(bValue.replace(/,/g, '')) - parseFloat(aValue.replace(/,/g, ''));
          }

          // 문자열 정렬
          return direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        });

        // 정렬된 행을 테이블에 다시 추가
        rows.forEach(row => tbody.appendChild(row));

        currentSort = { column, direction };
      });
    });
  }
}); 