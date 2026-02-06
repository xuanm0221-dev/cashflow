import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { EditableAnalysis } from '@/lib/types';

// 토큰 검증 함수
function validateToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const timestamp = parseInt(decoded.split('-')[0]);
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;
    return (now - timestamp) < hourInMs;
  } catch {
    return false;
  }
}

// GET: 저장된 분석 내용 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    
    if (!year) {
      return NextResponse.json({ 
        error: 'year 파라미터가 필요합니다.' 
      }, { status: 400 });
    }
    
    const key = `analysis:${year}`;
    let analysis = (await kv.get(key)) as EditableAnalysis | null;
    
    // 마이그레이션: "from 차입금" → "차입금"
    if (analysis) {
      // cfCategories 배열에서 계정명 변환
      if (analysis.cfCategories) {
        analysis.cfCategories = analysis.cfCategories.map(cat => ({
          ...cat,
          account: cat.account === 'from 차입금' ? '차입금' : cat.account
        }));
      }
      
      // wcCategories 배열도 확인 (혹시 모를 경우 대비)
      if (analysis.wcCategories) {
        analysis.wcCategories = analysis.wcCategories.map(cat => ({
          ...cat,
          account: cat.account === 'from 차입금' ? '차입금' : cat.account
        }));
      }
    }
    
    return NextResponse.json({ 
      analysis: analysis || null
    });
  } catch (error) {
    console.error('분석 조회 에러:', error);
    return NextResponse.json({ 
      analysis: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// POST: 분석 내용 저장
export async function POST(request: NextRequest) {
  try {
    // 토큰 검증
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token || !validateToken(token)) {
      return NextResponse.json({ 
        success: false,
        error: '인증이 필요합니다. PIN을 다시 입력해주세요.'
      }, { status: 401 });
    }
    
    const body = await request.json();
    const { year, analysis } = body;
    
    if (!year || !analysis) {
      return NextResponse.json({ 
        success: false,
        error: 'year와 analysis 데이터가 필요합니다.' 
      }, { status: 400 });
    }
    
    // 마지막 수정 시간 추가
    const updatedAnalysis: EditableAnalysis = {
      ...analysis,
      year,
      lastModified: new Date().toISOString()
    };
    
    const key = `analysis:${year}`;
    await kv.set(key, updatedAnalysis);
    
    return NextResponse.json({ 
      success: true,
      message: '저장되었습니다.',
      analysis: updatedAnalysis
    });
  } catch (error) {
    console.error('분석 저장 에러:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE: 저장된 분석 내용 삭제 (초기화)
export async function DELETE(request: NextRequest) {
  try {
    // 토큰 검증
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token || !validateToken(token)) {
      return NextResponse.json({ 
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    
    if (!year) {
      return NextResponse.json({ 
        success: false,
        error: 'year 파라미터가 필요합니다.' 
      }, { status: 400 });
    }
    
    const key = `analysis:${year}`;
    await kv.del(key);
    
    return NextResponse.json({ 
      success: true,
      message: '초기화되었습니다. 자동 생성된 내용이 표시됩니다.'
    });
  } catch (error) {
    console.error('분석 삭제 에러:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
