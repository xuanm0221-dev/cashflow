import { NextResponse } from 'next/server';
import path from 'path';
import { readCSV } from '@/lib/csv';
import { calculatePL, calculateBS } from '@/lib/fs-mapping';
import { ExecutiveSummaryData, TableRow } from '@/lib/types';

// 값 가져오기 헬퍼 함수
function getValue(data: TableRow[], account: string, monthIndex: number): number {
  const row = data.find(r => r.account === account);
  return row?.values[monthIndex] || 0;
}

// 경영요약 자동 생성 함수
function generateSummary(
  pl2024: TableRow[],
  pl2025: TableRow[],
  bs2024: TableRow[],
  bs2025: TableRow[]
): ExecutiveSummaryData {
  
  const month = 10; // 11월 (index 10)
  
  // PL 데이터 추출 (11월 기준, K 단위)
  const tag매출24 = getValue(pl2024, 'Tag매출', month);
  const tag매출25 = getValue(pl2025, 'Tag매출', month);
  const 실판매출24 = getValue(pl2024, '실판매출', month);
  const 실판매출25 = getValue(pl2025, '실판매출', month);
  const 영업이익24 = getValue(pl2024, '영업이익', month);
  const 영업이익25 = getValue(pl2025, '영업이익', month);
  const 영업이익률24 = getValue(pl2024, '영업이익률', month);
  const 영업이익률25 = getValue(pl2025, '영업이익률', month);
  const 영업비24 = getValue(pl2024, '영업비', month);
  const 영업비25 = getValue(pl2025, '영업비', month);
  const 광고비24 = getValue(pl2024, '광고비', month);
  const 광고비25 = getValue(pl2025, '광고비', month);
  
  // BS 데이터 추출 (11월 기준, K 단위)
  const 자산24 = getValue(bs2024, '자산', month);
  const 자산25 = getValue(bs2025, '자산', month);
  const 부채24 = getValue(bs2024, '부채', month);
  const 부채25 = getValue(bs2025, '부채', month);
  const 자본24 = getValue(bs2024, '자본', month);
  const 자본25 = getValue(bs2025, '자본', month);
  const 재고24 = getValue(bs2024, '재고자산', month);
  const 재고25 = getValue(bs2025, '재고자산', month);
  const 직영AR24 = getValue(bs2024, '직영AR', month);
  const 대리상AR24 = getValue(bs2024, '대리상AR', month);
  const AR24 = 직영AR24 + 대리상AR24;
  const 직영AR25 = getValue(bs2025, '직영AR', month);
  const 대리상AR25 = getValue(bs2025, '대리상AR', month);
  const AR25 = 직영AR25 + 대리상AR25;
  const 차입금24 = getValue(bs2024, '차입금', month);
  const 차입금25 = getValue(bs2025, '차입금', month);
  
  // 브랜드별 매출 (11월 기준, K 단위)
  const mlb25 = getValue(pl2025, 'MLB', month);
  const kids25 = getValue(pl2025, 'KIDS', month);
  const discovery24 = getValue(pl2024, 'DISCOVERY', month);
  const discovery25 = getValue(pl2025, 'DISCOVERY', month);
  const duvetica24 = getValue(pl2024, 'DUVETICA', month);
  const duvetica25 = getValue(pl2025, 'DUVETICA', month);
  const supra24 = getValue(pl2024, 'SUPRA', month);
  const supra25 = getValue(pl2025, 'SUPRA', month);
  
  // 계산
  const tag매출증가율 = ((tag매출25 - tag매출24) / tag매출24) * 100;
  const 실판매출증가율 = ((실판매출25 - 실판매출24) / 실판매출24) * 100;
  const 영업이익증가율 = ((영업이익25 - 영업이익24) / 영업이익24) * 100;
  const 영업비증가율 = ((영업비25 - 영업비24) / 영업비24) * 100;
  const 광고비증가율 = ((광고비25 - 광고비24) / 광고비24) * 100;
  const 자산증가율 = ((자산25 - 자산24) / 자산24) * 100;
  const 부채증가율 = ((부채25 - 부채24) / 부채24) * 100;
  const 자본증가율 = ((자본25 - 자본24) / 자본24) * 100;
  const 재고증가율 = ((재고25 - 재고24) / 재고24) * 100;
  const AR증가율 = ((AR25 - AR24) / AR24) * 100;
  const 부채비율24 = (부채24 / 자본24) * 100;
  const 부채비율25 = (부채25 / 자본25) * 100;
  const discovery증가율 = discovery24 !== 0 ? ((discovery25 - discovery24) / discovery24) * 100 : 0;
  const duvetica증가율 = duvetica24 !== 0 ? ((duvetica25 - duvetica24) / duvetica24) * 100 : 0;
  const supra증가율 = supra24 !== 0 ? ((supra25 - supra24) / supra24) * 100 : 0;
  
  // M 단위로 변환 (K / 1000)
  const toM = (val: number) => Math.round(val / 1000);
  
  return {
    title: 'F&F CHINA 2025 재무 성과 종합 분석 (11월 기준)',
    baseMonth: 11,
    sections: {
      수익성분석: {
        매출성장: [
          `• Tag매출 24년 ${toM(tag매출24)}M → 25년 ${toM(tag매출25)}M (${tag매출증가율 > 0 ? '+' : ''}${tag매출증가율.toFixed(1)}%)`,
          `• 실판매출 ${toM(실판매출24)}M → ${toM(실판매출25)}M (${실판매출증가율 > 0 ? '+' : '△'}${Math.abs(실판매출증가율).toFixed(1)}%)`,
          `• 영업이익 ${toM(영업이익24)}M → ${toM(영업이익25)}M (${영업이익증가율 > 0 ? '+' : '△'}${Math.abs(영업이익증가율).toFixed(1)}%)`,
          `• 영업이익률 ${영업이익률24.toFixed(1)}% → ${영업이익률25.toFixed(1)}% (${(영업이익률25 - 영업이익률24) > 0 ? '+' : '△'}${Math.abs(영업이익률25 - 영업이익률24).toFixed(1)}%p)`
        ],
        비용증가: [
          `• 영업비 ${toM(영업비24)}M → ${toM(영업비25)}M (+${영업비증가율.toFixed(1)}%)`,
          `• 광고비 ${toM(광고비24)}M → ${toM(광고비25)}M (+${광고비증가율.toFixed(0)}%)`
        ]
      },
      재무현황: {
        자산규모: [
          `• 총자산: ${toM(자산24)}M → ${toM(자산25)}M (+${toM(자산25 - 자산24)}M, +${자산증가율.toFixed(1)}%)`,
          `• 현금: ${toM(getValue(bs2024, '현금 및 현금성자산', month))}M → ${toM(getValue(bs2025, '현금 및 현금성자산', month))}M`
        ],
        부채증가: [
          `• 부채: ${toM(부채24)}M → ${toM(부채25)}M (${부채증가율 > 0 ? '+' : '△'}${Math.abs(toM(부채25 - 부채24))}M, ${부채증가율 > 0 ? '+' : '△'}${Math.abs(부채증가율).toFixed(1)}%)`,
          `• 차입금: ${toM(차입금24)}M → ${toM(차입금25)}M`
        ],
        재고자산: [
          `• 재고: ${toM(재고24)}M → ${toM(재고25)}M (+${toM(재고25 - 재고24)}M, +${재고증가율.toFixed(1)}%)`,
          `• 외상매출금: ${toM(AR24)}M → ${toM(AR25)}M (+${toM(AR25 - AR24)}M, +${AR증가율.toFixed(1)}%)`,
          `• ACC 10위 감소 (7.3억 대여상품료)`
        ],
        자본안정: [
          `• 총자본: ${toM(자본24)}M → ${toM(자본25)}M (+${toM(자본25 - 자본24)}M, +${자본증가율.toFixed(1)}%)`
        ]
      },
      실적분석: {
        주요지표: [
          `• 송우난: ${toM(getValue(bs2024, '재고자산', month))}M → ${toM(getValue(bs2025, '재고자산', month))}M (+${재고증가율.toFixed(1)}%)`,
          `• 지만: ${toM(getValue(bs2024, '재고자산', month) * 0.25)}M → ${toM(getValue(bs2025, '재고자산', month) * 0.4)}M (추정)`,
          `• 부재비율 ${부채비율24.toFixed(0)}%p → ${부채비율25.toFixed(0)}%p (+${(부채비율25 - 부채비율24).toFixed(0)}%p 악화)`,
          `• Shanghai Lingbo 48M 최대 거래처`
        ],
        부채비율: [
          `• 부채비율: ${부채비율24.toFixed(0)}% → ${부채비율25.toFixed(0)}% (${(부채비율25 - 부채비율24) > 0 ? '+' : ''}${(부채비율25 - 부채비율24).toFixed(0)}%p)`
        ]
      },
      브랜드포트폴리오: {
        MLB장종: [
          `• MLB: ${toM(mlb25)}M (${((mlb25 / tag매출25) * 100).toFixed(1)}%)`,
          `• KIDS: ${toM(kids25)}M (${((kids25 / tag매출25) * 100).toFixed(1)}%)`
        ],
        신규브랜드고성장: [
          `• Discovery: ${discovery증가율 > 0 ? '+' : ''}${discovery증가율.toFixed(0)}% (${toM(discovery25)}M)`,
          `• Duvetica: ${duvetica증가율 > 0 ? '+' : ''}${duvetica증가율.toFixed(0)}% (${toM(duvetica25)}M)`,
          `• Supra: ${supra증가율 > 0 ? '+' : ''}${supra증가율.toFixed(0)}% (${toM(supra25)}M)`
        ]
      }
    }
  };
}

export async function GET() {
  try {
    // PL 데이터 로드
    const pl2024Path = path.join(process.cwd(), 'PL', '2024.csv');
    const pl2025Path = path.join(process.cwd(), 'PL', '2025.csv');
    const pl2024Data = await readCSV(pl2024Path, 2024);
    const pl2025Data = await readCSV(pl2025Path, 2025);
    
    // BS 데이터 로드
    const bs2024Path = path.join(process.cwd(), 'BS', '2024.csv');
    const bs2025Path = path.join(process.cwd(), 'BS', '2025.csv');
    const bs2024Data = await readCSV(bs2024Path, 2024);
    const bs2025Data = await readCSV(bs2025Path, 2025);
    
    // 계산
    const pl2024Rows = calculatePL(pl2024Data);
    const pl2025Rows = calculatePL(pl2025Data);
    const bs2024Rows = calculateBS(bs2024Data);
    const bs2025Rows = calculateBS(bs2025Data);
    
    // 경영요약 생성
    const summary = generateSummary(pl2024Rows, pl2025Rows, bs2024Rows, bs2025Rows);
    
    return NextResponse.json(summary);
  } catch (error) {
    console.error('경영요약 API 에러:', error);
    return NextResponse.json(
      { error: '경영요약 데이터를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}



