import { NextRequest, NextResponse } from 'next/server';
import { readBalanceCSV } from '@/lib/csv';
import path from 'path';

// GET: 현금차입금 잔액 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year') || '2026';

    const csvPath = path.join(process.cwd(), '기타', `${year}.csv`);
    const rawData = await readBalanceCSV(csvPath);
    
    if (!rawData || rawData.length === 0) {
      return NextResponse.json({ 
        error: '데이터를 찾을 수 없습니다.' 
      }, { status: 404 });
    }
    
    // CSV 파싱
    const 현금잔액Row = rawData.find(row => row[0] && row[0].trim() === '현금잔액');
    const 차입금잔액Row = rawData.find(row => row[0] && row[0].trim() === '차입금잔액');
    
    if (!현금잔액Row || !차입금잔액Row) {
      return NextResponse.json({ 
        error: '필요한 데이터가 CSV에 없습니다.' 
      }, { status: 404 });
    }
    
    const balanceData = {
      현금잔액: {
        기초잔액: parseFloat(현금잔액Row[1]) || 0,
        monthly: 현금잔액Row.slice(2, 14).map(v => parseFloat(v) || 0),
        기말잔액: parseFloat(현금잔액Row[14]) || 0
      },
      차입금잔액: {
        기초잔액: parseFloat(차입금잔액Row[1]) || 0,
        monthly: 차입금잔액Row.slice(2, 14).map(v => parseFloat(v) || 0),
        기말잔액: parseFloat(차입금잔액Row[14]) || 0
      }
    };
    
    return NextResponse.json(balanceData);
  } catch (error) {
    console.error('현금차입금 잔액 데이터 조회 에러:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '데이터를 불러올 수 없습니다.'
    }, { status: 500 });
  }
}
