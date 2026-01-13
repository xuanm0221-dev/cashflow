import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readCSV } from '@/lib/csv';
import { calculatePL, calculateComparisonData, calculateBrandBreakdown } from '@/lib/fs-mapping';
import { TableRow } from '@/lib/types';

const VALID_BRANDS = ['mlb', 'kids', 'discovery', 'duvetica', 'supra'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const yearParam = searchParams.get('year');
    const baseMonthParam = searchParams.get('baseMonth');
    
    const year = yearParam ? parseInt(yearParam, 10) : 2025;
    const baseMonth = baseMonthParam ? parseInt(baseMonthParam, 10) : 12;
    
    if (![2024, 2025].includes(year)) {
      return NextResponse.json(
        { error: '유효하지 않은 연도입니다. 2024 또는 2025를 선택하세요.' },
        { status: 400 }
      );
    }
    
    if (baseMonth < 1 || baseMonth > 12) {
      return NextResponse.json(
        { error: '기준월은 1~12 사이여야 합니다.' },
        { status: 400 }
      );
    }

    // 법인 전체 데이터 로드
    const corporateFilePath = path.join(process.cwd(), 'PL', `${year}.csv`);
    const corporateData = await readCSV(corporateFilePath, year);
    let corporateRows = calculatePL(corporateData);
    
    // 2025년인 경우 비교 데이터 추가
    if (year === 2025) {
      const corporateFilePath2024 = path.join(process.cwd(), 'PL', '2024.csv');
      const corporateData2024 = await readCSV(corporateFilePath2024, 2024);
      const corporateRows2024 = calculatePL(corporateData2024);
      corporateRows = calculateComparisonData(corporateRows, corporateRows2024, baseMonth);
    }

    // 각 브랜드별 데이터 로드
    const brandRowsMap = new Map<string, TableRow[]>();
    
    for (const brand of VALID_BRANDS) {
      try {
        const brandFilePath = path.join(process.cwd(), 'PL_brand', brand, `${year}.csv`);
        const brandData = await readCSV(brandFilePath, year);
        let brandRows = calculatePL(brandData, true);
        
        // 2025년인 경우 비교 데이터 추가
        if (year === 2025) {
          const brandFilePath2024 = path.join(process.cwd(), 'PL_brand', brand, '2024.csv');
          const brandData2024 = await readCSV(brandFilePath2024, 2024);
          const brandRows2024 = calculatePL(brandData2024, true);
          brandRows = calculateComparisonData(brandRows, brandRows2024, baseMonth);
        }
        
        brandRowsMap.set(brand, brandRows);
      } catch (error) {
        console.error(`${brand} 브랜드 데이터 로드 실패:`, error);
        // 브랜드 데이터가 없어도 계속 진행
      }
    }

    // 브랜드별 비교 데이터 계산
    const resultRows = calculateBrandBreakdown(corporateRows, brandRowsMap, baseMonth);
    
    return NextResponse.json({
      year,
      type: 'PL',
      baseMonth: year === 2025 ? baseMonth : undefined,
      rows: resultRows,
    });
  } catch (error) {
    console.error('브랜드별 손익 보기 API 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json(
      { error: `브랜드별 손익 데이터를 불러오는데 실패했습니다: ${errorMessage}` },
      { status: 500 }
    );
  }
}
