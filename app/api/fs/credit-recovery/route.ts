import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { readCreditRecoveryCSV } from '@/lib/csv';

export async function GET(request: NextRequest) {
  try {
    const dirPath = path.join(process.cwd(), '여신회수계획');
    
    // 디렉토리의 모든 CSV 파일 찾기
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.csv'));
    
    if (files.length === 0) {
      throw new Error('여신회수 계획 CSV 파일이 없습니다.');
    }
    
    // YY.MM.csv 형식의 파일 찾기 (가장 최신 파일)
    const csvFiles = files
      .filter(f => /^\d{2}\.\d{2}\.csv$/.test(f))
      .sort()
      .reverse();
    
    if (csvFiles.length === 0) {
      throw new Error('YY.MM.csv 형식의 파일이 없습니다.');
    }
    
    const fileName = csvFiles[0]; // 가장 최신 파일
    const filePath = path.join(dirPath, fileName);
    
    // 파일명에서 YY.MM 파싱
    const match = fileName.match(/^(\d{2})\.(\d{2})\.csv$/);
    if (!match) {
      throw new Error('파일명 형식이 올바르지 않습니다.');
    }
    
    const baseYear = parseInt(match[1], 10);
    const baseMonth = parseInt(match[2], 10);
    
    const data = await readCreditRecoveryCSV(filePath);
    
    // 0이 아닌 회수 데이터와 해당 헤더만 필터링
    const filteredRecoveries: number[] = [];
    const filteredHeaders: string[] = [];
    
    data.recoveries.forEach((amount, idx) => {
      if (amount !== 0) {
        filteredRecoveries.push(amount);
        
        // 월 계산
        let year = baseYear;
        let month = baseMonth + idx + 1;
        
        if (month > 12) {
          year += Math.floor((month - 1) / 12);
          month = ((month - 1) % 12) + 1;
        }
        
        filteredHeaders.push(`${year.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}`);
      }
    });
    
    return NextResponse.json({
      대리상선수금: data.대리상선수금,
      대리상채권: data.대리상채권,
      recoveries: filteredRecoveries,
      baseYearMonth: `${baseYear.toString().padStart(2, '0')}.${baseMonth.toString().padStart(2, '0')}`,
      headers: filteredHeaders,
    });
  } catch (error) {
    console.error('여신회수 계획 데이터 로드 실패:', error);
    const message = error instanceof Error ? error.message : '여신회수 계획 데이터를 불러올 수 없습니다.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
