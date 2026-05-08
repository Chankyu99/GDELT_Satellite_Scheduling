'use client';

import { ROI } from '@/lib/dataConverter';

interface ScheduleReportProps {
  scheduleData: any; // schedule JSON 전체
  rois: ROI[];
}

export default function ScheduleReport({ scheduleData, rois }: ScheduleReportProps) {
  if (!scheduleData) {
    return (
      <div className="p-6 text-gray-400">
        스케줄 데이터를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-900 text-white p-6">
      {/* 헤더 */}
      <div className="border-b border-gray-700 pb-4 mb-6">
        <h2 className="text-2xl font-bold mb-2">🛰️ SIA 위성 촬영 스케줄 리포트</h2>
        <div className="grid grid-cols-2 gap-4 text-sm mt-4">
          <div>
            <span className="text-gray-400">생성 시각:</span>{' '}
            <span className="text-blue-400">{new Date(scheduleData.generated_utc).toLocaleString('ko-KR')}</span>
          </div>
          <div>
            <span className="text-gray-400">실행 모드:</span>{' '}
            <span className="text-green-400">{scheduleData.mode}</span>
          </div>
          <div>
            <span className="text-gray-400">예측 시간:</span>{' '}
            <span className="text-yellow-400">{scheduleData.prediction_hours}시간</span>
          </div>
          <div>
            <span className="text-gray-400">추적 위성:</span>{' '}
            <span className="text-purple-400">{scheduleData.satellites_tracked}개</span>
          </div>
          <div>
            <span className="text-gray-400">모니터링 도시:</span>{' '}
            <span className="text-orange-400">{scheduleData.cities_monitored || rois.length}개</span>
          </div>
          <div>
            <span className="text-gray-400">위성 시나리오:</span>{' '}
            <span className="text-cyan-400">{scheduleData.satellite_scenario}</span>
          </div>
        </div>
      </div>

      {/* 통과 요약 */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3 text-cyan-400">📊 통과 요약</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white">{scheduleData.total_passes?.toLocaleString() || 0}</div>
            <div className="text-xs text-gray-400">전체 통과</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">{scheduleData.swath_passes?.toLocaleString() || 0}</div>
            <div className="text-xs text-gray-400">Swath 내</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{scheduleData.shootable_passes?.toLocaleString() || 0}</div>
            <div className="text-xs text-gray-400">촬영 가능</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">{scheduleData.cities_with_shootable_passes || rois.length}</div>
            <div className="text-xs text-gray-400">촬영 가능 도시</div>
          </div>
        </div>
      </div>

      {/* 도시별 추천 스케줄 */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3 text-green-400">🎯 도시별 추천 스케줄 (상위 20개)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-3 text-gray-400">순번</th>
                <th className="text-left py-2 px-3 text-gray-400">도시</th>
                <th className="text-left py-2 px-3 text-gray-400">위성</th>
                <th className="text-left py-2 px-3 text-gray-400">센서</th>
                <th className="text-left py-2 px-3 text-gray-400">촬영 시각 (KST)</th>
                <th className="text-left py-2 px-3 text-gray-400">우선순위</th>
                <th className="text-left py-2 px-3 text-gray-400">품질 점수</th>
                <th className="text-left py-2 px-3 text-gray-400">핵심 메시지</th>
              </tr>
            </thead>
            <tbody>
              {scheduleData.recommendations?.slice(0, 20).map((rec: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-800 hover:bg-gray-750">
                  <td className="py-2 px-3 text-gray-300">{idx + 1}</td>
                  <td className="py-2 px-3 font-semibold text-white">{rec.city}</td>
                  <td className="py-2 px-3 text-blue-400">{rec.satellite}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      rec.sensor_type === 'sar' ? 'bg-purple-900 text-purple-200' : 'bg-green-900 text-green-200'
                    }`}>
                      {rec.sensor_type?.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-yellow-400">
                    {new Date(rec.pass_time_utc).toLocaleString('ko-KR', { 
                      month: '2-digit', 
                      day: '2-digit', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      rec.action_priority_label?.includes('즉시') ? 'bg-red-900 text-red-200' :
                      rec.action_priority_label?.includes('우선') ? 'bg-orange-900 text-orange-200' :
                      'bg-yellow-900 text-yellow-200'
                    }`}>
                      {rec.action_priority_label}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-green-400">
                    {(rec.quality_score * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 text-gray-300 text-xs">{rec.recommendation_reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}