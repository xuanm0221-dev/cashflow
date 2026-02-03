// 원본 CSV 데이터 (롱 포맷)
export interface FinancialData {
  year: number;
  month: number; // 1~12
  account: string;
  value: number;
}

// 테이블 행 데이터
export interface TableRow {
  account: string;
  level: number; // 인덴트 레벨 (0=최상위)
  isGroup: boolean; // 그룹(접기/펼치기 가능)인지
  isCalculated: boolean; // 계산된 값인지
  isHighlight?: 'sky' | 'yellow' | 'gray' | 'darkGray' | 'none'; // 배경색 강조
  isBold?: boolean; // 볼드 처리
  values: (number | null)[]; // 12개월 또는 13개(합계 포함)
  children?: TableRow[];
  format?: 'number' | 'percent'; // 표시 형식
  comparisons?: ComparisonData; // 비교 데이터 (FinancialTable 범용 지원용)
  year2024Value?: number | null; // CF용 2024년 값
  year2023Value?: number | null; // 2025년 선택 시 2023년 합계/기말
  brandComparisons?: BrandComparisonData; // 브랜드별 비교 데이터 (FinancialTable 범용 지원용)
}

// 비교 데이터 (FinancialTable 범용 지원용)
export interface ComparisonData {
  prevYearMonth: number | null;
  currYearMonth: number | null;
  monthYoY: number | null;
  prevYearYTD: number | null;
  currYearYTD: number | null;
  ytdYoY: number | null;
  prevYearAnnual: number | null;
  currYearAnnual: number | null;
  annualYoY: number | null;
}

// 브랜드별 비교 데이터 (FinancialTable 범용 지원용)
export interface BrandComparisonData {
  month: {
    prevYear: { [brand: string]: number | null };
    currYear: { [brand: string]: number | null };
  };
  ytd: {
    prevYear: { [brand: string]: number | null };
    currYear: { [brand: string]: number | null };
  };
  annual: {
    prevYear: { [brand: string]: number | null };
    currYear: { [brand: string]: number | null };
  };
}

// 탭 타입
export type TabType = 'CF' | 'CREDIT' | 'WORKING_CAPITAL' | 'WORKING_CAPITAL_STATEMENT' | 'CREDIT_RECOVERY';

// 월 데이터 맵
export type MonthDataMap = Map<string, number[]>; // account -> [month1, month2, ..., month12]

// 여신사용현황 타입
export interface CreditDealer {
  name: string;
  외상매출금: number;
  선수금: number;
  순여신: number;
}

export interface CreditData {
  total: {
    외상매출금: number;
    선수금: number;
    순여신: number;
  };
  dealers: CreditDealer[];
  top17: CreditDealer[];
  others: {
    count: number;
    외상매출금: number;
    선수금: number;
    순여신: number;
  };
  othersList: CreditDealer[];
  analysis: {
    top17Ratio: number; // 상위 17개 비율
    top1Ratio: number; // 최대 거래처 비율
    riskLevel: '높음' | '낮음';
  };
}

// 여신회수 계획 Raw 데이터 (CSV에서 직접 읽은 데이터)
export interface CreditRecoveryRawData {
  대리상선수금: number;
  대리상채권: number;
  회수1: number;
  회수2: number;
  회수3: number;
  회수4: number;
}

// 여신회수 계획 데이터 (Raw 데이터 + 메타데이터)
export interface CreditRecoveryData extends CreditRecoveryRawData {
  baseYearMonth: string; // 기준 연월 (예: "25.12")
  headers: string[]; // 동적 헤더 ["26.01", "26.02", "26.03", "26.04"]
}
