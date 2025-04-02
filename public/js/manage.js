/**
 * WMS 자재 관리 시스템 - 자재 관리 페이지 스크립트
 * 자재의 추가, 수정, 삭제 기능 구현
 */

document.addEventListener('DOMContentLoaded', () => {
  // 요소 참조
  const materialModal = document.getElementById('materialModal');
  const deleteModal = document.getElementById('deleteModal');
  const addMaterialBtn = document.getElementById('addMaterialBtn');
  const materialForm = document.getElementById('materialForm');
  const modalTitle = document.getElementById('modalTitle');
  const materialId = document.getElementById('materialId');
  const deleteId = document.getElementById('deleteId');
  const confirmDeleteBtn = document.getElementById('confirmDelete');
  
  // 폼 필드 참조
  const materialInput = document.getElementById('material');
  const manufacturerInput = document.getElementById('manufacturer');
  const quantityInput = document.getElementById('quantity');
  const location1Input = document.getElementById('location1');
  const location2Input = document.getElementById('location2');
  const statusInput = document.getElementById('status');
  const dateInput = document.getElementById('date');
  
  // 모달 닫기 버튼 이벤트 설정
  document.querySelectorAll('.modal-close, .btn-cancel').forEach(button => {
    button.addEventListener('click', () => {
      materialModal.style.display = 'none';
      deleteModal.style.display = 'none';
    });
  });
  
  // 모달 외부 클릭 시 닫기
  window.addEventListener('click', (event) => {
    if (event.target === materialModal) {
      materialModal.style.display = 'none';
    } else if (event.target === deleteModal) {
      deleteModal.style.display = 'none';
    }
  });
  
  // 신규 자재 추가 버튼 클릭 이벤트
  addMaterialBtn.addEventListener('click', () => {
    // 폼 초기화
    modalTitle.textContent = '자재 추가';
    materialForm.reset();
    materialId.value = '';
    
    // 날짜 필드에 오늘 날짜 설정
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    
    // 모달 표시
    materialModal.style.display = 'block';
    materialInput.focus();
  });
  
  // 수정 버튼 클릭 이벤트
  document.querySelectorAll('.btn-edit').forEach(button => {
    button.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const row = document.querySelector(`tr[data-id="${id}"]`);
      
      if (row) {
        const cells = row.querySelectorAll('td');
        
        // 폼에 기존 데이터 설정
        materialId.value = id;
        materialInput.value = cells[1].textContent;
        manufacturerInput.value = cells[2].textContent;
        quantityInput.value = cells[3].textContent;
        location1Input.value = cells[4].textContent;
        location2Input.value = cells[5].textContent;
        statusInput.value = cells[6].textContent;
        
        // 날짜 형식 변환 (YYYY-MM-DD)
        let date = cells[7].textContent;
        if (date) {
          try {
            // 한국어 날짜 형식을 YYYY-MM-DD로 변환
            date = new Date(date).toISOString().split('T')[0];
          } catch (error) {
            console.error('날짜 변환 오류:', error);
            date = '';
          }
        }
        dateInput.value = date;
        
        // 모달 타이틀 변경 및 표시
        modalTitle.textContent = '자재 수정';
        materialModal.style.display = 'block';
        materialInput.focus();
      }
    });
  });
  
  // 삭제 버튼 클릭 이벤트
  document.querySelectorAll('.btn-delete').forEach(button => {
    button.addEventListener('click', (e) => {
      deleteId.value = e.currentTarget.dataset.id;
      deleteModal.style.display = 'block';
    });
  });
  
  // 삭제 확인 버튼 클릭 이벤트
  confirmDeleteBtn.addEventListener('click', async () => {
    const id = deleteId.value;
    
    if (id) {
      try {
        // 삭제 API 호출
        const response = await fetch(`/api/materials/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          // 성공적으로 삭제되면 화면에서 해당 행 제거
          const result = await response.json();
          const row = document.querySelector(`tr[data-id="${id}"]`);
          
          if (row) {
            row.remove();
          }
          
          // 모달 닫기
          deleteModal.style.display = 'none';
          
          // 데이터가 없는 경우 "데이터 없음" 메시지 표시
          const tbody = document.querySelector('.material-table tbody');
          if (tbody.querySelectorAll('tr').length === 0) {
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = '<td colspan="9" class="no-data">등록된 자재가 없습니다.</td>';
            tbody.appendChild(noDataRow);
          }
          
          // 성공 메시지 표시
          showAlert(result.message, 'success');
        } else {
          const error = await response.json();
          throw new Error(error.error || '삭제 중 오류가 발생했습니다.');
        }
      } catch (error) {
        showAlert(error.message, 'error');
      }
    }
  });
  
  // 폼 제출 이벤트
  materialForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 폼 데이터 수집
    const data = {
      material: materialInput.value,
      manufacturer: manufacturerInput.value,
      quantity: quantityInput.value,
      location1: location1Input.value,
      location2: location2Input.value,
      status: statusInput.value,
      date: dateInput.value
    };
    
    try {
      // ID가 있으면 수정, 없으면 추가
      const id = materialId.value;
      const url = id ? `/api/materials/${id}` : '/api/materials';
      const method = id ? 'PUT' : 'POST';
      
      // API 호출
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // 모달 닫기
        materialModal.style.display = 'none';
        
        // 페이지 새로고침으로 데이터 갱신
        showAlert(result.message, 'success', () => {
          window.location.reload();
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || '저장 중 오류가 발생했습니다.');
      }
    } catch (error) {
      showAlert(error.message, 'error');
    }
  });
  
  /**
   * 알림 메시지를 표시하는 함수
   * @param {string} message - 표시할 메시지
   * @param {string} type - 알림 유형 ('success' 또는 'error')
   * @param {Function} callback - 알림이 닫힌 후 실행할 콜백 함수
   */
  function showAlert(message, type = 'success', callback) {
    // 기존 알림 제거
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
      existingAlert.remove();
    }
    
    // 새 알림 생성
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    // 닫기 버튼 추가
    const closeBtn = document.createElement('button');
    closeBtn.className = 'alert-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
      alert.remove();
      if (callback) callback();
    });
    
    alert.appendChild(closeBtn);
    document.body.appendChild(alert);
    
    // 3초 후 자동으로 닫기
    setTimeout(() => {
      if (document.body.contains(alert)) {
        alert.remove();
        if (callback) callback();
      }
    }, 3000);
  }
  
  // 알림 스타일 추가
  const style = document.createElement('style');
  style.textContent = `
    .alert {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 4px;
      max-width: 300px;
      font-weight: 500;
      z-index: 1000;
      animation: slideIn 0.3s;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    
    .alert-success {
      background-color: #2ecc71;
      color: white;
    }
    
    .alert-error {
      background-color: #e74c3c;
      color: white;
    }
    
    .alert-close {
      background: none;
      border: none;
      color: white;
      font-size: 1.2rem;
      position: absolute;
      top: 5px;
      right: 10px;
      cursor: pointer;
    }
    
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}); 