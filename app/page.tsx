'use client';

import { useState, useEffect, useMemo } from 'react';
import Tabs from '@/components/Tabs';
import YearTabs from '@/components/YearTabs';
import FinancialTable from '@/components/FinancialTable';
import CreditStatus from '@/components/CreditStatus';
import { TableRow, CreditData, CreditRecoveryData, TabType, EditableAnalysis, EditableCategoryAnalysis, BalanceData } from '@/lib/types';
import {
  analyzeCashFlowData,
  analyzeWorkingCapitalData,
  generateCashFlowInsights,
} from '@/lib/analysis';
import { formatNumber, formatMillionYuan } from '@/lib/utils';

export default function Home() {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [wcYear, setWcYear] = useState<number>(2026);
  const [workingCapitalMonthsCollapsed, setWorkingCapitalMonthsCollapsed] = useState<boolean>(true);
  const [wcAllRowsCollapsed, setWcAllRowsCollapsed] = useState<boolean>(true);
  const [wcStatementAllRowsCollapsed, setWcStatementAllRowsCollapsed] = useState<boolean>(true);
  const [cfData, setCfData] = useState<TableRow[] | null>(null);
  const [wcStatementData, setWcStatementData] = useState<TableRow[] | null>(null);
  const [creditData, setCreditData] = useState<CreditData | null>(null);
  const [creditRecoveryData, setCreditRecoveryData] = useState<CreditRecoveryData | null>(null);
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 편집 모드 관련 상태
  const [editMode, setEditMode] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [authToken, setAuthToken] = useState<string>('');
  const [savedAnalysis, setSavedAnalysis] = useState<EditableAnalysis | null>(null);
  const [editedAnalysis, setEditedAnalysis] = useState<EditableAnalysis | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const tabs = ['연간 자금계획', '여신사용현황'];
  const tabTypes: TabType[] = ['CF', 'CREDIT'];

  // 데이터 로딩: 현금흐름표=CF 폴더, 운전자본표=운전자본 폴더
  const loadData = async (type: TabType, year?: number) => {
    setLoading(true);
    setError(null);

    try {
      let url = '';
      if (type === 'CREDIT') {
        url = `/api/fs/credit`;
      } else if (type === 'CF') {
        url = `/api/fs/cf?year=${year}`;
      } else if (type === 'WORKING_CAPITAL_STATEMENT') {
        url = `/api/fs/working-capital-statement?year=${year}`;
      } else if (type === 'CREDIT_RECOVERY') {
        url = `/api/fs/credit-recovery`;
      } else if (type === 'BALANCE') {
        url = `/api/fs/balance?year=${year}`;
      }

      if (!url) return;

      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        if (type === 'BALANCE') setBalanceData(null);
        const message = result?.error || '데이터를 불러올 수 없습니다.';
        throw new Error(message);
      }

      if (type === 'CF') {
        setCfData(result.rows);
      } else if (type === 'WORKING_CAPITAL_STATEMENT') {
        setWcStatementData(result.rows);
      } else if (type === 'CREDIT') {
        setCreditData(result);
      } else if (type === 'CREDIT_RECOVERY') {
        setCreditRecoveryData(result);
      } else if (type === 'BALANCE') {
        setBalanceData(result);
      }
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // 탭 변경 시 데이터 로드
  useEffect(() => {
    if (activeTab === 0) {
      if (!cfData) loadData('CF', wcYear);
      if (!wcStatementData) loadData('WORKING_CAPITAL_STATEMENT', wcYear);
      if (!balanceData) loadData('BALANCE', wcYear);
      if (!creditRecoveryData) loadData('CREDIT_RECOVERY');
    } else if (activeTab === 1) {
      if (!creditData) loadData('CREDIT');
      if (!creditRecoveryData) loadData('CREDIT_RECOVERY');
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 0) {
      loadData('CF', wcYear);
      loadData('WORKING_CAPITAL_STATEMENT', wcYear);
      setBalanceData(null);
      loadData('BALANCE', wcYear);
    }
  }, [wcYear]);

  // 월 컬럼 (1월~12월)
  const monthColumns = ['계정과목', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  // 저장된 분석 데이터 로드
  useEffect(() => {
    const loadSavedAnalysis = async () => {
      try {
        const response = await fetch(`/api/analysis?year=${wcYear}`);
        const result = await response.json();
        if (result.analysis) {
          setSavedAnalysis(result.analysis);
        } else {
          setSavedAnalysis(null);
        }
      } catch (err) {
        console.error('저장된 분석 조회 실패:', err);
      }
    };

    loadSavedAnalysis();
  }, [wcYear]);

  // 인증 토큰 확인 (localStorage에서 복원)
  useEffect(() => {
    const token = localStorage.getItem('editToken');
    if (token) {
      // 토큰 유효성 확인
      fetch('/api/auth/pin', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setAuthToken(token);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('editToken');
          }
        })
        .catch(() => {
          localStorage.removeItem('editToken');
        });
    }
  }, []);

  // PIN 인증 처리
  const handlePinSubmit = async () => {
    setPinError('');
    try {
      const response = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput })
      });
      const result = await response.json();

      if (result.success) {
        setAuthToken(result.token);
        setIsAuthenticated(true);
        setShowPinModal(false);
        setPinInput('');
        localStorage.setItem('editToken', result.token);
      } else {
        setPinError(result.error || 'PIN이 올바르지 않습니다.');
      }
    } catch (err) {
      setPinError('인증 중 오류가 발생했습니다.');
    }
  };

  // 편집 모드 토글
  const toggleEditMode = () => {
    if (!isAuthenticated) {
      setShowPinModal(true);
      return;
    }
    
    if (!editMode) {
      // 편집 모드 진입: 현재 분석 결과를 편집 가능한 형태로 복사
      if (analysisResults) {
        const editable: EditableAnalysis = {
          year: wcYear,
          keyInsights: savedAnalysis?.keyInsights || analysisResults.insights.keyInsights,
          cfCategories: savedAnalysis?.cfCategories || analysisResults.cfAnalysis.categories.map(c => ({
            account: c.account,
            annualTotal: c.annualTotal,
            yoyAbsolute: c.yoyAbsolute,
            yoyPercent: c.yoyPercent,
            customText: undefined
          })),
          wcCategories: savedAnalysis?.wcCategories || analysisResults.wcAnalysis.categories.map(c => ({
            account: c.account,
            annualTotal: c.annualTotal,
            yoyAbsolute: c.yoyAbsolute,
            yoyPercent: c.yoyPercent,
            customText: undefined
          })),
          wcInsights: savedAnalysis?.wcInsights || {
            arInsight: analysisResults.wcAnalysis.arInsight,
            inventoryInsight: analysisResults.wcAnalysis.inventoryInsight,
            apInsight: analysisResults.wcAnalysis.apInsight
          },
          riskFactors: savedAnalysis?.riskFactors || analysisResults.insights.riskFactors,
          actionItems: savedAnalysis?.actionItems || analysisResults.insights.actionItems,
          lastModified: new Date().toISOString()
        };
        setEditedAnalysis(editable);
      }
      setEditMode(true);
    } else {
      setEditMode(false);
      setEditedAnalysis(null);
    }
  };

  // 저장 처리
  const handleSave = async () => {
    if (!editedAnalysis) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          year: wcYear,
          analysis: editedAnalysis
        })
      });

      const result = await response.json();

      if (result.success) {
        setSavedAnalysis(result.analysis);
        setEditMode(false);
        setEditedAnalysis(null);
        alert('저장되었습니다.');
      } else {
        alert(result.error || '저장 실패');
      }
    } catch (err) {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 초기화 처리
  const handleReset = async () => {
    if (!confirm('저장된 내용을 삭제하고 자동 생성된 내용으로 초기화하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/analysis?year=${wcYear}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setSavedAnalysis(null);
        setEditedAnalysis(null);
        setEditMode(false);
        alert('초기화되었습니다.');
      } else {
        alert(result.error || '초기화 실패');
      }
    } catch (err) {
      alert('초기화 중 오류가 발생했습니다.');
    }
  };

  // 분석 결과 계산 (useMemo로 캐싱): 현금흐름표=cfData(CF 폴더), 운전자본표=wcStatementData(운전자본 폴더)
  const analysisResults = useMemo(() => {
    if (!cfData && !wcStatementData) {
      return null;
    }

    const cfAnalysis = analyzeCashFlowData(cfData, wcYear);
    const wcAnalysis = analyzeWorkingCapitalData(wcStatementData, wcYear);
    const insights = generateCashFlowInsights(cfData, wcStatementData, wcYear);

    return { cfAnalysis, wcAnalysis, insights };
  }, [cfData, wcStatementData, wcYear]);

  // 최종 표시할 분석 결과 (편집 모드일 때는 editedAnalysis, 아니면 savedAnalysis 또는 자동 생성)
  const displayAnalysis = useMemo(() => {
    if (editMode && editedAnalysis) {
      return editedAnalysis;
    }
    if (savedAnalysis) {
      return savedAnalysis;
    }
    if (analysisResults) {
      return {
        year: wcYear,
        keyInsights: analysisResults.insights.keyInsights,
        cfCategories: analysisResults.cfAnalysis.categories.map(c => ({
          account: c.account,
          annualTotal: c.annualTotal,
          yoyAbsolute: c.yoyAbsolute,
          yoyPercent: c.yoyPercent,
          customText: undefined
        })),
        wcCategories: analysisResults.wcAnalysis.categories.map(c => ({
          account: c.account,
          annualTotal: c.annualTotal,
          yoyAbsolute: c.yoyAbsolute,
          yoyPercent: c.yoyPercent,
          customText: undefined
        })),
        wcInsights: {
          arInsight: analysisResults.wcAnalysis.arInsight,
          inventoryInsight: analysisResults.wcAnalysis.inventoryInsight,
          apInsight: analysisResults.wcAnalysis.apInsight
        },
        riskFactors: analysisResults.insights.riskFactors,
        actionItems: analysisResults.insights.actionItems,
        lastModified: new Date().toISOString()
      };
    }
    return null;
  }, [editMode, editedAnalysis, savedAnalysis, analysisResults, wcYear]);

  // 카테고리 텍스트 자동 생성 헬퍼 함수
  const generateCategoryText = (cat: EditableCategoryAnalysis, isCashFlow: boolean = true): string => {
    let text = `연간 ${formatMillionYuan(cat.annualTotal)}`;
    
    if (cat.yoyAbsolute !== null) {
      const isPositive = isCashFlow ? cat.yoyAbsolute > 0 : cat.yoyAbsolute < 0;
      text += ` (전년 대비 ${formatMillionYuan(Math.abs(cat.yoyAbsolute))}`;
      
      if (cat.yoyPercent !== null) {
        text += `, ${cat.yoyPercent > 0 ? '+' : ''}${cat.yoyPercent.toFixed(1)}%)`;
      } else {
        text += ')';
      }
    }
    
    return text;
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* PIN 모달 */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-bold mb-4">편집 모드 인증</h3>
            <p className="text-sm text-gray-600 mb-4">편집 모드를 활성화하려면 PIN을 입력하세요.</p>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handlePinSubmit()}
              placeholder="PIN 입력"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {pinError && <p className="text-sm text-red-500 mb-4">{pinError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handlePinSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                확인
              </button>
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPinInput('');
                  setPinError('');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상단 탭 */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* 내용 - 상단 탭 높이만큼 패딩 추가 */}
      <div className="p-0 pt-16">
        {/* 연간 자금계획 - 현금흐름표 */}
        {activeTab === 0 && (
          <div>
            <div className="bg-gray-100 border-b border-gray-300">
              <div className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-4">
                  <YearTabs years={[2025, 2026]} activeYear={wcYear} onChange={setWcYear} />
                  <button
                    onClick={() => setWorkingCapitalMonthsCollapsed(!workingCapitalMonthsCollapsed)}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors shadow-sm"
                  >
                    {workingCapitalMonthsCollapsed ? '월별 데이터 펼치기 ▶' : '월별 데이터 접기 ◀'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {editMode && (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
                      >
                        {isSaving ? '저장 중...' : '저장'}
                      </button>
                      <button
                        onClick={handleReset}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
                      >
                        초기화
                      </button>
                    </>
                  )}
                  <button
                    onClick={toggleEditMode}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
                      editMode 
                        ? 'bg-orange-600 text-white hover:bg-orange-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {editMode ? '편집 모드 끄기 🔒' : '편집 모드 켜기 🔓'}
                  </button>
                </div>
              </div>
            </div>
            {loading && <div className="p-6 text-center">로딩 중...</div>}
            {error && <div className="p-6 text-center text-red-500">{error}</div>}
            {(cfData || wcStatementData) && !loading && (
              <div className="px-6 pt-6 pb-6">
                {workingCapitalMonthsCollapsed ? (
                  <div className="flex gap-6 items-start">
                    <div className="flex-shrink-0">
                      {cfData && (
                        <>
                          <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-lg font-bold text-gray-800">현금흐름표</h2>
                            <button
                              onClick={() => setWcAllRowsCollapsed(!wcAllRowsCollapsed)}
                              className="px-4 py-2 text-sm font-medium rounded bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                            >
                              {wcAllRowsCollapsed ? '펼치기 ▼' : '접기 ▲'}
                            </button>
                          </div>
                          <FinancialTable 
                            data={cfData} 
                            columns={[...monthColumns, `${wcYear}년(합계)`, 'YoY']} 
                            showTotal
                            isCashFlow={true}
                            monthsCollapsed={workingCapitalMonthsCollapsed}
                            onMonthsToggle={() => setWorkingCapitalMonthsCollapsed(!workingCapitalMonthsCollapsed)}
                            currentYear={wcYear}
                            allRowsCollapsed={wcAllRowsCollapsed}
                            onAllRowsToggle={() => setWcAllRowsCollapsed(!wcAllRowsCollapsed)}
                            defaultExpandedAccounts={['영업활동']}
                          />
                        </>
                      )}
                      
                      {/* 현금잔액과 차입금잔액표 */}
                      {balanceData && (
                        <div className="mt-8 pt-6 border-t-2 border-gray-400">
                          <h2 className="text-lg font-bold text-gray-800 mb-4">
                            현금잔액과 차입금잔액표
                          </h2>
                          <div className="overflow-x-auto">
                            <table className="min-w-full border border-gray-300 bg-white">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                                    구분
                                  </th>
                                  <th className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                                    기초잔액
                                  </th>
                                  {!workingCapitalMonthsCollapsed && (
                                    <>
                                      {['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'].map((month) => (
                                        <th key={month} className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                                          {month}
                                        </th>
                                      ))}
                                    </>
                                  )}
                                  {workingCapitalMonthsCollapsed && (
                                    <th className="bg-white border-0" style={{ minWidth: '16px', maxWidth: '16px', padding: 0 }}></th>
                                  )}
                                  <th className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                                    기말잔액
                                  </th>
                                  <th className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 bg-yellow-50">
                                    YoY
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {/* 현금잔액 */}
                                <tr>
                                  <td className="border border-gray-300 px-4 py-2 text-sm font-semibold bg-blue-50">
                                    현금잔액
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-sm text-right">
                                    {formatNumber(balanceData.현금잔액.기초잔액, false, false)}
                                  </td>
                                  {!workingCapitalMonthsCollapsed && (
                                    <>
                                      {balanceData.현금잔액.monthly.map((value, idx) => (
                                        <td key={idx} className="border border-gray-300 px-4 py-2 text-sm text-right">
                                          {formatNumber(value, false, false)}
                                        </td>
                                      ))}
                                    </>
                                  )}
                                  {workingCapitalMonthsCollapsed && (
                                    <td className="bg-white border-0" style={{ minWidth: '16px', maxWidth: '16px', padding: 0 }}></td>
                                  )}
                                  <td className="border border-gray-300 px-4 py-2 text-sm text-right font-semibold">
                                    {formatNumber(balanceData.현금잔액.기말잔액, false, false)}
                                  </td>
                                  <td className={`border border-gray-300 px-4 py-2 text-sm text-right font-semibold ${
                                    (balanceData.현금잔액.기말잔액 - balanceData.현금잔액.기초잔액) >= 0 
                                      ? 'text-blue-600' 
                                      : 'text-red-600'
                                  }`}>
                                    {formatNumber(balanceData.현금잔액.기말잔액 - balanceData.현금잔액.기초잔액, true, false)}
                                  </td>
                                </tr>
                                
                                {/* 차입금잔액 */}
                                <tr>
                                  <td className="border border-gray-300 px-4 py-2 text-sm font-semibold bg-red-50">
                                    차입금잔액
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-sm text-right">
                                    {formatNumber(balanceData.차입금잔액.기초잔액, false, false)}
                                  </td>
                                  {!workingCapitalMonthsCollapsed && (
                                    <>
                                      {balanceData.차입금잔액.monthly.map((value, idx) => (
                                        <td key={idx} className="border border-gray-300 px-4 py-2 text-sm text-right">
                                          {formatNumber(value, false, false)}
                                        </td>
                                      ))}
                                    </>
                                  )}
                                  {workingCapitalMonthsCollapsed && (
                                    <td className="bg-white border-0" style={{ minWidth: '16px', maxWidth: '16px', padding: 0 }}></td>
                                  )}
                                  <td className="border border-gray-300 px-4 py-2 text-sm text-right font-semibold">
                                    {formatNumber(balanceData.차입금잔액.기말잔액, false, false)}
                                  </td>
                                  <td className={`border border-gray-300 px-4 py-2 text-sm text-right font-semibold ${
                                    (balanceData.차입금잔액.기말잔액 - balanceData.차입금잔액.기초잔액) >= 0 
                                      ? 'text-red-600' 
                                      : 'text-blue-600'
                                  }`}>
                                    {formatNumber(balanceData.차입금잔액.기말잔액 - balanceData.차입금잔액.기초잔액, true, false)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      
                      {wcStatementData && (
                        <div className="mt-8 pt-6 border-t-2 border-gray-400">
                          <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-lg font-bold text-gray-800">운전자본표</h2>
                            <button
                              onClick={() => setWcStatementAllRowsCollapsed(!wcStatementAllRowsCollapsed)}
                              className="px-4 py-2 text-sm font-medium rounded bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                            >
                              {wcStatementAllRowsCollapsed ? '펼치기 ▼' : '접기 ▲'}
                            </button>
                          </div>
                          <FinancialTable 
                            data={wcStatementData} 
                            columns={[...monthColumns, `${wcYear}년(기말)`, 'YoY']} 
                            showTotal
                            isCashFlow={true}
                            monthsCollapsed={workingCapitalMonthsCollapsed}
                            onMonthsToggle={() => setWorkingCapitalMonthsCollapsed(!workingCapitalMonthsCollapsed)}
                            currentYear={wcYear}
                            allRowsCollapsed={wcStatementAllRowsCollapsed}
                            onAllRowsToggle={() => setWcStatementAllRowsCollapsed(!wcStatementAllRowsCollapsed)}
                          />
                        </div>
                      )}
                      {creditRecoveryData && (
                        <div className="mt-8 pt-6 border-t-2 border-gray-400">
                          <h2 className="text-lg font-bold text-gray-800 mb-4">
                            대리상 여신회수 계획 ({creditRecoveryData.baseYearMonth} 기준)
                          </h2>
                          <div className="overflow-x-auto">
                            <table className="min-w-full border border-gray-300">
                              <thead>
                                <tr>
                                  <th className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 bg-highlight-yellow">
                                    대리상선수금
                                  </th>
                                  <th className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 bg-highlight-yellow">
                                    대리상 채권
                                  </th>
                                  {creditRecoveryData.headers.map((header, idx) => (
                                    <th key={idx} className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100">
                                      {header}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="border border-gray-300 px-4 py-2 text-sm text-right">
                                    {formatNumber(creditRecoveryData.대리상선수금, false, false)}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-sm text-right">
                                    {formatNumber(creditRecoveryData.대리상채권, false, false)}
                                  </td>
                                  {creditRecoveryData.recoveries.map((amount, idx) => (
                                    <td key={idx} className="border border-gray-300 px-4 py-2 text-sm text-right">
                                      {formatNumber(amount, true, false)}
                                    </td>
                                  ))}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                    <aside className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-6 shadow-sm overflow-y-auto max-h-[calc(100vh-200px)]">
                      <h3 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-gray-300">설명과 분석</h3>
                      
                      {displayAnalysis ? (
                        <div className="space-y-4">
                          {/* 핵심 인사이트 */}
                          <section className="bg-white rounded-lg border border-blue-100 shadow-sm p-4">
                            <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                              <span className="w-1.5 h-5 bg-blue-600 mr-2.5 rounded"></span>
                              핵심 인사이트
                            </h4>
                            <ul className="space-y-3">
                              {displayAnalysis.keyInsights.map((insight, idx) => (
                                <li key={idx} className="text-base text-gray-700 leading-relaxed pl-4 border-l-3 border-blue-200 flex items-start gap-2">
                                  {editMode ? (
                                    <>
                                      <textarea
                                        value={insight}
                                        onChange={(e) => {
                                          const newInsights = [...displayAnalysis.keyInsights];
                                          newInsights[idx] = e.target.value;
                                          setEditedAnalysis({ ...displayAnalysis, keyInsights: newInsights });
                                        }}
                                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                      />
                                      <button
                                        onClick={() => {
                                          const newInsights = displayAnalysis.keyInsights.filter((_, i) => i !== idx);
                                          setEditedAnalysis({ ...displayAnalysis, keyInsights: newInsights });
                                        }}
                                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                      >
                                        삭제
                                      </button>
                                    </>
                                  ) : (
                                    <span>{insight}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                            {editMode && (
                              <button
                                onClick={() => {
                                  const newInsights = [...displayAnalysis.keyInsights, '새 인사이트'];
                                  setEditedAnalysis({ ...displayAnalysis, keyInsights: newInsights });
                                }}
                                className="mt-3 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                + 추가
                              </button>
                            )}
                          </section>

                          {/* 2열 그리드: 현금흐름표 + 운전자본표 */}
                          <div className="grid grid-cols-2 gap-4">
                            {/* 현금흐름표 상세 */}
                            {displayAnalysis.cfCategories.length > 0 && (
                              <section className="bg-white rounded-lg border border-green-100 shadow-sm p-4">
                                <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                                  <span className="w-1.5 h-5 bg-green-600 mr-2.5 rounded"></span>
                                  {wcYear}년 현금흐름표
                                </h4>
                                <div className="space-y-3">
                                  {displayAnalysis.cfCategories.map((cat, idx) => (
                                    <div key={idx} className="text-base pl-2">
                                      <div className="font-semibold text-gray-900 mb-1">
                                        {cat.account}
                                      </div>
                                      <div className="text-gray-700 pl-4">
                                        {editMode ? (
                                          <div className="space-y-2">
                                            <div className="text-xs text-gray-500 italic">
                                              자동 생성: {generateCategoryText(cat, true)}
                                            </div>
                                            <textarea
                                              value={cat.customText !== undefined ? cat.customText : generateCategoryText(cat, true)}
                                              onChange={(e) => {
                                                const newCategories = [...displayAnalysis.cfCategories];
                                                newCategories[idx] = { ...newCategories[idx], customText: e.target.value };
                                                setEditedAnalysis({ ...displayAnalysis, cfCategories: newCategories });
                                              }}
                                              placeholder="금액 표시 텍스트 입력..."
                                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                                              rows={2}
                                            />
                                            <button
                                              onClick={() => {
                                                const newCategories = [...displayAnalysis.cfCategories];
                                                newCategories[idx] = { ...newCategories[idx], customText: undefined };
                                                setEditedAnalysis({ ...displayAnalysis, cfCategories: newCategories });
                                              }}
                                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                              자동 생성으로 복원
                                            </button>
                                          </div>
                                        ) : (
                                          <span>
                                            {cat.customText !== undefined ? cat.customText : generateCategoryText(cat, true)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </section>
                            )}

                            {/* 운전자본표 상세 */}
                            {displayAnalysis.wcCategories.length > 0 && (
                              <section className="bg-white rounded-lg border border-purple-100 shadow-sm p-4">
                                <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                                  <span className="w-1.5 h-5 bg-purple-600 mr-2.5 rounded"></span>
                                  {wcYear}년 운전자본표
                                </h4>
                                <div className="space-y-3">
                                  {displayAnalysis.wcCategories.map((cat, idx) => (
                                    <div key={idx} className="text-base pl-2">
                                      <div className="font-semibold text-gray-900 mb-1">
                                        {cat.account}
                                      </div>
                                      <div className="text-gray-700 pl-4">
                                        {editMode ? (
                                          <div className="space-y-2">
                                            <div className="text-xs text-gray-500 italic">
                                              자동 생성: {generateCategoryText(cat, false)}
                                            </div>
                                            <textarea
                                              value={cat.customText !== undefined ? cat.customText : generateCategoryText(cat, false)}
                                              onChange={(e) => {
                                                const newCategories = [...displayAnalysis.wcCategories];
                                                newCategories[idx] = { ...newCategories[idx], customText: e.target.value };
                                                setEditedAnalysis({ ...displayAnalysis, wcCategories: newCategories });
                                              }}
                                              placeholder="금액 표시 텍스트 입력..."
                                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                              rows={2}
                                            />
                                            <button
                                              onClick={() => {
                                                const newCategories = [...displayAnalysis.wcCategories];
                                                newCategories[idx] = { ...newCategories[idx], customText: undefined };
                                                setEditedAnalysis({ ...displayAnalysis, wcCategories: newCategories });
                                              }}
                                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                              자동 생성으로 복원
                                            </button>
                                          </div>
                                        ) : (
                                          <span>
                                            {cat.customText !== undefined ? cat.customText : generateCategoryText(cat, false)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  
                                  {/* 항목별 인사이트 */}
                                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-2.5">
                                    {displayAnalysis.wcInsights.arInsight && (
                                      <div className="text-sm text-gray-700 leading-relaxed">
                                        <span className="font-semibold text-gray-900">매출채권:</span>{' '}
                                        {editMode ? (
                                          <textarea
                                            value={displayAnalysis.wcInsights.arInsight}
                                            onChange={(e) => setEditedAnalysis({ 
                                              ...displayAnalysis, 
                                              wcInsights: { ...displayAnalysis.wcInsights, arInsight: e.target.value } 
                                            })}
                                            className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            rows={2}
                                          />
                                        ) : (
                                          displayAnalysis.wcInsights.arInsight
                                        )}
                                      </div>
                                    )}
                                    {displayAnalysis.wcInsights.inventoryInsight && (
                                      <div className="text-sm text-gray-700 leading-relaxed">
                                        <span className="font-semibold text-gray-900">재고자산:</span>{' '}
                                        {editMode ? (
                                          <textarea
                                            value={displayAnalysis.wcInsights.inventoryInsight}
                                            onChange={(e) => setEditedAnalysis({ 
                                              ...displayAnalysis, 
                                              wcInsights: { ...displayAnalysis.wcInsights, inventoryInsight: e.target.value } 
                                            })}
                                            className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            rows={2}
                                          />
                                        ) : (
                                          displayAnalysis.wcInsights.inventoryInsight
                                        )}
                                      </div>
                                    )}
                                    {displayAnalysis.wcInsights.apInsight && (
                                      <div className="text-sm text-gray-700 leading-relaxed">
                                        <span className="font-semibold text-gray-900">매입채무:</span>{' '}
                                        {editMode ? (
                                          <textarea
                                            value={displayAnalysis.wcInsights.apInsight}
                                            onChange={(e) => setEditedAnalysis({ 
                                              ...displayAnalysis, 
                                              wcInsights: { ...displayAnalysis.wcInsights, apInsight: e.target.value } 
                                            })}
                                            className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            rows={2}
                                          />
                                        ) : (
                                          displayAnalysis.wcInsights.apInsight
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </section>
                            )}
                          </div>

                          {/* 2열 그리드: 리스크 요인 + 관리 포인트 */}
                          <div className="grid grid-cols-2 gap-4">
                            {/* 리스크 요인 */}
                            {displayAnalysis.riskFactors.length > 0 && (
                              <section className="bg-white rounded-lg border border-yellow-100 shadow-sm p-4">
                                <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                                  <span className="w-1.5 h-5 bg-yellow-600 mr-2.5 rounded"></span>
                                  리스크 요인
                                </h4>
                                <ul className="space-y-3">
                                  {displayAnalysis.riskFactors.map((risk, idx) => (
                                    <li key={idx} className="text-base text-gray-700 leading-relaxed pl-4 border-l-3 border-yellow-200 flex items-start gap-2">
                                      {editMode ? (
                                        <>
                                          <textarea
                                            value={risk}
                                            onChange={(e) => {
                                              const newRisks = [...displayAnalysis.riskFactors];
                                              newRisks[idx] = e.target.value;
                                              setEditedAnalysis({ ...displayAnalysis, riskFactors: newRisks });
                                            }}
                                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                            rows={2}
                                          />
                                          <button
                                            onClick={() => {
                                              const newRisks = displayAnalysis.riskFactors.filter((_, i) => i !== idx);
                                              setEditedAnalysis({ ...displayAnalysis, riskFactors: newRisks });
                                            }}
                                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                          >
                                            삭제
                                          </button>
                                        </>
                                      ) : (
                                        <span>{risk}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                                {editMode && (
                                  <button
                                    onClick={() => {
                                      const newRisks = [...displayAnalysis.riskFactors, '새 리스크 요인'];
                                      setEditedAnalysis({ ...displayAnalysis, riskFactors: newRisks });
                                    }}
                                    className="mt-3 px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                                  >
                                    + 추가
                                  </button>
                                )}
                              </section>
                            )}

                            {/* 관리 포인트 */}
                            {displayAnalysis.actionItems.length > 0 && (
                              <section className="bg-white rounded-lg border border-orange-100 shadow-sm p-4">
                                <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                                  <span className="w-1.5 h-5 bg-orange-600 mr-2.5 rounded"></span>
                                  관리 포인트
                                </h4>
                                <ul className="space-y-3">
                                  {displayAnalysis.actionItems.map((action, idx) => (
                                    <li key={idx} className="text-base text-gray-700 leading-relaxed pl-4 border-l-3 border-orange-200 flex items-start gap-2">
                                      {editMode ? (
                                        <>
                                          <textarea
                                            value={action}
                                            onChange={(e) => {
                                              const newActions = [...displayAnalysis.actionItems];
                                              newActions[idx] = e.target.value;
                                              setEditedAnalysis({ ...displayAnalysis, actionItems: newActions });
                                            }}
                                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            rows={2}
                                          />
                                          <button
                                            onClick={() => {
                                              const newActions = displayAnalysis.actionItems.filter((_, i) => i !== idx);
                                              setEditedAnalysis({ ...displayAnalysis, actionItems: newActions });
                                            }}
                                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                          >
                                            삭제
                                          </button>
                                        </>
                                      ) : (
                                        <span>{action}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                                {editMode && (
                                  <button
                                    onClick={() => {
                                      const newActions = [...displayAnalysis.actionItems, '새 관리 포인트'];
                                      setEditedAnalysis({ ...displayAnalysis, actionItems: newActions });
                                    }}
                                    className="mt-3 px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600"
                                  >
                                    + 추가
                                  </button>
                                )}
                              </section>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          데이터를 불러오는 중이거나 표시할 분석 내용이 없습니다.
                        </p>
                      )}
                    </aside>
                  </div>
                ) : (
                  <>
                    {cfData && (
                      <>
                        <div className="flex items-center gap-2 mb-4">
                          <h2 className="text-lg font-bold text-gray-800">현금흐름표</h2>
                          <button
                            onClick={() => setWcAllRowsCollapsed(!wcAllRowsCollapsed)}
                            className="px-4 py-2 text-sm font-medium rounded bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                          >
                            {wcAllRowsCollapsed ? '펼치기 ▼' : '접기 ▲'}
                          </button>
                        </div>
                        <FinancialTable 
                          data={cfData} 
                          columns={[...monthColumns, `${wcYear}년(합계)`, 'YoY']} 
                          showTotal
                          isCashFlow={true}
                          monthsCollapsed={workingCapitalMonthsCollapsed}
                          onMonthsToggle={() => setWorkingCapitalMonthsCollapsed(!workingCapitalMonthsCollapsed)}
                          currentYear={wcYear}
                          allRowsCollapsed={wcAllRowsCollapsed}
                          onAllRowsToggle={() => setWcAllRowsCollapsed(!wcAllRowsCollapsed)}
                          defaultExpandedAccounts={['영업활동']}
                        />
                      </>
                    )}
                    
                    {/* 현금잔액과 차입금잔액표 */}
                    {balanceData && (
                      <div className="mt-8 pt-6 border-t-2 border-gray-400">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">
                          현금잔액과 차입금잔액표
                        </h2>
                        <div className="overflow-x-auto">
                          <table className="min-w-full border border-gray-300 bg-white">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                                  구분
                                </th>
                                <th className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                                  기초잔액
                                </th>
                                {!workingCapitalMonthsCollapsed && (
                                  <>
                                    {['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'].map((month) => (
                                      <th key={month} className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                                        {month}
                                      </th>
                                    ))}
                                  </>
                                )}
                                {workingCapitalMonthsCollapsed && (
                                  <th className="bg-white border-0" style={{ minWidth: '16px', maxWidth: '16px', padding: 0 }}></th>
                                )}
                                <th className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                                  기말잔액
                                </th>
                                <th className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 bg-yellow-50">
                                  YoY
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* 현금잔액 */}
                              <tr>
                                <td className="border border-gray-300 px-4 py-2 text-sm font-semibold bg-blue-50">
                                  현금잔액
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-sm text-right">
                                  {formatNumber(balanceData.현금잔액.기초잔액, false, false)}
                                </td>
                                {!workingCapitalMonthsCollapsed && (
                                  <>
                                    {balanceData.현금잔액.monthly.map((value, idx) => (
                                      <td key={idx} className="border border-gray-300 px-4 py-2 text-sm text-right">
                                        {formatNumber(value, false, false)}
                                      </td>
                                    ))}
                                  </>
                                )}
                                {workingCapitalMonthsCollapsed && (
                                  <td className="bg-white border-0" style={{ minWidth: '16px', maxWidth: '16px', padding: 0 }}></td>
                                )}
                                <td className="border border-gray-300 px-4 py-2 text-sm text-right font-semibold">
                                  {formatNumber(balanceData.현금잔액.기말잔액, false, false)}
                                </td>
                                <td className={`border border-gray-300 px-4 py-2 text-sm text-right font-semibold ${
                                  (balanceData.현금잔액.기말잔액 - balanceData.현금잔액.기초잔액) >= 0 
                                    ? 'text-blue-600' 
                                    : 'text-red-600'
                                }`}>
                                  {formatNumber(balanceData.현금잔액.기말잔액 - balanceData.현금잔액.기초잔액, true, false)}
                                </td>
                              </tr>
                              
                              {/* 차입금잔액 */}
                              <tr>
                                <td className="border border-gray-300 px-4 py-2 text-sm font-semibold bg-red-50">
                                  차입금잔액
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-sm text-right">
                                  {formatNumber(balanceData.차입금잔액.기초잔액, false, false)}
                                </td>
                                {!workingCapitalMonthsCollapsed && (
                                  <>
                                    {balanceData.차입금잔액.monthly.map((value, idx) => (
                                      <td key={idx} className="border border-gray-300 px-4 py-2 text-sm text-right">
                                        {formatNumber(value, false, false)}
                                      </td>
                                    ))}
                                  </>
                                )}
                                {workingCapitalMonthsCollapsed && (
                                  <td className="bg-white border-0" style={{ minWidth: '16px', maxWidth: '16px', padding: 0 }}></td>
                                )}
                                <td className="border border-gray-300 px-4 py-2 text-sm text-right font-semibold">
                                  {formatNumber(balanceData.차입금잔액.기말잔액, false, false)}
                                </td>
                                <td className={`border border-gray-300 px-4 py-2 text-sm text-right font-semibold ${
                                  (balanceData.차입금잔액.기말잔액 - balanceData.차입금잔액.기초잔액) >= 0 
                                    ? 'text-red-600' 
                                    : 'text-blue-600'
                                }`}>
                                  {formatNumber(balanceData.차입금잔액.기말잔액 - balanceData.차입금잔액.기초잔액, true, false)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {wcStatementData && (
                      <div className="mt-8 pt-6 border-t-2 border-gray-400">
                        <div className="flex items-center gap-2 mb-4">
                          <h2 className="text-lg font-bold text-gray-800">운전자본표</h2>
                          <button
                            onClick={() => setWcStatementAllRowsCollapsed(!wcStatementAllRowsCollapsed)}
                            className="px-4 py-2 text-sm font-medium rounded bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                          >
                            {wcStatementAllRowsCollapsed ? '펼치기 ▼' : '접기 ▲'}
                          </button>
                        </div>
                        <FinancialTable 
                          data={wcStatementData} 
                          columns={[...monthColumns, `${wcYear}년(기말)`, 'YoY']} 
                          showTotal
                          isCashFlow={true}
                          monthsCollapsed={workingCapitalMonthsCollapsed}
                          onMonthsToggle={() => setWorkingCapitalMonthsCollapsed(!workingCapitalMonthsCollapsed)}
                          currentYear={wcYear}
                          allRowsCollapsed={wcStatementAllRowsCollapsed}
                          onAllRowsToggle={() => setWcStatementAllRowsCollapsed(!wcStatementAllRowsCollapsed)}
                        />
                      </div>
                    )}
                    {creditRecoveryData && (
                      <div className="mt-8 pt-6 border-t-2 border-gray-400">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">
                          대리상 여신회수 계획 ({creditRecoveryData.baseYearMonth} 기준)
                        </h2>
                        <div className="overflow-x-auto">
                          <table className="min-w-full border border-gray-300">
                            <thead>
                              <tr>
                                <th className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 bg-highlight-yellow">
                                  대리상선수금
                                </th>
                                <th className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 bg-highlight-yellow">
                                  대리상 채권
                                </th>
                                {creditRecoveryData.headers.map((header, idx) => (
                                  <th key={idx} className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100">
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border border-gray-300 px-4 py-2 text-sm text-right">
                                  {formatNumber(creditRecoveryData.대리상선수금, false, false)}
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-sm text-right">
                                  {formatNumber(creditRecoveryData.대리상채권, false, false)}
                                </td>
                                {creditRecoveryData.recoveries.map((amount, idx) => (
                                  <td key={idx} className="border border-gray-300 px-4 py-2 text-sm text-right">
                                    {formatNumber(amount, true, false)}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* 여신사용현황 */}
        {activeTab === 1 && (
          <div>
            <div className="bg-gray-100 border-b border-gray-300 px-6 py-3">
              <span className="text-sm font-medium text-gray-700">
                {creditData 
                  ? `${creditData.baseYearFull}년 ${creditData.baseMonth}월말 기준`
                  : '로딩 중...'
                }
              </span>
            </div>
            {loading && <div className="p-6 text-center">로딩 중...</div>}
            {error && <div className="p-6 text-center text-red-500">{error}</div>}
            {creditData && !loading && (
              <div className="p-6">
                <CreditStatus data={creditData} recoveryData={creditRecoveryData || undefined} />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

