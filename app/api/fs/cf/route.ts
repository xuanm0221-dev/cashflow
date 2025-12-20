import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readCFCSV } from '@/lib/csv';
import { calculateCF } from '@/lib/fs-mapping';

export async function GET(request: NextRequest) {
  try {
    const year = 2025; // CF는 2025만 지원
    
    const filePath = path.join(process.cwd(), 'CF', `${year}.csv`);
    const { data, year2024Values } = await readCFCSV(filePath, year);
    const tableRows = calculateCF(data, year2024Values);
    
    return NextResponse.json({
      year,
      type: 'CF',
      rows: tableRows,
    });
  } catch (error) {
    console.error('CF API 에러:', error);
    return NextResponse.json(
      { error: 'CF 데이터를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

