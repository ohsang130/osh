/**
 * 부부 공동 가계부 Application Logic
 * Powered by Firebase Realtime Database for Zero-Config Instant Sync
 */

// Embedded Dedicated Firebase Cloud Config (User's Firebase DB)
const firebaseConfig = {
  databaseURL: "https://myhouse-ec415-default-rtdb.firebaseio.com"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// Global State
const state = {
  currentYear: 2026,
  currentMonth: 8,
  type: 'expense',
  selectedPayMethod: '현대카드',
  selectedCategory: '식비',
  editingTxId: null,
  activePayFilter: 'ALL',
  activeCategoryFilter: 'ALL',
  searchQuery: '',
  roomCode: 'myhouse-main-room', // Fixed shared room code so PC and mobile auto-connect!

  incomeCategories: ['급여', '추가수입', '기타수입', '보너스', '금융수입', '이월'],

  payMethods: [
    '현대카드', '신한카드', '오동백', '동백', '국민카드',
    '네이버포인트', '신한포인트', '현금', '통장입금', '오국민(쿠팡)'
  ],
  categories: [
    '식비', '생활비', '관리비', '가스비', '유류비', '하이패스',
    '구독인터넷', '외식', '여행지금', '네일', '미용실',
    '교통비', '운동', '의', '주', '연금', '대출이자',
    '소영', '의료비', '예비자금', '상연용돈', '소영용돈', '상헌용돈',
    '특수생활비', '보험', '통신비', '동생', '고정비',
    '주택청약', '청년', '투자', '학식', '적금'
  ],
  
  budgets: {
    '식비': 500000,
    '생활비': 300000,
    '관리비': 150000,
    '외식': 200000,
    '교통비': 100000,
    '통신비': 80000
  },

  transactions: []
};

// Initial Master Data (4월, 5월, 6월, 7월 전체 내역 완벽 구비)
const INITIAL_SAMPLE_DATA = [
  // ================= 4월 데이터 =================
  { id: 'm4-1', type: 'income', date: '2026-04-05', amount: 2470000, payMethod: '현금', category: '급여', memo: '4월 급여' },
  { id: 'm4-2', type: 'income', date: '2026-04-05', amount: 1500000, payMethod: '현금', category: '추가수입', memo: '연차비' },
  { id: 'm4-3', type: 'income', date: '2026-04-17', amount: 2295190, payMethod: '현금', category: '급여', memo: '4월 급여' },
  { id: 'm4-4', type: 'income', date: '2026-04-17', amount: 160000, payMethod: '현금', category: '급여', memo: '4월 급여' },

  { id: 'm4-5', type: 'expense', date: '2026-04-01', amount: 8900, payMethod: '동백', category: '학식', memo: '옹헤야' },
  { id: 'm4-6', type: 'expense', date: '2026-04-02', amount: 6600, payMethod: '동백', category: '학식', memo: '엘브리또' },
  { id: 'm4-7', type: 'expense', date: '2026-04-06', amount: 16500, payMethod: '동백', category: '학식', memo: '학식' },
  { id: 'm4-8', type: 'expense', date: '2026-04-10', amount: 400000, payMethod: '동백', category: '미용실', memo: '미용실' },
  { id: 'm4-9', type: 'expense', date: '2026-04-17', amount: 2300, payMethod: '동백', category: '학식', memo: 'gs' },
  { id: 'm4-10', type: 'expense', date: '2026-04-21', amount: 12000, payMethod: '동백', category: '네일', memo: '네일' },
  { id: 'm4-11', type: 'expense', date: '2026-04-24', amount: 15000, payMethod: '동백', category: '네일', memo: '네일' },
  { id: 'm4-12', type: 'expense', date: '2026-04-27', amount: 16500, payMethod: '동백', category: '학식', memo: '학식' },
  { id: 'm4-13', type: 'expense', date: '2026-04-29', amount: 3900, payMethod: '동백', category: '학식', memo: '김밥' },
  { id: 'm4-14', type: 'expense', date: '2026-04-29', amount: 1700, payMethod: '동백', category: '학식', memo: 'gs' },
  { id: 'm4-15', type: 'expense', date: '2026-04-18', amount: 30000, payMethod: '현금', category: '예비자금', memo: '미역' },
  { id: 'm4-16', type: 'expense', date: '2026-04-24', amount: 4000, payMethod: '현금', category: '상헌용돈', memo: '텐퍼' },
  { id: 'm4-17', type: 'expense', date: '2026-04-25', amount: 11200, payMethod: '현금', category: '생활비', memo: '신원약국' },

  { id: 'm4-18', type: 'expense', date: '2026-04-01', amount: 19000, payMethod: '신한카드', category: '생활비', memo: '다이소' },
  { id: 'm4-19', type: 'expense', date: '2026-04-02', amount: 23560, payMethod: '신한카드', category: '예비자금', memo: '쿠팡샴푸' },
  { id: 'm4-20', type: 'expense', date: '2026-04-03', amount: 109540, payMethod: '신한카드', category: '식비', memo: '이마트' },
  { id: 'm4-21', type: 'expense', date: '2026-04-03', amount: 1000, payMethod: '신한카드', category: '생활비', memo: '다이소' },
  { id: 'm4-22', type: 'expense', date: '2026-04-05', amount: 84000, payMethod: '신한카드', category: '여행자금', memo: '유진횟집(남해)' },
  { id: 'm4-23', type: 'expense', date: '2026-04-05', amount: 1000, payMethod: '신한카드', category: '소영용돈', memo: '엽서' },
  { id: 'm4-24', type: 'expense', date: '2026-04-05', amount: 1000, payMethod: '신한카드', category: '여행자금', memo: '아이스크림' },
  { id: 'm4-25', type: 'expense', date: '2026-04-05', amount: 13000, payMethod: '신한카드', category: '여행자금', memo: '카페노량' },
  { id: 'm4-26', type: 'expense', date: '2026-04-05', amount: 14820, payMethod: '신한카드', category: '식비', memo: '이마트' },
  { id: 'm4-27', type: 'expense', date: '2026-04-07', amount: 3280, payMethod: '신한카드', category: '식비', memo: '홈플러스' },
  { id: 'm4-28', type: 'expense', date: '2026-04-09', amount: 5000, payMethod: '신한카드', category: '학식', memo: '지지고' },
  { id: 'm4-29', type: 'expense', date: '2026-04-11', amount: 5000, payMethod: '신한카드', category: '식비', memo: '닭꼬치' },
  { id: 'm4-30', type: 'expense', date: '2026-04-12', amount: 19900, payMethod: '신한카드', category: '여행자금', memo: '쿠팡경주월드' },
  { id: 'm4-31', type: 'expense', date: '2026-04-13', amount: 2000, payMethod: '신한카드', category: '생활비', memo: '다이소' },
  { id: 'm4-32', type: 'expense', date: '2026-04-15', amount: 50000, payMethod: '신한카드', category: '운동', memo: '운동' },
  { id: 'm4-33', type: 'expense', date: '2026-04-18', amount: 76083, payMethod: '신한카드', category: '유류비', memo: '유류비' },
  { id: 'm4-34', type: 'expense', date: '2026-04-19', amount: 30000, payMethod: '신한카드', category: '생활비', memo: '다이소' },
  { id: 'm4-35', type: 'expense', date: '2026-04-19', amount: 4900, payMethod: '신한카드', category: '식비', memo: '베스킨' },
  { id: 'm4-36', type: 'expense', date: '2026-04-24', amount: 5000, payMethod: '신한카드', category: '학식', memo: '지지고' },
  { id: 'm4-37', type: 'expense', date: '2026-04-24', amount: 200540, payMethod: '신한카드', category: '관리비', memo: '관리비' },
  { id: 'm4-38', type: 'expense', date: '2026-04-25', amount: 9000, payMethod: '신한카드', category: '여행자금', memo: '경주월드' },
  { id: 'm4-39', type: 'expense', date: '2026-04-25', amount: 5000, payMethod: '신한카드', category: '여행자금', memo: '경주월드' },
  { id: 'm4-40', type: 'expense', date: '2026-04-25', amount: 4490, payMethod: '신한카드', category: '식비', memo: '홈플러스' },
  { id: 'm4-41', type: 'expense', date: '2026-04-30', amount: 21000, payMethod: '신한카드', category: '생활비', memo: '다이소' },
  { id: 'm4-42', type: 'expense', date: '2026-04-30', amount: 9800, payMethod: '신한카드', category: '식비', memo: '베스킨' },

  { id: 'm4-43', type: 'expense', date: '2026-04-01', amount: 4700, payMethod: '오국민(쿠팡)', category: '생활비', memo: '오랄비 왁스 치실' },
  { id: 'm4-44', type: 'expense', date: '2026-04-01', amount: 6010, payMethod: '오국민(쿠팡)', category: '식비', memo: '치킨스톡' },
  { id: 'm4-45', type: 'expense', date: '2026-04-01', amount: 4990, payMethod: '오국민(쿠팡)', category: '식비', memo: '츄러스' },
  { id: 'm4-46', type: 'expense', date: '2026-04-01', amount: 9060, payMethod: '오국민(쿠팡)', category: '생활비', memo: '치약' },
  { id: 'm4-47', type: 'expense', date: '2026-04-02', amount: 51100, payMethod: '오국민(쿠팡)', category: '예비자금', memo: '케라스타즈헤어팩' },
  { id: 'm4-48', type: 'expense', date: '2026-04-03', amount: 15800, payMethod: '오국민(쿠팡)', category: '생활비', memo: 'usb' },
  { id: 'm4-49', type: 'expense', date: '2026-04-04', amount: 6840, payMethod: '오국민(쿠팡)', category: '식비', memo: '토마 치즈' },
  { id: 'm4-50', type: 'expense', date: '2026-04-04', amount: 2520, payMethod: '오국민(쿠팡)', category: '식비', memo: '갈색설탕' },
  { id: 'm4-51', type: 'expense', date: '2026-04-04', amount: 5980, payMethod: '오국민(쿠팡)', category: '식비', memo: '감자' },
  { id: 'm4-52', type: 'expense', date: '2026-04-08', amount: 20350, payMethod: '오국민(쿠팡)', category: '식비', memo: '제주용암수' },
  { id: 'm4-53', type: 'expense', date: '2026-04-10', amount: 28800, payMethod: '오국민(쿠팡)', category: '예비자금', memo: '마와 36f' },
  { id: 'm4-54', type: 'expense', date: '2026-04-10', amount: 28000, payMethod: '오국민(쿠팡)', category: '예비자금', memo: '마와 36p' },
  { id: 'm4-55', type: 'expense', date: '2026-04-10', amount: 32080, payMethod: '오국민(쿠팡)', category: '예비자금', memo: '닥터워터 샤워기' },
  { id: 'm4-56', type: 'expense', date: '2026-04-12', amount: 19900, payMethod: '오국민(쿠팡)', category: '여행자금', memo: '쿠팡경주월드' },
  { id: 'm4-57', type: 'expense', date: '2026-04-13', amount: 8900, payMethod: '오국민(쿠팡)', category: '생활비', memo: '화장실매트' },
  { id: 'm4-58', type: 'expense', date: '2026-04-13', amount: 49750, payMethod: '오국민(쿠팡)', category: '예비자금', memo: '마카리조 허니 새럼' },
  { id: 'm4-59', type: 'expense', date: '2026-04-18', amount: 20350, payMethod: '오국민(쿠팡)', category: '식비', memo: '제주용암수' },
  { id: 'm4-60', type: 'expense', date: '2026-04-21', amount: 12320, payMethod: '오국민(쿠팡)', category: '식비', memo: '제주용암수' },
  { id: 'm4-61', type: 'expense', date: '2026-04-22', amount: 16730, payMethod: '오국민(쿠팡)', category: '식비', memo: '진료토닉' },
  { id: 'm4-62', type: 'expense', date: '2026-04-24', amount: 6910, payMethod: '오국민(쿠팡)', category: '식비', memo: '메이플시럽' },
  { id: 'm4-63', type: 'expense', date: '2026-04-24', amount: 1850, payMethod: '오국민(쿠팡)', category: '식비', memo: '라면사리' },
  { id: 'm4-64', type: 'expense', date: '2026-04-24', amount: 2070, payMethod: '오국민(쿠팡)', category: '식비', memo: '튀김가루' },
  { id: 'm4-65', type: 'expense', date: '2026-04-24', amount: 3790, payMethod: '오국민(쿠팡)', category: '식비', memo: '빠삐코' },
  { id: 'm4-66', type: 'expense', date: '2026-04-24', amount: 990, payMethod: '오국민(쿠팡)', category: '식비', memo: '팽이버섯' },
  { id: 'm4-67', type: 'expense', date: '2026-04-24', amount: 13530, payMethod: '오국민(쿠팡)', category: '식비', memo: '제로사이다' },

  { id: 'm4-68', type: 'expense', date: '2026-04-27', amount: 1290, payMethod: '현대카드', category: '식비', memo: 'gs (삼성)' },
  { id: 'm4-69', type: 'expense', date: '2026-04-22', amount: 3000, payMethod: '현대카드', category: '생활비', memo: '다이소' },
  { id: 'm4-70', type: 'expense', date: '2026-04-30', amount: 35100, payMethod: '현대카드', category: '하이패스', memo: '하이패스' },
  { id: 'm4-71', type: 'expense', date: '2026-04-12', amount: 29700, payMethod: '현대카드', category: '구독인터넷', memo: '구독인터넷' },

  // ================= 5월 데이터 =================
  { id: 'm5-1', type: 'income', date: '2026-05-04', amount: 2749300, payMethod: '현금', category: '급여', memo: '5월 급여' },
  { id: 'm5-2', type: 'income', date: '2026-05-04', amount: 300000, payMethod: '현금', category: '추가수입', memo: '상여금' },
  { id: 'm5-3', type: 'income', date: '2026-05-08', amount: 890000, payMethod: '현금', category: '추가수입', memo: '학생지도비' },
  { id: 'm5-4', type: 'income', date: '2026-05-15', amount: 2352790, payMethod: '현금', category: '급여', memo: '5월 급여' },
  { id: 'm5-5', type: 'income', date: '2026-05-15', amount: 160000, payMethod: '현금', category: '급여', memo: '5월 급여' },
  { id: 'm5-6', type: 'income', date: '2026-05-22', amount: 103770, payMethod: '현금', category: '추가수입', memo: '맞춤형복지비' },

  { id: 'm5-7', type: 'expense', date: '2026-05-04', amount: 7700, payMethod: '동백', category: '학식', memo: '맘스터치' },
  { id: 'm5-8', type: 'expense', date: '2026-05-06', amount: 3900, payMethod: '동백', category: '학식', memo: '김밥' },
  { id: 'm5-9', type: 'expense', date: '2026-05-09', amount: 12500, payMethod: '동백', category: '식비', memo: '빨간떡볶이' },
  { id: 'm5-10', type: 'expense', date: '2026-05-09', amount: 1400, payMethod: '동백', category: '식비', memo: '짱떡볶기' },
  { id: 'm5-11', type: 'expense', date: '2026-05-10', amount: 26900, payMethod: '동백', category: '식비', memo: '땡겨요치킨' },
  { id: 'm5-12', type: 'expense', date: '2026-05-11', amount: 8900, payMethod: '동백', category: '학식', memo: '옹헤야' },
  { id: 'm5-13', type: 'expense', date: '2026-05-18', amount: 12000, payMethod: '동백', category: '네일', memo: '네일' },
  { id: 'm5-14', type: 'expense', date: '2026-05-26', amount: 5500, payMethod: '동백', category: '학식', memo: '학식' },
  { id: 'm5-15', type: 'expense', date: '2026-05-26', amount: 15000, payMethod: '동백', category: '네일', memo: '네일' },
  { id: 'm5-16', type: 'expense', date: '2026-05-28', amount: 6500, payMethod: '동백', category: '학식', memo: '한솥' },

  { id: 'm5-17', type: 'expense', date: '2026-05-10', amount: 7600, payMethod: '오동백', category: '식비', memo: '김밥' },
  { id: 'm5-18', type: 'expense', date: '2026-05-10', amount: 3050, payMethod: '오동백', category: '식비', memo: '컵라면' },
  { id: 'm5-19', type: 'expense', date: '2026-05-10', amount: 4200, payMethod: '오동백', category: '식비', memo: '와플' },
  { id: 'm5-20', type: 'expense', date: '2026-05-17', amount: 18500, payMethod: '오동백', category: '식비', memo: '올드머그' },
  { id: 'm5-21', type: 'expense', date: '2026-05-18', amount: 6300, payMethod: '오동백', category: '상헌용돈', memo: '텐퍼' },
  { id: 'm5-22', type: 'expense', date: '2026-05-26', amount: 5500, payMethod: '오동백', category: '학식', memo: '학식' },
  { id: 'm5-23', type: 'expense', date: '2026-05-26', amount: 65500, payMethod: '오동백', category: '운동', memo: '운동' },
  { id: 'm5-24', type: 'expense', date: '2026-05-28', amount: 46500, payMethod: '오동백', category: '상헌용돈', memo: '모임' },

  { id: 'm5-25', type: 'expense', date: '2026-04-30', amount: 220100, payMethod: '오국민(쿠팡)', category: '생활비', memo: '에어팟' },
  { id: 'm5-26', type: 'expense', date: '2026-05-02', amount: 7930, payMethod: '오국민(쿠팡)', category: '생활비', memo: '에어팟케이스' },
  { id: 'm5-27', type: 'expense', date: '2026-05-10', amount: 14520, payMethod: '오국민(쿠팡)', category: '생활비', memo: '배게커버' },
  { id: 'm5-28', type: 'expense', date: '2026-05-10', amount: 3500, payMethod: '오국민(쿠팡)', category: '생활비', memo: '쌀씻기스틱' },
  { id: 'm5-29', type: 'expense', date: '2026-05-10', amount: 11590, payMethod: '오국민(쿠팡)', category: '생활비', memo: '먼지털이' },
  { id: 'm5-30', type: 'expense', date: '2026-05-16', amount: 9990, payMethod: '오국민(쿠팡)', category: '식비', memo: '계란' },
  { id: 'm5-31', type: 'expense', date: '2026-05-16', amount: 9660, payMethod: '오국민(쿠팡)', category: '식비', memo: '피자' },
  { id: 'm5-32', type: 'expense', date: '2026-05-18', amount: 5880, payMethod: '오국민(쿠팡)', category: '생활비', memo: '네일탑코트' },
  { id: 'm5-33', type: 'expense', date: '2026-05-23', amount: 7960, payMethod: '오국민(쿠팡)', category: '생활비', memo: '위스키밀봉' },
  { id: 'm5-34', type: 'expense', date: '2026-05-26', amount: 17500, payMethod: '오국민(쿠팡)', category: '생활비', memo: '파스타냄비' },
  { id: 'm5-35', type: 'expense', date: '2026-05-28', amount: 5970, payMethod: '오국민(쿠팡)', category: '생활비', memo: '밥주걱' },
  { id: 'm5-36', type: 'expense', date: '2026-05-31', amount: 16210, payMethod: '오국민(쿠팡)', category: '생활비', memo: '코세척' },

  { id: 'm5-37', type: 'expense', date: '2026-05-12', amount: 29700, payMethod: '현대카드', category: '구독인터넷', memo: '구독인터넷' },
  { id: 'm5-38', type: 'expense', date: '2026-05-12', amount: 25740, payMethod: '현대카드', category: '통신비', memo: '핸드폰' },
  { id: 'm5-39', type: 'expense', date: '2026-05-12', amount: 1900, payMethod: '현대카드', category: '구독인터넷', memo: '카카오(용량)' },
  { id: 'm5-40', type: 'expense', date: '2026-05-31', amount: 40000, payMethod: '현대카드', category: '하이패스', memo: '하이패스' },

  { id: 'm5-41', type: 'expense', date: '2026-05-22', amount: 46500, payMethod: '현금', category: '식비', memo: '그린피그 (고유가)' },
  { id: 'm5-42', type: 'expense', date: '2026-05-23', amount: 15000, payMethod: '현금', category: '식비', memo: '족발 (고유가)' },
  { id: 'm5-43', type: 'expense', date: '2026-05-23', amount: 19000, payMethod: '현금', category: '식비', memo: '수박 (고유가)' },

  { id: 'm5-44', type: 'expense', date: '2026-05-02', amount: 4700, payMethod: '신한카드', category: '식비', memo: '아이스크림' },
  { id: 'm5-45', type: 'expense', date: '2026-05-11', amount: 34890, payMethod: '신한카드', category: '통신비', memo: '통신비' },
  { id: 'm5-46', type: 'expense', date: '2026-05-12', amount: 10000, payMethod: '신한카드', category: '식비', memo: '닭강정' },
  { id: 'm5-47', type: 'expense', date: '2026-05-14', amount: 2000, payMethod: '신한카드', category: '생활비', memo: '주차' },
  { id: 'm5-48', type: 'expense', date: '2026-05-15', amount: 27695, payMethod: '신한카드', category: '보험', memo: '삼성' },
  { id: 'm5-49', type: 'expense', date: '2026-05-15', amount: 68000, payMethod: '신한카드', category: '유류비', memo: '유류비' },
  { id: 'm5-50', type: 'expense', date: '2026-05-15', amount: 81700, payMethod: '신한카드', category: '예비자금', memo: '이케아' },
  { id: 'm5-51', type: 'expense', date: '2026-05-15', amount: 4690, payMethod: '신한카드', category: '식비', memo: '이케아빵' },
  { id: 'm5-52', type: 'expense', date: '2026-05-16', amount: 3000, payMethod: '신한카드', category: '생활비', memo: '다이소' },
  { id: 'm5-53', type: 'expense', date: '2026-05-16', amount: 67820, payMethod: '신한카드', category: '식비', memo: '이마트' },
  { id: 'm5-54', type: 'expense', date: '2026-05-24', amount: 24000, payMethod: '신한카드', category: '여행자금', memo: '순정식당' },
  { id: 'm5-55', type: 'expense', date: '2026-05-24', amount: 19600, payMethod: '신한카드', category: '여행자금', memo: '아래홀딩스(카페)' },
  { id: 'm5-56', type: 'expense', date: '2026-05-26', amount: 50000, payMethod: '신한카드', category: '운동', memo: '운동' },
  { id: 'm5-57', type: 'expense', date: '2026-05-26', amount: 186560, payMethod: '신한카드', category: '관리비', memo: '관리비' },
  { id: 'm5-58', type: 'expense', date: '2026-05-30', amount: 174000, payMethod: '신한카드', category: '예비자금', memo: '반스' },

  { id: 'm5-59', type: 'expense', date: '2026-05-22', amount: 2700, payMethod: '현금', category: '학식', memo: '던킨 (고유가)' },
  { id: 'm5-60', type: 'expense', date: '2026-05-29', amount: 5000, payMethod: '현금', category: '학식', memo: '지지고 (고유가)' },
  { id: 'm5-61', type: 'expense', date: '2026-05-31', amount: 26000, payMethod: '현금', category: '식비', memo: '베라 (상품권)' },

  // ================= 6월 데이터 =================
  { id: 'm6-1', type: 'income', date: '2026-06-05', amount: 2484720, payMethod: '현금', category: '급여', memo: '5월 급여' },
  { id: 'm6-2', type: 'income', date: '2026-06-17', amount: 2512790, payMethod: '현금', category: '급여', memo: '6월 급여' },

  { id: 'm6-3', type: 'expense', date: '2026-06-05', amount: 700000, payMethod: '통장입금', category: '적금', memo: '청년 6월' },
  { id: 'm6-4', type: 'expense', date: '2026-06-29', amount: 100000, payMethod: '통장입금', category: '적금', memo: '투자 6월' },

  { id: 'm6-5', type: 'expense', date: '2026-06-14', amount: 50000, payMethod: '현금', category: '예비자금', memo: '메이축의금' },
  { id: 'm6-6', type: 'expense', date: '2026-06-18', amount: 69300, payMethod: '현금', category: '여행자금', memo: '워터파크카카오페이' },
  { id: 'm6-7', type: 'expense', date: '2026-06-18', amount: 40000, payMethod: '현금', category: '소영용돈', memo: '맥날모임' },
  { id: 'm6-8', type: 'expense', date: '2026-06-19', amount: 19900, payMethod: '네이버포인트', category: '소영용돈', memo: '드래곤이너백 (소영네이버)' },
  { id: 'm6-9', type: 'expense', date: '2026-06-20', amount: 25000, payMethod: '현금', category: '소영용돈', memo: '성민생일' },
  { id: 'm6-10', type: 'expense', date: '2026-06-25', amount: 42800, payMethod: '네이버포인트', category: '생활비', memo: '피노 쓰레기통 (소영네이버)' },
  { id: 'm6-11', type: 'expense', date: '2026-06-30', amount: 8000, payMethod: '현금', category: '교통비', memo: '교통비' },

  { id: 'm6-12', type: 'expense', date: '2026-06-07', amount: 3000, payMethod: '현대카드', category: '식비', memo: '바나나' },
  { id: 'm6-13', type: 'expense', date: '2026-06-07', amount: 3790, payMethod: '현대카드', category: '식비', memo: '게토레이' },
  { id: 'm6-14', type: 'expense', date: '2026-06-09', amount: 29700, payMethod: '현대카드', category: '구독인터넷', memo: '구독인터넷' },
  { id: 'm6-15', type: 'expense', date: '2026-06-09', amount: 1900, payMethod: '현대카드', category: '구독인터넷', memo: '카카오' },
  { id: 'm6-16', type: 'expense', date: '2026-06-15', amount: 69500, payMethod: '현대카드', category: '유류비', memo: '유류비 (고유가)' },
  { id: 'm6-17', type: 'expense', date: '2026-06-15', amount: 500, payMethod: '현대카드', category: '유류비', memo: '유류비' },
  { id: 'm6-18', type: 'expense', date: '2026-06-29', amount: 11500, payMethod: '현대카드', category: '하이패스', memo: '하이패스' },

  { id: 'm6-19', type: 'expense', date: '2026-06-04', amount: 22000, payMethod: '동백', category: '학식', memo: '학식' },
  { id: 'm6-20', type: 'expense', date: '2026-06-08', amount: 41600, payMethod: '동백', category: '의료비', memo: '진내과' },
  { id: 'm6-21', type: 'expense', date: '2026-06-08', amount: 4900, payMethod: '동백', category: '의료비', memo: '약국' },
  { id: 'm6-22', type: 'expense', date: '2026-06-08', amount: 14000, payMethod: '동백', category: '학식', memo: '본죽' },
  { id: 'm6-23', type: 'expense', date: '2026-06-08', amount: 12000, payMethod: '동백', category: '네일', memo: '네일' },
  { id: 'm6-24', type: 'expense', date: '2026-06-15', amount: 8500, payMethod: '동백', category: '학식', memo: '곁집' },
  { id: 'm6-25', type: 'expense', date: '2026-06-16', amount: 4000, payMethod: '동백', category: '의료비', memo: '진내과' },
  { id: 'm6-26', type: 'expense', date: '2026-06-16', amount: 5450, payMethod: '동백', category: '의료비', memo: '약국' },
  { id: 'm6-27', type: 'expense', date: '2026-06-17', amount: 6600, payMethod: '동백', category: '학식', memo: '엘부리또' },
  { id: 'm6-28', type: 'expense', date: '2026-06-20', amount: 15000, payMethod: '동백', category: '소영용돈', memo: '컵오브조이(채영)' },
  { id: 'm6-29', type: 'expense', date: '2026-06-25', amount: 15000, payMethod: '동백', category: '네일', memo: '네일' },
  { id: 'm6-30', type: 'expense', date: '2026-06-26', amount: 30000, payMethod: '동백', category: '예비자금', memo: '정음사-제본' },
  { id: 'm6-31', type: 'expense', date: '2026-06-26', amount: 6300, payMethod: '동백', category: '의료비', memo: '이비인후과' },
  { id: 'm6-32', type: 'expense', date: '2026-06-26', amount: 4900, payMethod: '동백', category: '의료비', memo: '약국' },
  { id: 'm6-33', type: 'expense', date: '2026-06-26', amount: 8500, payMethod: '동백', category: '학식', memo: '곁집' },
  { id: 'm6-34', type: 'expense', date: '2026-06-27', amount: 12200, payMethod: '동백', category: '예비자금', memo: '설빙' },
  { id: 'm6-35', type: 'expense', date: '2026-06-30', amount: 4700, payMethod: '동백', category: '의료비', memo: '이비인후과' },
  { id: 'm6-36', type: 'expense', date: '2026-06-30', amount: 7200, payMethod: '동백', category: '의료비', memo: '약국' },

  { id: 'm6-37', type: 'expense', date: '2026-06-01', amount: 7300, payMethod: '신한카드', category: '학식', memo: '맥도날드' },
  { id: 'm6-38', type: 'expense', date: '2026-06-06', amount: 59000, payMethod: '신한카드', category: '의', memo: 'LYNN' },
  { id: 'm6-39', type: 'expense', date: '2026-06-06', amount: 38800, payMethod: '신한카드', category: '의', memo: '지오다노(오' },
  { id: 'm6-40', type: 'expense', date: '2026-06-06', amount: 44500, payMethod: '신한카드', category: '생활비', memo: '다이소' },
  { id: 'm6-41', type: 'expense', date: '2026-06-06', amount: 96270, payMethod: '신한카드', category: '식비', memo: '이마트' },
  { id: 'm6-42', type: 'expense', date: '2026-06-07', amount: 48140, payMethod: '신한카드', category: '의', memo: '29CM신발' },
  { id: 'm6-43', type: 'expense', date: '2026-06-07', amount: 42110, payMethod: '신한카드', category: '의', memo: '29CM신발' },
  { id: 'm6-44', type: 'expense', date: '2026-06-09', amount: 34890, payMethod: '신한카드', category: '통신비', memo: '통신비' },
  { id: 'm6-45', type: 'expense', date: '2026-06-09', amount: 44550, payMethod: '신한카드', category: '의', memo: '지그재그상의' },
  { id: 'm6-46', type: 'expense', date: '2026-06-09', amount: 33330, payMethod: '신한카드', category: '의', memo: '29CM상의(오' },
  { id: 'm6-47', type: 'expense', date: '2026-06-12', amount: 334000, payMethod: '신한카드', category: '주', memo: '사전점검' },
  { id: 'm6-48', type: 'expense', date: '2026-06-13', amount: 21000, payMethod: '신한카드', category: '식비', memo: '배민 BHC' },
  { id: 'm6-49', type: 'expense', date: '2026-06-14', amount: 138570, payMethod: '신한카드', category: '식비', memo: '트레이더스' },
  { id: 'm6-50', type: 'expense', date: '2026-06-15', amount: 27695, payMethod: '신한카드', category: '보험', memo: '삼성화재' },
  { id: 'm6-51', type: 'expense', date: '2026-06-16', amount: 50000, payMethod: '신한카드', category: '운동', memo: '운동' },
  { id: 'm6-52', type: 'expense', date: '2026-06-18', amount: 433080, payMethod: '신한카드', category: '의', memo: '드래곤가방' },
  { id: 'm6-53', type: 'expense', date: '2026-06-20', amount: 3000, payMethod: '신한카드', category: '생활비', memo: '다이소' },
  { id: 'm6-54', type: 'expense', date: '2026-06-20', amount: 19800, payMethod: '신한카드', category: '주', memo: '이케아' },
  { id: 'm6-55', type: 'expense', date: '2026-06-20', amount: 98800, payMethod: '신한카드', category: '주', memo: '이케아' },
  { id: 'm6-56', type: 'expense', date: '2026-06-21', amount: 7000, payMethod: '신한카드', category: '생활비', memo: '다이소' },
  { id: 'm6-57', type: 'expense', date: '2026-06-24', amount: 306603, payMethod: '신한카드', category: '소영', memo: 'ADYEN/숙소' },
  { id: 'm6-58', type: 'expense', date: '2026-06-25', amount: 195020, payMethod: '신한카드', category: '관리비', memo: '관리비' },
  { id: 'm6-59', type: 'expense', date: '2026-06-26', amount: 4040, payMethod: '신한카드', category: '가스비', memo: '가스비' },
  { id: 'm6-60', type: 'expense', date: '2026-06-27', amount: 7670, payMethod: '신한카드', category: '식비', memo: '이마트' },
  { id: 'm6-61', type: 'expense', date: '2026-06-27', amount: 5000, payMethod: '신한카드', category: '생활비', memo: '다이소' },
  { id: 'm6-62', type: 'expense', date: '2026-06-29', amount: 37000, payMethod: '신한카드', category: '의', memo: '와이셔츠' },

  { id: 'm6-63', type: 'expense', date: '2026-06-04', amount: 15000, payMethod: '신한포인트', category: '식비', memo: '클룹두유' },
  { id: 'm6-64', type: 'expense', date: '2026-06-10', amount: 5000, payMethod: '현금', category: '학식', memo: '지지고 (고유가)' },
  { id: 'm6-65', type: 'expense', date: '2026-06-21', amount: 5000, payMethod: '현금', category: '생활비', memo: '다이소 (쿠폰)' },
  { id: 'm6-66', type: 'expense', date: '2026-06-03', amount: 1220000, payMethod: '현금', category: '소영', memo: '제주현무암' },
  { id: 'm6-67', type: 'expense', date: '2026-06-04', amount: 60600, payMethod: '네이버포인트', category: '식비', memo: '클룹' },

  { id: 'm6-68', type: 'expense', date: '2026-06-07', amount: 35000, payMethod: '오동백', category: '미용실', memo: '미용실' },
  { id: 'm6-69', type: 'expense', date: '2026-06-07', amount: 4200, payMethod: '오동백', category: '의료비', memo: '타이레놀' },
  { id: 'm6-70', type: 'expense', date: '2026-06-18', amount: 4400, payMethod: '오동백', category: '의료비', memo: '약국' },
  { id: 'm6-71', type: 'expense', date: '2026-06-20', amount: 2000, payMethod: '오동백', category: '상헌용돈', memo: '텐퍼센트' },
  { id: 'm6-72', type: 'expense', date: '2026-06-22', amount: 6800, payMethod: '오동백', category: '상헌용돈', memo: '텐퍼센트' },
  { id: 'm6-73', type: 'expense', date: '2026-06-23', amount: 65500, payMethod: '오동백', category: '운동', memo: '운동' },
  { id: 'm6-74', type: 'expense', date: '2026-06-27', amount: 188000, payMethod: '오동백', category: '예비자금', memo: '육선당(갈비)' },

  { id: 'm6-75', type: 'expense', date: '2026-06-01', amount: 2990, payMethod: '오국민(쿠팡)', category: '생활비', memo: '스퀴지' },
  { id: 'm6-76', type: 'expense', date: '2026-06-01', amount: 7800, payMethod: '오국민(쿠팡)', category: '생활비', memo: '고무장갑' },
  { id: 'm6-77', type: 'expense', date: '2026-06-01', amount: 15420, payMethod: '오국민(쿠팡)', category: '식비', memo: '코카콜라제로' },
  { id: 'm6-78', type: 'expense', date: '2026-06-06', amount: 7890, payMethod: '오국민(쿠팡)', category: '구독인터넷', memo: '쿠팡멤버쉽' },
  { id: 'm6-79', type: 'expense', date: '2026-06-10', amount: 7380, payMethod: '오국민(쿠팡)', category: '예비자금', memo: '엄마폰케이스' },
  { id: 'm6-80', type: 'expense', date: '2026-06-10', amount: 18720, payMethod: '오국민(쿠팡)', category: '생활비', memo: '아쿠아세럼' },
  { id: 'm6-81', type: 'expense', date: '2026-06-16', amount: 5900, payMethod: '오국민(쿠팡)', category: '생활비', memo: '만보기' },
  { id: 'm6-82', type: 'expense', date: '2026-06-17', amount: 12700, payMethod: '오국민(쿠팡)', category: '식비', memo: '소고기다시다' },
  { id: 'm6-83', type: 'expense', date: '2026-06-24', amount: 3000, payMethod: '오국민(쿠팡)', category: '생활비', memo: '압축진동' },
  { id: 'm6-84', type: 'expense', date: '2026-06-24', amount: 78430, payMethod: '오국민(쿠팡)', category: '생활비', memo: '오쿠선풍기' },
  { id: 'm6-85', type: 'expense', date: '2026-06-25', amount: 9900, payMethod: '오국민(쿠팡)', category: '생활비', memo: '자외선 마스크' },
  { id: 'm6-86', type: 'expense', date: '2026-06-25', amount: 20650, payMethod: '오국민(쿠팡)', category: '생활비', memo: '가리개' },
  { id: 'm6-87', type: 'expense', date: '2026-06-25', amount: 44750, payMethod: '오국민(쿠팡)', category: '의', memo: '속옷 3개' },

  { id: 'm6-88', type: 'expense', date: '2026-06-02', amount: 31698, payMethod: '국민카드', category: '생활비', memo: '올리브영' },
  { id: 'm6-89', type: 'expense', date: '2026-06-04', amount: 31356, payMethod: '국민카드', category: '생활비', memo: '올리브영' },
  { id: 'm6-90', type: 'expense', date: '2026-06-05', amount: 31041, payMethod: '국민카드', category: '생활비', memo: '올리브영' },

  { id: 'm6-91', type: 'expense', date: '2026-06-01', amount: 67560, payMethod: '오국민(쿠팡)', category: '동생', memo: '동생' },
  { id: 'm6-92', type: 'expense', date: '2026-06-03', amount: 16070, payMethod: '오국민(쿠팡)', category: '동생', memo: '동생' },
  { id: 'm6-93', type: 'expense', date: '2026-06-07', amount: 6990, payMethod: '오국민(쿠팡)', category: '동생', memo: '동생' },
  { id: 'm6-94', type: 'expense', date: '2026-06-07', amount: 39350, payMethod: '오국민(쿠팡)', category: '동생', memo: '동생' },
  { id: 'm6-95', type: 'expense', date: '2026-06-09', amount: 1900, payMethod: '오국민(쿠팡)', category: '동생', memo: '동생' },
  { id: 'm6-96', type: 'expense', date: '2026-06-10', amount: 31100, payMethod: '오국민(쿠팡)', category: '동생', memo: '동생' },
  { id: 'm6-97', type: 'expense', date: '2026-06-13', amount: 31900, payMethod: '오국민(쿠팡)', category: '동생', memo: '동생' },
  { id: 'm6-98', type: 'expense', date: '2026-06-15', amount: 10370, payMethod: '오국민(쿠팡)', category: '동생', memo: '동생' },
  { id: 'm6-99', type: 'expense', date: '2026-06-16', amount: 11430, payMethod: '오국민(쿠팡)', category: '동생', memo: '동생' },
  { id: 'm6-100', type: 'expense', date: '2026-06-16', amount: 14980, payMethod: '오국민(쿠팡)', category: '동생', memo: '동생' },
  { id: 'm6-101', type: 'expense', date: '2026-06-18', amount: 6500, payMethod: '오국민(쿠팡)', category: '동생', memo: '동생' },
  { id: 'm6-102', type: 'expense', date: '2026-06-20', amount: 20960, payMethod: '오국민(쿠팡)', category: '동생', memo: '동생' },
  { id: 'm6-103', type: 'expense', date: '2026-06-20', amount: 24000, payMethod: '오국민(쿠팡)', category: '동생', memo: '동생' },
  { id: 'm6-104', type: 'expense', date: '2026-06-20', amount: 20600, payMethod: '오국민(쿠팡)', category: '동생', memo: '동생' },
  { id: 'm6-105', type: 'expense', date: '2026-06-22', amount: 32850, payMethod: '오국민(쿠팡)', category: '동생', memo: '동생' },
  { id: 'm6-106', type: 'expense', date: '2026-06-24', amount: 24000, payMethod: '오국민(쿠팡)', category: '동생', memo: '동생' },
  { id: 'm6-107', type: 'expense', date: '2026-06-25', amount: 19060, payMethod: '오국민(쿠팡)', category: '동생', memo: '동생' },
  { id: 'm6-108', type: 'expense', date: '2026-06-27', amount: 19500, payMethod: '오국민(쿠팡)', category: '동생', memo: '동생' },
  { id: 'm6-109', type: 'expense', date: '2026-06-27', amount: 18370, payMethod: '오국민(쿠팡)', category: '동생', memo: '동생' },

  { id: 'm6-110', type: 'expense', date: '2026-06-30', amount: 246300, payMethod: '통장입금', category: '대출이자', memo: '대출이자' },

  // ================= 7월 데이터 =================
  // 수입
  { id: 'j-1', type: 'income', date: '2026-07-03', amount: 2484720, payMethod: '현금', category: '급여', memo: '6월 급여' },
  { id: 'j-2', type: 'income', date: '2026-07-15', amount: 100000, payMethod: '현금', category: '추가수입', memo: '휴가비' },
  { id: 'j-3', type: 'income', date: '2026-07-22', amount: 75000, payMethod: '현금', category: '추가수입', memo: '소영생일' },
  { id: 'j-4', type: 'income', date: '2026-07-22', amount: 100000, payMethod: '현금', category: '추가수입', memo: '소영생일' },
  { id: 'j-5', type: 'income', date: '2026-07-22', amount: 300000, payMethod: '현금', category: '추가수입', memo: '소영생일' },
  { id: 'j-6', type: 'income', date: '2026-07-20', amount: 78430, payMethod: '현금', category: '기타수입', memo: '선풍기 (환불입금)' },
  { id: 'j-7', type: 'income', date: '2026-07-23', amount: 44750, payMethod: '현금', category: '기타수입', memo: '속옷 (환불입금)' },

  // 지출 그룹 1
  { id: 'j-8', type: 'expense', date: '2026-07-01', amount: 85000, payMethod: '현금', category: '소영용돈', memo: '제주' },
  { id: 'j-9', type: 'expense', date: '2026-07-09', amount: 20900, payMethod: '네이버포인트', category: '식비', memo: '연세두유 (소영네이버)' },
  { id: 'j-10', type: 'expense', date: '2026-07-16', amount: 67600, payMethod: '현금', category: '소영용돈', memo: '제주' },
  { id: 'j-11', type: 'expense', date: '2026-07-23', amount: 100000, payMethod: '현금', category: '학식', memo: '겐로쿠우동' },
  { id: 'j-12', type: 'expense', date: '2026-07-31', amount: 10000, payMethod: '현금', category: '학식', memo: '동동국밥' },

  // 지출 그룹 2 (일반 지출)
  { id: 'j-13', type: 'expense', date: '2026-07-02', amount: 4000, payMethod: '현대카드', category: '생활비', memo: '다이소' },
  { id: 'j-14', type: 'expense', date: '2026-07-02', amount: 4000, payMethod: '현대카드', category: '생활비', memo: '다이소' },
  { id: 'j-15', type: 'expense', date: '2026-07-03', amount: 10000, payMethod: '현대카드', category: '학식', memo: '노브랜드 (고유가)' },
  { id: 'j-16', type: 'expense', date: '2026-07-04', amount: 6500, payMethod: '현대카드', category: '소영용돈', memo: '공차' },
  { id: 'j-17', type: 'expense', date: '2026-07-05', amount: 13250, payMethod: '현대카드', category: '소영용돈', memo: '파리바게뜨제주' },
  { id: 'j-18', type: 'expense', date: '2026-07-10', amount: 1000, payMethod: '현대카드', category: '생활비', memo: '다이소' },
  { id: 'j-19', type: 'expense', date: '2026-07-10', amount: 5000, payMethod: '현대카드', category: '소영', memo: '락휴(양지) 계모임비' },
  { id: 'j-20', type: 'expense', date: '2026-07-11', amount: 40600, payMethod: '현대카드', category: '의료비', memo: '마리아의원' },
  { id: 'j-21', type: 'expense', date: '2026-07-11', amount: 132300, payMethod: '현대카드', category: '의료비', memo: '마리아의원' },
  { id: 'j-22', type: 'expense', date: '2026-07-11', amount: 1650000, payMethod: '현대카드', category: '특수생활비', memo: '에어컨' },
  { id: 'j-23', type: 'expense', date: '2026-07-12', amount: 9720, payMethod: '현대카드', category: '식비', memo: '이마트' },
  { id: 'j-24', type: 'expense', date: '2026-07-13', amount: 5000, payMethod: '현대카드', category: '학식', memo: '지지고' },
  { id: 'j-25', type: 'expense', date: '2026-07-13', amount: 30000, payMethod: '현대카드', category: '유류비', memo: '유류비' },
  { id: 'j-26', type: 'expense', date: '2026-07-15', amount: 27695, payMethod: '현대카드', category: '보험', memo: '삼성화재' },
  { id: 'j-27', type: 'expense', date: '2026-07-15', amount: 1000, payMethod: '현대카드', category: '생활비', memo: '다이소' },
  { id: 'j-28', type: 'expense', date: '2026-07-15', amount: 9000, payMethod: '현대카드', category: '생활비', memo: '다이소' },
  { id: 'j-29', type: 'expense', date: '2026-07-15', amount: 50000, payMethod: '현대카드', category: '운동', memo: '운동' },
  { id: 'j-30', type: 'expense', date: '2026-07-17', amount: 7000, payMethod: '현대카드', category: '생활비', memo: '다이소' },
  { id: 'j-31', type: 'expense', date: '2026-07-17', amount: 1000, payMethod: '현대카드', category: '생활비', memo: '다이소' },
  { id: 'j-32', type: 'expense', date: '2026-07-17', amount: 30200, payMethod: '현대카드', category: '생활비', memo: '다이소' },
  { id: 'j-33', type: 'expense', date: '2026-07-19', amount: 17000, payMethod: '현대카드', category: '생활비', memo: '다이소' },
  { id: 'j-34', type: 'expense', date: '2026-07-19', amount: 7000, payMethod: '현대카드', category: '생활비', memo: '다이소' },
  { id: 'j-35', type: 'expense', date: '2026-07-19', amount: 990, payMethod: '현대카드', category: '생활비', memo: '이마트' },
  { id: 'j-36', type: 'expense', date: '2026-07-22', amount: 66000, payMethod: '현대카드', category: '유류비', memo: '주유 (고유가?)' },
  { id: 'j-37', type: 'expense', date: '2026-07-22', amount: 40000, payMethod: '현대카드', category: '생활비', memo: '속옷' },
  { id: 'j-38', type: 'expense', date: '2026-07-22', amount: 4200, payMethod: '현대카드', category: '생활비', memo: '주차' },
  { id: 'j-39', type: 'expense', date: '2026-07-22', amount: 2000, payMethod: '현대카드', category: '생활비', memo: '박물관주차' },
  { id: 'j-40', type: 'expense', date: '2026-07-22', amount: 1000, payMethod: '현대카드', category: '생활비', memo: '빙수주차' },
  { id: 'j-41', type: 'expense', date: '2026-07-22', amount: 6000, payMethod: '현대카드', category: '생활비', memo: '다이소' },
  { id: 'j-42', type: 'expense', date: '2026-07-22', amount: 1500, payMethod: '현대카드', category: '생활비', memo: '이케아' },
  { id: 'j-43', type: 'expense', date: '2026-07-22', amount: 4000, payMethod: '현대카드', category: '생활비', memo: '사진' },
  { id: 'j-44', type: 'expense', date: '2026-07-23', amount: 4600, payMethod: '현대카드', category: '소영', memo: '기차' },
  { id: 'j-45', type: 'expense', date: '2026-07-23', amount: 14800, payMethod: '현대카드', category: '소영', memo: '기차' },
  { id: 'j-46', type: 'expense', date: '2026-07-24', amount: 5000, payMethod: '현대카드', category: '학식', memo: '지지고 (고유가)' },
  { id: 'j-47', type: 'expense', date: '2026-07-25', amount: 5900, payMethod: '현대카드', category: '소영', memo: '카페이얼즈' },
  { id: 'j-48', type: 'expense', date: '2026-07-27', amount: 180110, payMethod: '현대카드', category: '관리비', memo: '관리비' },

  // 동백 카드 내역
  { id: 'j-49', type: 'expense', date: '2026-07-01', amount: 5500, payMethod: '동백', category: '학식', memo: '학식' },
  { id: 'j-50', type: 'expense', date: '2026-07-03', amount: 12000, payMethod: '동백', category: '네일', memo: '네일' },
  { id: 'j-51', type: 'expense', date: '2026-07-07', amount: 4000, payMethod: '동백', category: '의료비', memo: '진내과' },
  { id: 'j-52', type: 'expense', date: '2026-07-07', amount: 7950, payMethod: '동백', category: '의료비', memo: '약국' },
  { id: 'j-53', type: 'expense', date: '2026-07-07', amount: 9000, payMethod: '동백', category: '학식', memo: '곁집' },
  { id: 'j-54', type: 'expense', date: '2026-07-08', amount: 10000, payMethod: '동백', category: '학식', memo: '역전우동' },
  { id: 'j-55', type: 'expense', date: '2026-07-09', amount: 11000, payMethod: '동백', category: '학식', memo: '학식' },
  { id: 'j-56', type: 'expense', date: '2026-07-10', amount: 56000, payMethod: '동백', category: '소영', memo: '연막창(양지)' },
  { id: 'j-57', type: 'expense', date: '2026-07-11', amount: 21900, payMethod: '동백', category: '식비', memo: '식비' },
  { id: 'j-58', type: 'expense', date: '2026-07-14', amount: 9000, payMethod: '동백', category: '학식', memo: '곁집' },
  { id: 'j-59', type: 'expense', date: '2026-07-15', amount: 5000, payMethod: '동백', category: '학식', memo: '신전' },
  { id: 'j-60', type: 'expense', date: '2026-07-27', amount: 9000, payMethod: '동백', category: '학식', memo: '곁집' },
  { id: 'j-61', type: 'expense', date: '2026-07-28', amount: 15000, payMethod: '동백', category: '네일', memo: '네일' },
  { id: 'j-62', type: 'expense', date: '2026-07-29', amount: 12000, payMethod: '동백', category: '네일', memo: '네일' },

  // 오동백 카드 내역
  { id: 'j-63', type: 'expense', date: '2026-07-01', amount: 2000, payMethod: '오동백', category: '상헌용돈', memo: '텐퍼' },
  { id: 'j-64', type: 'expense', date: '2026-07-02', amount: 20000, payMethod: '오동백', category: '식비', memo: '아몬드치킨' },
  { id: 'j-65', type: 'expense', date: '2026-07-04', amount: 41000, payMethod: '오동백', category: '상헌용돈', memo: '계이팅(비버)' },
  { id: 'j-66', type: 'expense', date: '2026-07-06', amount: 28000, payMethod: '오동백', category: '식비', memo: '가야밀면' },
  { id: 'j-67', type: 'expense', date: '2026-07-06', amount: 5000, payMethod: '오동백', category: '의료비', memo: '약국' },
  { id: 'j-68', type: 'expense', date: '2026-07-08', amount: 5400, payMethod: '오동백', category: '상헌용돈', memo: '텐퍼센트' },
  { id: 'j-69', type: 'expense', date: '2026-07-11', amount: 5400, payMethod: '오동백', category: '식비', memo: '아이스크림' },
  { id: 'j-70', type: 'expense', date: '2026-07-13', amount: 4000, payMethod: '오동백', category: '상헌용돈', memo: '텐퍼센트' },
  { id: 'j-71', type: 'expense', date: '2026-07-22', amount: 52000, payMethod: '오동백', category: '식비', memo: '그라치에' },
  { id: 'j-72', type: 'expense', date: '2026-07-23', amount: 65500, payMethod: '오동백', category: '운동', memo: '수영' },
  { id: 'j-73', type: 'expense', date: '2026-07-24', amount: 5400, payMethod: '오동백', category: '상헌용돈', memo: '텐퍼센트' },

  // 적금
  { id: 'j-74', type: 'expense', date: '2026-07-06', amount: 700000, payMethod: '통장입금', category: '청년', memo: '청년 적금' },

  // 오국민(쿠팡) 내역
  { id: 'j-75', type: 'expense', date: '2026-07-03', amount: 5900, payMethod: '오국민(쿠팡)', category: '생활비', memo: '실내슬리퍼' },
  { id: 'j-76', type: 'expense', date: '2026-07-10', amount: 14170, payMethod: '오국민(쿠팡)', category: '생활비', memo: '생수' },
  { id: 'j-77', type: 'expense', date: '2026-07-10', amount: 15790, payMethod: '오국민(쿠팡)', category: '생활비', memo: '어묵/호박/참치마요' },
  { id: 'j-78', type: 'expense', date: '2026-07-12', amount: 5730, payMethod: '오국민(쿠팡)', category: '생활비', memo: '강아지브러쉬' },
  { id: 'j-79', type: 'expense', date: '2026-07-14', amount: 14450, payMethod: '오국민(쿠팡)', category: '생활비', memo: '어그정리' },
  { id: 'j-80', type: 'expense', date: '2026-07-15', amount: 9300, payMethod: '오국민(쿠팡)', category: '생활비', memo: '껌' },
  { id: 'j-81', type: 'expense', date: '2026-07-21', amount: 69000, payMethod: '오국민(쿠팡)', category: '생활비', memo: '선풍기' },
  { id: 'j-82', type: 'expense', date: '2026-07-23', amount: 12840, payMethod: '오국민(쿠팡)', category: '생활비', memo: '사이다' },
  { id: 'j-83', type: 'expense', date: '2026-07-25', amount: 30420, payMethod: '오국민(쿠팡)', category: '생활비', memo: '바지걸이' },
  { id: 'j-84', type: 'expense', date: '2026-07-27', amount: 66730, payMethod: '오국민(쿠팡)', category: '예비자금', memo: '아기비대' },
  { id: 'j-85', type: 'expense', date: '2026-07-27', amount: 15950, payMethod: '오국민(쿠팡)', category: '식비', memo: '당면' },
  { id: 'j-86', type: 'expense', date: '2026-07-06', amount: 7890, payMethod: '오국민(쿠팡)', category: '구독인터넷', memo: '쿠팡멤버쉽' },
  { id: 'j-87', type: 'expense', date: '2026-07-29', amount: 35250, payMethod: '오국민(쿠팡)', category: '생활비', memo: '브라' },
  { id: 'j-88', type: 'expense', date: '2026-07-29', amount: 7200, payMethod: '오국민(쿠팡)', category: '생활비', memo: '3구멀티탭' },
  { id: 'j-89', type: 'expense', date: '2026-07-30', amount: 15420, payMethod: '오국민(쿠팡)', category: '생활비', memo: '락앤락 도자기' },
  { id: 'j-90', type: 'expense', date: '2026-07-30', amount: 5900, payMethod: '오국민(쿠팡)', category: '생활비', memo: '내성발톱방지' },
  { id: 'j-91', type: 'expense', date: '2026-07-30', amount: 7260, payMethod: '오국민(쿠팡)', category: '생활비', memo: '내성발톱방지' },

  // 현대카드 고정비 및 결제 내역
  { id: 'j-92', type: 'expense', date: '2026-07-09', amount: 29700, payMethod: '현대카드', category: '구독인터넷', memo: '구독인터넷' },
  { id: 'j-93', type: 'expense', date: '2026-07-09', amount: 1900, payMethod: '현대카드', category: '구독인터넷', memo: '카카오' },
  { id: 'j-94', type: 'expense', date: '2026-07-09', amount: 48740, payMethod: '현대카드', category: '통신비', memo: '통신비' },
  { id: 'j-95', type: 'expense', date: '2026-07-09', amount: 790, payMethod: '현대카드', category: '생활비', memo: '무' },
  { id: 'j-96', type: 'expense', date: '2026-07-30', amount: 23200, payMethod: '현대카드', category: '하이패스', memo: '하이패스' }
];

let categoryChartInstance = null;
let payMethodChartInstance = null;
let roomRef = null;

document.addEventListener('DOMContentLoaded', () => {
  loadStoredData();
  setupEventListeners();
  initFirebaseSync();
  renderApp();
  initCharts();
});

function loadStoredData() {
  // Always enforce the shared room code 'myhouse-main-room'
  state.roomCode = 'myhouse-main-room';
  
  const savedPay = localStorage.getItem('couple_budget_pay_methods');
  if (savedPay) state.payMethods = JSON.parse(savedPay);

  const savedCat = localStorage.getItem('couple_budget_categories');
  if (savedCat) state.categories = JSON.parse(savedCat);

  const savedBudgets = localStorage.getItem('couple_budget_budgets');
  if (savedBudgets) state.budgets = JSON.parse(savedBudgets);

  const currentTheme = localStorage.getItem('couple_budget_theme') || 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);

  document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
}

// Instant Realtime Sync Setup with Firebase
function initFirebaseSync() {
  if (roomRef) {
    roomRef.off(); // Detach previous listener
  }

  roomRef = db.ref('rooms/' + state.roomCode);

  // Listen to realtime updates on this couple room
  roomRef.on('value', (snapshot) => {
    const val = snapshot.val();
    if (val && val.transactions && val.transactions.length > 0) {
      // Merge master items (4~7월) if missing from Firebase
      const existingIds = new Set(val.transactions.map(t => t.id));
      const missingMasterItems = INITIAL_SAMPLE_DATA.filter(t => !existingIds.has(t.id));
      
      if (missingMasterItems.length > 0) {
        state.transactions = [...val.transactions, ...missingMasterItems];
        pushDataToFirebase();
      } else {
        state.transactions = val.transactions;
      }
      
      if (val.budgets) state.budgets = val.budgets;
      if (val.payMethods) state.payMethods = val.payMethods;
      if (val.categories) state.categories = val.categories;
    } else {
      state.transactions = INITIAL_SAMPLE_DATA;
      pushDataToFirebase();
    }
    renderApp();
  });
}

function pushDataToFirebase() {
  if (roomRef) {
    roomRef.set({
      transactions: state.transactions,
      budgets: state.budgets,
      payMethods: state.payMethods,
      categories: state.categories,
      lastUpdated: Date.now()
    });
  }
}

function setupEventListeners() {
  // Theme Toggle
  document.getElementById('themeToggleBtn').addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('couple_budget_theme', newTheme);
  });

  // Month Navigation
  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    state.currentMonth--;
    if (state.currentMonth < 1) {
      state.currentMonth = 12;
      state.currentYear--;
    }
    renderApp();
  });

  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    state.currentMonth++;
    if (state.currentMonth > 12) {
      state.currentMonth = 1;
      state.currentYear++;
    }
    renderApp();
  });

  // Type Toggle (Expense / Income)
  document.getElementById('typeExpenseBtn').addEventListener('click', () => {
    state.type = 'expense';
    document.getElementById('typeExpenseBtn').classList.add('active');
    document.getElementById('typeIncomeBtn').classList.remove('active');
    state.selectedCategory = state.categories[0] || '식비';
    renderCategoryChips();
  });

  document.getElementById('typeIncomeBtn').addEventListener('click', () => {
    state.type = 'income';
    document.getElementById('typeIncomeBtn').classList.add('active');
    document.getElementById('typeExpenseBtn').classList.remove('active');
    state.selectedCategory = state.incomeCategories[0] || '급여';
    state.selectedPayMethod = '현금';
    renderPayMethodChips();
    renderCategoryChips();
  });

  // Quick Amount Buttons
  document.querySelectorAll('.quick-amt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const addVal = parseInt(e.target.dataset.add, 10);
      const amountInput = document.getElementById('txAmount');
      const currentVal = parseInt(amountInput.value, 10) || 0;
      amountInput.value = currentVal + addVal;
    });
  });

  // Transaction Form Submission
  document.getElementById('transactionForm').addEventListener('submit', (e) => {
    e.preventDefault();
    handleAddOrUpdateTx();
  });

  // Search & Filters
  document.getElementById('searchInput').addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim().toLowerCase();
    renderTransactionList();
  });

  document.getElementById('filterPayMethod').addEventListener('change', (e) => {
    state.activePayFilter = e.target.value;
    renderTransactionList();
  });

  document.getElementById('filterCategory').addEventListener('change', (e) => {
    state.activeCategoryFilter = e.target.value;
    renderTransactionList();
  });

  document.getElementById('resetPayFilterBtn').addEventListener('click', () => {
    state.activePayFilter = 'ALL';
    state.activeCategoryFilter = 'ALL';
    state.searchQuery = '';
    document.getElementById('filterPayMethod').value = 'ALL';
    document.getElementById('filterCategory').value = 'ALL';
    document.getElementById('searchInput').value = '';
    renderTransactionList();
  });

  // Navigation Tabs
  document.querySelectorAll('.view-tab-btn').forEach(tabBtn => {
    tabBtn.addEventListener('click', (e) => {
      document.querySelectorAll('.view-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      e.target.classList.add('active');
      const tabId = e.target.dataset.tab;
      document.getElementById(tabId).classList.add('active');

      if (tabId === 'calendarTab') renderCalendar();
      if (tabId === 'budgetTab') renderBudgets();
      if (tabId === 'chartTab') updateCharts();
    });
  });

  // Backup & Restore & Excel Export
  document.getElementById('backupBtn').addEventListener('click', exportBackupJSON);
  document.getElementById('restoreBtn').addEventListener('click', () => document.getElementById('restoreFileInput').click());
  document.getElementById('restoreFileInput').addEventListener('change', importBackupJSON);
  document.getElementById('excelExportBtn').addEventListener('click', exportToCSV);

  // Couple Room Modal
  document.getElementById('coupleRoomBtn').addEventListener('click', openRoomModal);
  document.getElementById('closeRoomModalBtn').addEventListener('click', () => document.getElementById('coupleRoomModal').classList.add('hidden'));
  document.getElementById('saveRoomCodeBtn').addEventListener('click', saveRoomCode);
  document.getElementById('copyInviteLinkBtn').addEventListener('click', copyInviteLink);

  // Manage Payment Methods & Categories Modals
  document.getElementById('managePayMethodsBtn').addEventListener('click', () => openManageModal('payMethods'));
  document.getElementById('manageCategoriesBtn').addEventListener('click', () => openManageModal('categories'));
  document.getElementById('closeTagModalBtn').addEventListener('click', () => document.getElementById('manageTagsModal').classList.add('hidden'));

  // Save Budgets
  document.getElementById('saveBudgetsBtn').addEventListener('click', saveBudgets);
}

// Master Render Function
function renderApp() {
  document.getElementById('displayYear').textContent = `${state.currentYear}년`;
  document.getElementById('displayMonth').textContent = `${state.currentMonth}월`;

  renderPayMethodChips();
  renderCategoryChips();
  renderFilterOptions();
  renderSummaryCards();
  renderTransactionList();
}

function renderPayMethodChips() {
  const container = document.getElementById('payMethodChips');
  container.innerHTML = '';
  state.payMethods.forEach(pm => {
    const chip = document.createElement('div');
    chip.className = `chip-tag ${state.selectedPayMethod === pm ? 'selected' : ''}`;
    chip.textContent = pm;
    chip.addEventListener('click', () => {
      state.selectedPayMethod = pm;
      renderPayMethodChips();
    });
    container.appendChild(chip);
  });
}

function renderCategoryChips() {
  const container = document.getElementById('categoryChips');
  container.innerHTML = '';
  
  const currentCategoryList = state.type === 'income' ? state.incomeCategories : state.categories;

  currentCategoryList.forEach(cat => {
    const chip = document.createElement('div');
    chip.className = `chip-tag ${state.selectedCategory === cat ? 'selected' : ''}`;
    chip.textContent = cat;
    chip.addEventListener('click', () => {
      state.selectedCategory = cat;
      renderCategoryChips();
    });
    container.appendChild(chip);
  });
}

function renderFilterOptions() {
  const paySelect = document.getElementById('filterPayMethod');
  paySelect.innerHTML = '<option value="ALL">전체 결제수단</option>';
  state.payMethods.forEach(pm => {
    const opt = document.createElement('option');
    opt.value = pm;
    opt.textContent = pm;
    if (state.activePayFilter === pm) opt.selected = true;
    paySelect.appendChild(opt);
  });

  const catSelect = document.getElementById('filterCategory');
  catSelect.innerHTML = '<option value="ALL">전체 카테고리</option>';
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    if (state.activeCategoryFilter === cat) opt.selected = true;
    catSelect.appendChild(opt);
  });
}

function getCurrentMonthTransactions() {
  return state.transactions.filter(tx => {
    if (!tx.date) return false;
    const [y, m] = tx.date.split('-').map(Number);
    return y === state.currentYear && m === state.currentMonth;
  });
}

function renderSummaryCards() {
  const monthTxs = getCurrentMonthTransactions();
  
  let totalIncome = 0;
  let totalExpense = 0;

  monthTxs.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'income') totalIncome += amt;
    else totalExpense += amt;
  });

  let totalBudget = 0;
  Object.values(state.budgets).forEach(b => totalBudget += Number(b) || 0);

  const balance = totalIncome - totalExpense;
  const progressPct = totalBudget > 0 ? Math.round((totalExpense / totalBudget) * 100) : 0;

  document.getElementById('summaryTotalIncome').textContent = `${totalIncome.toLocaleString()} 원`;
  document.getElementById('summaryTotalExpense').textContent = `${totalExpense.toLocaleString()} 원`;
  document.getElementById('summaryTargetBudget').textContent = `${totalBudget.toLocaleString()} 원`;
  document.getElementById('summaryBudgetProgress').textContent = `지출 소진율 ${progressPct}%`;
  document.getElementById('summaryBalance').textContent = `${balance.toLocaleString()} 원`;
}

function renderTransactionList() {
  const monthTxs = getCurrentMonthTransactions();
  
  const paySummaryChipsContainer = document.getElementById('paySummaryChips');
  paySummaryChipsContainer.innerHTML = '';
  
  const payTotals = {};
  monthTxs.filter(tx => tx.type === 'expense').forEach(tx => {
    payTotals[tx.payMethod] = (payTotals[tx.payMethod] || 0) + Number(tx.amount);
  });

  Object.entries(payTotals).forEach(([pm, total]) => {
    const chip = document.createElement('div');
    chip.className = `pay-summary-chip ${state.activePayFilter === pm ? 'active-filter' : ''}`;
    chip.innerHTML = `💳 ${pm} <span style="font-weight:800;">${total.toLocaleString()} 원</span>`;
    chip.addEventListener('click', () => {
      state.activePayFilter = state.activePayFilter === pm ? 'ALL' : pm;
      document.getElementById('filterPayMethod').value = state.activePayFilter;
      renderTransactionList();
    });
    paySummaryChipsContainer.appendChild(chip);
  });

  let filtered = monthTxs.filter(tx => {
    if (state.activePayFilter !== 'ALL' && tx.payMethod !== state.activePayFilter) return false;
    if (state.activeCategoryFilter !== 'ALL' && tx.category !== state.activeCategoryFilter) return false;
    if (state.searchQuery) {
      const q = state.searchQuery;
      const matchMemo = tx.memo && tx.memo.toLowerCase().includes(q);
      const matchCat = tx.category && tx.category.toLowerCase().includes(q);
      const matchPay = tx.payMethod && tx.payMethod.toLowerCase().includes(q);
      const matchAmt = tx.amount.toString().includes(q);
      if (!matchMemo && !matchCat && !matchPay && !matchAmt) return false;
    }
    return true;
  });

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  const container = document.getElementById('txListContainer');
  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">기록된 거래 내역이 없습니다.</div>';
    return;
  }

  const grouped = {};
  filtered.forEach(tx => {
    if (!grouped[tx.date]) grouped[tx.date] = [];
    grouped[tx.date].push(tx);
  });

  const weekNames = ['일', '월', '화', '수', '목', '금', '토'];

  Object.keys(grouped).forEach(dateStr => {
    const dateObj = new Date(dateStr);
    const dayOfWeek = weekNames[dateObj.getDay()];
    const [, m, d] = dateStr.split('-');

    const groupDiv = document.createElement('div');
    groupDiv.className = 'tx-date-group';

    const header = document.createElement('div');
    header.className = 'tx-date-header';
    header.textContent = `${Number(m)}월 ${Number(d)}일 (${dayOfWeek})`;
    groupDiv.appendChild(header);

    grouped[dateStr].forEach(tx => {
      const isExpense = tx.type === 'expense';
      const item = document.createElement('div');
      item.className = 'tx-item';
      item.innerHTML = `
        <div class="tx-left">
          <div class="tx-icon">${getCategoryEmoji(tx.category)}</div>
          <div class="tx-details">
            <div class="tx-title">${tx.memo || tx.category}</div>
            <div class="tx-badges">
              <span class="badge">${tx.category}</span>
              ${tx.payMethod ? `<span class="badge warning">💳 ${tx.payMethod}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="tx-right">
          <div class="tx-amount ${isExpense ? 'expense-text' : 'income-text'}">
            ${isExpense ? '-' : '+'}${Number(tx.amount).toLocaleString()} 원
          </div>
          <div class="tx-actions">
            <button class="action-icon-btn" onclick="editTx('${tx.id}')">✏️</button>
            <button class="action-icon-btn" onclick="deleteTx('${tx.id}')">🗑️</button>
          </div>
        </div>
      `;
      groupDiv.appendChild(item);
    });

    container.appendChild(groupDiv);
  });
}

function handleAddOrUpdateTx() {
  const date = document.getElementById('txDate').value;
  const amount = parseInt(document.getElementById('txAmount').value, 10);
  const memo = document.getElementById('txMemo').value.trim();

  if (!date || !amount || amount <= 0) {
    alert('날짜와 올바른 금액을 입력해주세요.');
    return;
  }

  if (state.editingTxId) {
    const idx = state.transactions.findIndex(t => String(t.id) === String(state.editingTxId));
    if (idx !== -1) {
      state.transactions[idx] = {
        ...state.transactions[idx],
        type: state.type,
        date,
        amount,
        payMethod: state.selectedPayMethod,
        category: state.selectedCategory,
        memo
      };
    }
    state.editingTxId = null;
  } else {
    const newTx = {
      id: 'tx-' + Date.now(),
      type: state.type,
      date,
      amount,
      payMethod: state.selectedPayMethod,
      category: state.selectedCategory,
      memo
    };
    state.transactions.push(newTx);
  }

  const submitBtn = document.getElementById('addTxSubmitBtn');
  submitBtn.textContent = '+ 내역 추가하기';
  submitBtn.style.backgroundColor = '';

  pushDataToFirebase();

  document.getElementById('txAmount').value = '';
  document.getElementById('txMemo').value = '';
}

window.editTx = function(id) {
  const tx = state.transactions.find(t => String(t.id) === String(id));
  if (!tx) {
    alert('해당 내역을 찾을 수 없습니다.');
    return;
  }

  state.editingTxId = tx.id;
  state.type = tx.type;

  // Toggle type button state visually
  if (tx.type === 'expense') {
    document.getElementById('typeExpenseBtn').classList.add('active');
    document.getElementById('typeIncomeBtn').classList.remove('active');
  } else {
    document.getElementById('typeIncomeBtn').classList.add('active');
    document.getElementById('typeExpenseBtn').classList.remove('active');
  }

  document.getElementById('txDate').value = tx.date;
  document.getElementById('txAmount').value = tx.amount;
  document.getElementById('txMemo').value = tx.memo || '';
  
  state.selectedPayMethod = tx.payMethod || (state.type === 'income' ? '현금' : state.payMethods[0]);
  state.selectedCategory = tx.category || (state.type === 'income' ? state.incomeCategories[0] : state.categories[0]);

  renderPayMethodChips();
  renderCategoryChips();

  const submitBtn = document.getElementById('addTxSubmitBtn');
  submitBtn.textContent = '✏️ 선택한 내역 수정 완료';
  submitBtn.style.backgroundColor = '#f59e0b'; // Highlight button in orange during edit

  // Scroll smoothly to input panel
  document.querySelector('.left-panel').scrollIntoView({ behavior: 'smooth' });
};

window.deleteTx = function(id) {
  if (confirm('이 내역을 삭제하시겠습니까?')) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    pushDataToFirebase();
  }
};

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  const dayHeaders = ['일', '월', '화', '수', '목', '금', '토'];
  dayHeaders.forEach(d => {
    const h = document.createElement('div');
    h.className = 'cal-day-header';
    h.textContent = d;
    grid.appendChild(h);
  });

  const firstDay = new Date(state.currentYear, state.currentMonth - 1, 1);
  const lastDay = new Date(state.currentYear, state.currentMonth, 0);
  const startDayOfWeek = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const monthTxs = getCurrentMonthTransactions();

  for (let i = 0; i < startDayOfWeek; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'cal-day-cell empty';
    grid.appendChild(emptyCell);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayTxs = monthTxs.filter(t => t.date === dateStr);

    let dayIncome = 0;
    let dayExpense = 0;
    dayTxs.forEach(t => {
      if (t.type === 'income') dayIncome += Number(t.amount);
      else dayExpense += Number(t.amount);
    });

    const cell = document.createElement('div');
    cell.className = `cal-day-cell ${dateStr === todayStr ? 'today' : ''}`;
    cell.innerHTML = `
      <div class="cal-day-num">${d}</div>
      ${dayIncome > 0 ? `<div class="cal-income">+${(dayIncome/10000).toFixed(1)}만</div>` : ''}
      ${dayExpense > 0 ? `<div class="cal-expense">-${(dayExpense/10000).toFixed(1)}만</div>` : ''}
    `;
    grid.appendChild(cell);
  }
}

function renderBudgets() {
  const container = document.getElementById('budgetList');
  container.innerHTML = '';

  const monthTxs = getCurrentMonthTransactions().filter(t => t.type === 'expense');

  state.categories.forEach(cat => {
    const targetBudget = Number(state.budgets[cat]) || 0;
    const actualExpense = monthTxs.filter(t => t.category === cat).reduce((sum, t) => sum + Number(t.amount), 0);
    const remaining = targetBudget - actualExpense;
    const pct = targetBudget > 0 ? Math.min(Math.round((actualExpense / targetBudget) * 100), 100) : 0;
    const isOver = actualExpense > targetBudget && targetBudget > 0;

    const item = document.createElement('div');
    item.className = 'budget-item';
    item.innerHTML = `
      <div class="budget-item-top">
        <div class="budget-cat-title">
          ${getCategoryEmoji(cat)} ${cat}
          ${targetBudget > 0 ? (
            isOver 
              ? `<span class="badge" style="background:#fef2f2; color:#ef4444; margin-left:8px; font-weight:700;">⚠️ ${Math.abs(remaining).toLocaleString()}원 초과</span>`
              : `<span class="badge" style="background:#ecfdf5; color:#10b981; margin-left:8px; font-weight:700;">💵 남은 예산: ${remaining.toLocaleString()}원</span>`
          ) : ''}
        </div>
        <div class="budget-inputs">
          <span style="font-size:12px; color:var(--text-secondary);">지출: <b>${actualExpense.toLocaleString()} 원</b> /</span>
          <label style="font-size:12px;">목표 예산:</label>
          <input type="number" class="budget-input-field" data-cat="${cat}" value="${targetBudget}" placeholder="0"> 원
        </div>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill ${isOver ? 'over' : ''}" style="width: ${pct}%;"></div>
      </div>
    `;
    container.appendChild(item);
  });
}

function saveBudgets() {
  document.querySelectorAll('.budget-input-field').forEach(inp => {
    const cat = inp.dataset.cat;
    const val = parseInt(inp.value, 10) || 0;
    state.budgets[cat] = val;
  });
  pushDataToFirebase();
  alert('카테고리별 목표 예산이 저장되었습니다!');
  renderSummaryCards();
}

function initCharts() {
  const catCtx = document.getElementById('categoryChart').getContext('2d');
  categoryChartInstance = new Chart(catCtx, {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
    options: { responsive: true, maintainAspectRatio: false }
  });

  const payCtx = document.getElementById('payMethodChart').getContext('2d');
  payMethodChartInstance = new Chart(payCtx, {
    type: 'bar',
    data: { labels: [], datasets: [{ label: '지출 금액 (원)', data: [], backgroundColor: '#5850ec' }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function updateCharts() {
  const monthTxs = getCurrentMonthTransactions().filter(t => t.type === 'expense');

  const catTotals = {};
  monthTxs.forEach(t => catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount));

  const catLabels = Object.keys(catTotals);
  const catData = Object.values(catTotals);
  const catColors = ['#5850ec', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

  categoryChartInstance.data.labels = catLabels;
  categoryChartInstance.data.datasets[0].data = catData;
  categoryChartInstance.data.datasets[0].backgroundColor = catColors;
  categoryChartInstance.update();

  const payTotals = {};
  monthTxs.forEach(t => payTotals[t.payMethod] = (payTotals[t.payMethod] || 0) + Number(t.amount));

  payMethodChartInstance.data.labels = Object.keys(payTotals);
  payMethodChartInstance.data.datasets[0].data = Object.values(payTotals);
  payMethodChartInstance.update();
}

function getCategoryEmoji(cat) {
  const map = {
    '식비': '🛒', '생활비': '🏠', '관리비': '🏢', '가스비': '🔥', '유류비': '⛽', '하이패스': '🛣️',
    '구독인터넷': '📡', '외식': '🍔', '여행지금': '✈️', '네일': '💅', '미용실': '💈',
    '교통비': '🚌', '운동': '🏋️', '의': '👗', '주': '🏠', '연금': '💵', '대출이자': '🏦',
    '소영': '👩', '의료비': '💊', '예비자금': '💰', '상연용돈': '👛', '소영용돈': '👛',
    '특수생활비': '🎁', '보험': '🛡️', '통신비': '📱', '동생': '👧', '고정비': '📌',
    '주택청약': '🏡', '청년': '🌱', '투자': '📈', '급여': '💵'
  };
  return map[cat] || '🏷️';
}

function exportBackupJSON() {
  const backupData = {
    transactions: state.transactions,
    payMethods: state.payMethods,
    categories: state.categories,
    budgets: state.budgets
  };
  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `부부가계부_백업_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}

function importBackupJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.transactions) state.transactions = data.transactions;
      if (data.payMethods) state.payMethods = data.payMethods;
      if (data.categories) state.categories = data.categories;
      if (data.budgets) state.budgets = data.budgets;

      pushDataToFirebase();
      alert('데이터 복원이 완료되었습니다!');
      renderApp();
    } catch (err) {
      alert('유효하지 않은 백업 파일입니다.');
    }
  };
  reader.readAsText(file);
}

function exportToCSV() {
  let csvContent = "\uFEFF";
  csvContent += "ID,구분,날짜,금액,결제수단,카테고리,메모\n";

  state.transactions.forEach(t => {
    const row = [t.id, t.type, t.date, t.amount, `"${t.payMethod}"`, `"${t.category}"`, `"${t.memo || ''}"`].join(",");
    csvContent += row + "\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `부부가계부_내역_${state.currentYear}_${state.currentMonth}.csv`;
  a.click();
}

// Couple Room Controls
function openRoomModal() {
  document.getElementById('coupleRoomModal').classList.remove('hidden');
  document.getElementById('roomCodeInput').value = state.roomCode;
}

function saveRoomCode() {
  const newCode = document.getElementById('roomCodeInput').value.trim();
  if (newCode) {
    state.roomCode = newCode;
    localStorage.setItem('couple_room_code', newCode);
    initFirebaseSync();
    document.getElementById('coupleRoomModal').classList.add('hidden');
    alert('부부 공유 코드가 변경 및 저장되었습니다!');
  }
}

function copyInviteLink() {
  const baseUrl = window.location.origin + window.location.pathname;
  const inviteUrl = `${baseUrl}?room=${encodeURIComponent(state.roomCode)}`;
  navigator.clipboard.writeText(inviteUrl);
  alert('카톡 초댓링크가 복사되었습니다! 상대방에게 전달하시면 클릭 한 번으로 자동 동기화됩니다:\n' + inviteUrl);
}

// Modal Tag Management
let currentManageType = 'payMethods';

function openManageModal(type) {
  currentManageType = type;
  const modal = document.getElementById('manageTagsModal');
  const title = document.getElementById('manageModalTitle');
  title.textContent = type === 'payMethods' ? '💳 결제수단 관리' : '🏷️ 카테고리 관리';
  modal.classList.remove('hidden');
  renderManageTagList();
}

function renderManageTagList() {
  const list = document.getElementById('tagListItems');
  list.innerHTML = '';
  const items = state[currentManageType];

  items.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'tag-manage-item';
    li.innerHTML = `
      <span>${item}</span>
      <button class="action-icon-btn" onclick="removeTagItem(${idx})">🗑️</button>
    `;
    list.appendChild(li);
  });
}

document.getElementById('addNewTagBtn').addEventListener('click', () => {
  const input = document.getElementById('newTagNameInput');
  const name = input.value.trim();
  if (name && !state[currentManageType].includes(name)) {
    state[currentManageType].push(name);
    pushDataToFirebase();
    input.value = '';
    renderManageTagList();
    renderApp();
  }
});

window.removeTagItem = function(idx) {
  state[currentManageType].splice(idx, 1);
  pushDataToFirebase();
  renderManageTagList();
  renderApp();
};
