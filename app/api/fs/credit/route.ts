import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { readCreditCSV } from '@/lib/csv';
import { CreditData, CreditDealer } from '@/lib/types';

export async function GET() {
  try {
    const dirPath = path.join(process.cwd(), 'credit');
    
    // 디렉토리의 모든 CSV 파일 찾기
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.csv'));
    
    if (files.length === 0) {
      throw new Error('여신 CSV 파일이 없습니다.');
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
    const baseYearFull = baseYear + 2000; // 26 -> 2026
    
    const dealers = await readCreditCSV(filePath);

    // 합계 행 찾기 또는 자동 계산
    let totalRow = dealers.find(d => {
      const name = d.name.trim();
      return name === '합계';
    });
    
    // 합계 행이 없으면 자동 계산
    if (!totalRow) {
      const calculatedTotal = dealers
        .filter(d => {
          const name = d.name.trim();
          return name !== '합계' && name !== '';
        })
        .reduce(
          (sum, dealer) => ({
            name: '합계',
            외상매출금: sum.외상매출금 + dealer.외상매출금,
            선수금: sum.선수금 + dealer.선수금,
          }),
          { name: '합계', 외상매출금: 0, 선수금: 0 }
        );
      totalRow = calculatedTotal;
    }

    // 나머지 대리상 (합계 제외, 외상매출금과 선수금이 모두 0인 대리상 제외)
    const dealerList = dealers
      .filter(d => {
        const name = d.name.trim();
        return name !== '합계' && name !== '' && !(d.외상매출금 === 0 && d.선수금 === 0);
      })
      .map(d => ({
        name: d.name,
        외상매출금: d.외상매출금,
        선수금: d.선수금,
        순여신: d.외상매출금 - d.선수금,
      }));

    // 외상매출금 기준 내림차순 정렬
    dealerList.sort((a, b) => b.외상매출금 - a.외상매출금);

    // 상위 17개
    const top17 = dealerList.slice(0, 17);

    // 나머지 (기타)
    const others = dealerList.slice(17);
    const othersSum = {
      count: others.length,
      외상매출금: others.reduce((sum, d) => sum + d.외상매출금, 0),
      선수금: others.reduce((sum, d) => sum + d.선수금, 0),
      순여신: others.reduce((sum, d) => sum + d.순여신, 0),
    };

    // 총 순여신 (모든 대리상의 순여신 합계)
    const total순여신 = dealerList.reduce((sum: number, d) => sum + d.순여신, 0);

    // 분석 데이터
    const top17Sum = top17.reduce((sum, d) => sum + d.순여신, 0);
    const top1 = top17[0];

    const top17Ratio = total순여신 > 0 ? (top17Sum / total순여신) * 100 : 0;
    const top1Ratio = total순여신 > 0 && top1 ? (top1.순여신 / total순여신) * 100 : 0;

    const response: CreditData = {
      baseYearMonth: `${baseYear.toString().padStart(2, '0')}.${baseMonth.toString().padStart(2, '0')}`,
      baseYearFull,
      baseMonth,
      total: {
        외상매출금: totalRow.외상매출금,
        선수금: totalRow.선수금,
        순여신: total순여신,
      },
      dealers: dealerList,
      top17,
      others: othersSum,
      othersList: others,
      analysis: {
        top17Ratio,
        top1Ratio,
        riskLevel: top1Ratio > 20 ? '높음' : '낮음',
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Credit API 에러:', error);
    return NextResponse.json(
      { error: error?.message || '여신 데이터를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

