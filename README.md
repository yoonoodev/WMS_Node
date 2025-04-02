# 자재 관리 시스템 (WMS)

Node.js, Express 및 MySQL을 사용하여 구현된 자재 관리 시스템 웹 애플리케이션입니다.

## 주요 기능

- materialmng 테이블의 데이터를 웹 페이지에 표시
- 세련된 디자인의 반응형 UI
- 행 선택 기능

## 기술 스택

- **Backend**: Node.js, Express
- **Database**: MySQL
- **Frontend**: HTML, CSS, JavaScript
- **Template Engine**: EJS

## 설치 및 실행 방법

1. 프로젝트를 클론합니다.
   ```
   git clone <repository-url>
   cd WMS_Node
   ```

2. 필요한 패키지를 설치합니다.
   ```
   npm install
   ```

3. 애플리케이션을 실행합니다.
   ```
   npm start
   ```

4. 웹 브라우저에서 `http://localhost:3000`으로 접속합니다.

## 개발 모드로 실행하기

```
npm run dev
```

## 데이터베이스 설정

MySQL 데이터베이스가 필요합니다. 다음 설정을 사용합니다:

- 호스트: localhost
- 포트: 3307
- 데이터베이스: WMSQR
- 사용자: root
- 비밀번호: dbsngood2
- 문자 인코딩: UTF8 