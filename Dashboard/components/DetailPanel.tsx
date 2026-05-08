'use client';

import { ROI } from '@/lib/dataConverter';

interface DetailPanelProps {
  roi: ROI | null;
}

export default function DetailPanel({ roi }: DetailPanelProps) {
  if (!roi) {
    return (
      <div className="w-96 bg-gray-800 border-l border-gray-700 p-6 flex items-center justify-center">
        <p className="text-gray-400">ROI를 선택하세요</p>
      </div>
    );
  }

  return (
    <div className="w-96 bg-gray-800 border-l border-gray-700 overflow-y-auto">
      <div className="p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">{roi.name}</h2>
          <p className="text-gray-400">{roi.location}</p>
        </div>

        {/* 위험도 정보 */}
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">위험도 평가</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">상태</span>
              <span className="text-red-400 font-semibold">{roi.riskLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">충돌 지수</span>
              <span className="text-white">{roi.conflictIndex.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">이벤트 수</span>
              <span className="text-white">{roi.events}건</span>
            </div>
          </div>
        </div>

        {/* 권장 조치 */}
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">권장 조치</h3>
          <p className="text-white text-sm">{roi.guide}</p>
        </div>

        {/* LLM 분석 */}
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">AI 분석</h3>
          <p className="text-white text-sm">{roi.llmReason}</p>
        </div>

        {/* 위성 스케줄 */}
        {roi.schedules && roi.schedules.length > 0 && (
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              위성 스케줄 ({roi.schedules.length}개)
            </h3>
            <div className="space-y-3">
              {roi.schedules.map((schedule, idx) => (
                <div key={idx} className="bg-gray-800 rounded p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-white font-medium">{schedule.satellite}</span>
                    <span className="text-green-400 text-sm">
                      {(schedule.qualityScore * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>🕐 {new Date(schedule.passTime).toLocaleString('ko-KR')}</div>
                    <div>📡 {schedule.actionLabel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}