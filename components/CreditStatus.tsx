'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { CreditData, CreditRecoveryData } from '@/lib/types';
import { formatNumber, getRecoveryMonthLabelsAsN월 } from '@/lib/utils';

const RECOVERY_PLAN_FALLBACK = '여신회수 계획: (데이터 없음)';

function formatRecoveryValueM(value: number): string {
  const m = Math.round(value / -1_000_000);
  return `${m}M`;
}

function formatCreditRecoveryToLine(d: CreditRecoveryData): string {
  const labels = getRecoveryMonthLabelsAsN월(d.baseYearMonth, d.recoveries.length);
  const recoveryParts = d.recoveries.map((v, i) => `${labels[i]} ${formatRecoveryValueM(v)}`);
  return `여신회수 계획 (${d.baseYearMonth} 기준): ${recoveryParts.join(', ')}`;
}

interface CreditStatusProps {
  data: CreditData;
  creditRecoveryData?: CreditRecoveryData | null;
}

export default function CreditStatus({ data, creditRecoveryData = null }: CreditStatusProps) {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [othersCollapsed, setOthersCollapsed] = useState<boolean>(true);
  const [csvRecoveryData, setCsvRecoveryData] = useState<CreditRecoveryData | null>(null);
  const selfFetchedRef = useRef(false);

  // CSV에서 회수계획 로드 (prop 없을 때만 직접 fetch)
  useEffect(() => {
    if (creditRecoveryData) return;
    if (selfFetchedRef.current) return;
    selfFetchedRef.current = true;
    fetch('/api/annual-plan/credit-recovery?baseYearMonth=26.02')
      .then((r) => (r.ok ? r.json() : null))
      .then((res: { data?: CreditRecoveryData } | null) => {
        if (res?.data) setCsvRecoveryData(res.data);
      })
      .catch(() => {});
  }, [creditRecoveryData]);

  const recoveryText = useMemo(() => {
    const d = creditRecoveryData ?? csvRecoveryData;
    if (!d) return RECOVERY_PLAN_FALLBACK;
    return formatCreditRecoveryToLine(d);
  }, [creditRecoveryData, csvRecoveryData]);

  return (
    <div className="space-y-6">
      {/* 상단 카드 2개 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 총여신현황 카드 */}
        <div className="bg-sky-100 border border-sky-300 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📊</span>
            <h3 className="text-lg font-semibold text-sky-900">총 여신 현황</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">외상매출금:</span>
              <span className="text-lg font-semibold text-gray-900">
                {formatNumber(data.total.외상매출금)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">선수금:</span>
              <span className="text-lg font-semibold text-gray-900">
                {formatNumber(data.total.선수금)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-sky-300">
              <span className="text-gray-700 font-semibold">순여신:</span>
              <span className="text-xl font-bold text-red-600">
                {formatNumber(data.total.순여신)}
              </span>
            </div>
          </div>
        </div>

        {/* 리스크 분석 카드 */}
        <div className="bg-orange-100 border border-orange-300 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">⚠️</span>
            <h3 className="text-lg font-semibold text-orange-900">리스크 분석(순여신 잔액 기준)</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">상위 17개 비율:</span>
              <span className="text-lg font-semibold text-gray-900">
                {data.analysis.top17Ratio.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">최대 거래처 비율:</span>
              <span className="text-lg font-semibold text-gray-900">
                {data.analysis.top1Ratio.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-orange-300">
              <span className="text-gray-700 font-semibold">집중 리스크:</span>
              <span className={`text-xl font-bold ${data.analysis.riskLevel === '높음' ? 'text-red-600' : 'text-green-600'}`}>
                {data.analysis.riskLevel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="relative">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-30 bg-navy text-white">
            <tr>
              <th className="border border-gray-300 py-3 px-4 text-center sticky top-0 left-0 z-40 bg-navy min-w-[60px]">
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className="text-white hover:text-yellow-300 transition-colors"
                >
                  {collapsed ? '▶' : '▼'} 정렬
                </button>
              </th>
              <th className="border border-gray-300 py-3 px-4 text-left min-w-[300px]">
                대리상 명칭
              </th>
              <th className="border border-gray-300 py-3 px-4 text-right min-w-[120px]">
                외상매출금
              </th>
              <th className="border border-gray-300 py-3 px-4 text-right min-w-[120px]">
                선수금
              </th>
              <th className="border border-gray-300 py-3 px-4 text-right min-w-[120px]">
                순여신
              </th>
            </tr>
          </thead>
          <tbody>
            {/* 1. 합계 행 (맨 위, 연한 하늘색) */}
            <tr className="bg-sky-100 font-bold">
              <td className="border border-gray-300 py-3 px-4 text-center sticky left-0 z-20 bg-sky-100">
                ▼ 합계
              </td>
              <td className="border border-gray-300 py-3 px-4"></td>
              <td className="border border-gray-300 py-3 px-4 text-right">
                {formatNumber(data.total.외상매출금)}
              </td>
              <td className="border border-gray-300 py-3 px-4 text-right">
                {formatNumber(data.total.선수금)}
              </td>
              <td className="border border-gray-300 py-3 px-4 text-right text-red-600">
                {formatNumber(data.total.순여신)}
              </td>
            </tr>

            {/* 2. 여신회수계획 행 */}
            <tr className="bg-yellow-50">
              <td colSpan={5} className="border border-gray-300 py-3 px-4 text-sm">
                <span className="px-2 py-1 inline-block">{recoveryText}</span>
              </td>
            </tr>

            {/* 3. 상위 17개 대리상 (접기/펼치기 가능) */}
            {!collapsed && data.top17.map((dealer, index) => {
              return (
                <tr 
                  key={index} 
                  className="hover:bg-gray-50"
                >
                  <td className="border border-gray-300 py-2 px-4 text-center sticky left-0 z-20 bg-white">
                    {index + 1}
                  </td>
                  <td className="border border-gray-300 py-2 px-4">
                    {dealer.name}
                  </td>
                  <td className="border border-gray-300 py-2 px-4 text-right">
                    {formatNumber(dealer.외상매출금)}
                  </td>
                  <td className="border border-gray-300 py-2 px-4 text-right">
                    {formatNumber(dealer.선수금)}
                  </td>
                  <td className="border border-gray-300 py-2 px-4 text-right font-semibold">
                    {formatNumber(dealer.순여신)}
                  </td>
                </tr>
              );
            })}

            {/* 4. 기타 행 (토글 가능) */}
            {!collapsed && (
              <>
                {/* 기타 합계 행 */}
                <tr className="bg-gray-100">
                  <td className="border border-gray-300 py-2 px-4 text-center sticky left-0 z-20 bg-gray-100">
                    <button
                      onClick={() => setOthersCollapsed(!othersCollapsed)}
                      className="text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      {othersCollapsed ? '▶' : '▼'}
                    </button>
                  </td>
                  <td className="border border-gray-300 py-2 px-4 font-semibold">
                    기타 {data.others.count}개
                  </td>
                  <td className="border border-gray-300 py-2 px-4 text-right">
                    {formatNumber(data.others.외상매출금)}
                  </td>
                  <td className="border border-gray-300 py-2 px-4 text-right">
                    {formatNumber(data.others.선수금)}
                  </td>
                  <td className="border border-gray-300 py-2 px-4 text-right font-semibold">
                    {formatNumber(data.others.순여신)}
                  </td>
                </tr>

                {/* 기타 개별 대리상 (펼쳤을 때만) */}
                {!othersCollapsed && data.othersList && data.othersList.map((dealer, index) => (
                  <tr key={`other-${index}`} className="bg-gray-50 hover:bg-gray-100">
                    <td className="border border-gray-300 py-2 px-4 text-center sticky left-0 z-20 bg-gray-50 text-sm text-gray-600">
                      {17 + index + 1}
                    </td>
                    <td className="border border-gray-300 py-2 px-4 pl-8 text-sm text-gray-700">
                      {dealer.name}
                    </td>
                    <td className="border border-gray-300 py-2 px-4 text-right text-sm">
                      {formatNumber(dealer.외상매출금)}
                    </td>
                    <td className="border border-gray-300 py-2 px-4 text-right text-sm">
                      {formatNumber(dealer.선수금)}
                    </td>
                    <td className="border border-gray-300 py-2 px-4 text-right text-sm">
                      {formatNumber(dealer.순여신)}
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* 분석 내용 */}
      <div className="space-y-4 mt-6">
        {/* 여신 현황 요약 */}
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
          <div className="flex items-start gap-2">
            <span className="text-xl">📊</span>
            <div>
              <h4 className="font-semibold text-orange-900 mb-2">여신 현황 요약</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>
                  <strong>총 외상매출금:</strong> {formatNumber(data.total.외상매출금)} 
                  (전체 {data.dealers.length}개 대리상)
                </li>
                <li>
                  <strong>총 선수금:</strong> {formatNumber(data.total.선수금)}
                </li>
                <li>
                  <strong>순여신:</strong> {formatNumber(data.total.순여신)} 
                  <span className="text-red-600 font-semibold"> (= 외상매출금 - 선수금)</span>
                </li>
                <li>
                  <strong>상위 17개 대리상 집중도:</strong> {data.analysis.top17Ratio.toFixed(1)}%
                  {data.top17[0] && (
                    <span> - {data.top17[0].name} 최대 거래처 ({data.analysis.top1Ratio.toFixed(1)}%)</span>
                  )}
                </li>
                {data.others.count > 0 && (
                  <li>
                    <strong>기타 대리상:</strong> {data.others.count}개, 외상매출금 {formatNumber(data.others.외상매출금)}, 순여신 {formatNumber(data.others.순여신)}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* 여신 관리 포인트 */}
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
          <div className="flex items-start gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <h4 className="font-semibold text-orange-900 mb-2">여신 관리 포인트</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>
                  <strong>상위 17개 대리상의 집중도</strong>가 {data.analysis.top17Ratio.toFixed(1)}%로 {data.analysis.top17Ratio > 70 ? '지속 위험 수준' : '적정 수준'}
                  {data.top17[0] && data.analysis.top1Ratio > 20 && (
                    <span> - <strong>{data.top17[0].name}</strong> 최대 거래처 ({data.analysis.top1Ratio.toFixed(1)}%)의 회수 차질 시 영향 큼</span>
                  )}
                </li>
                <li>
                  <strong>총 외상매출금:</strong> {formatNumber(data.total.외상매출금)} (전체 {data.dealers.length}개 대리상)
                </li>
                <li>
                  <strong>순여신:</strong> {formatNumber(data.total.순여신)} 
                  {data.total.순여신 > 0 && (
                    <span className="text-red-600"> - 회수 진행 필요</span>
                  )}
                  {data.total.순여신 <= 0 && (
                    <span className="text-green-600"> - 양호한 상태</span>
                  )}
                </li>
                <li>
                  <strong>지속적인 신용평가</strong> 및 여신 회수 독촉 필요
                  {data.analysis.riskLevel === '높음' && (
                    <span className="text-red-600 font-semibold"> - 리스크 관리 강화 필요</span>
                  )}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
