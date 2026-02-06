import { NextRequest, NextResponse } from 'next/server';

// 간단한 토큰 생성 (실제로는 JWT를 사용하는 것이 좋지만, 여기서는 간단하게 구현)
function generateToken(): string {
  return Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64');
}

// 토큰 검증 (1시간 유효)
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

// GET: 토큰 검증
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ 
        valid: false,
        error: '토큰이 없습니다.' 
      }, { status: 401 });
    }
    
    const isValid = validateToken(token);
    
    return NextResponse.json({ 
      valid: isValid,
      message: isValid ? '유효한 토큰입니다.' : '토큰이 만료되었거나 유효하지 않습니다.'
    });
  } catch (error) {
    console.error('토큰 검증 에러:', error);
    return NextResponse.json({ 
      valid: false,
      error: '토큰 검증 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}

// POST: PIN 확인 및 토큰 발급
export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();
    
    if (!pin) {
      return NextResponse.json({ 
        success: false,
        error: 'PIN을 입력해주세요.' 
      }, { status: 400 });
    }
    
    // 환경변수에서 PIN 가져오기 (기본값: 1234)
    const correctPin = process.env.EDIT_PIN || '1234';
    
    if (pin !== correctPin) {
      return NextResponse.json({ 
        success: false,
        error: 'PIN이 올바르지 않습니다.'
      }, { status: 401 });
    }
    
    // 토큰 생성
    const token = generateToken();
    
    return NextResponse.json({ 
      success: true,
      token,
      message: '인증되었습니다.'
    });
  } catch (error) {
    console.error('PIN 인증 에러:', error);
    return NextResponse.json({ 
      success: false,
      error: '인증 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}

// 토큰 검증 헬퍼 함수 (다른 API에서 사용 가능)
function verifyAuthToken(request: NextRequest): boolean {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return false;
  return validateToken(token);
}
