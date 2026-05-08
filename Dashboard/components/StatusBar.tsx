'use client';

interface StatusBarProps {
  totalROIs: number;
  highPriority: number;
  scheduledPasses: number;
}

export default function StatusBar({ totalROIs, highPriority, scheduledPasses }: StatusBarProps) {
  return (
    <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">SIA Dashboard</h1>
          <p className="text-sm text-gray-400">위성 촬영 스케줄링 자동화</p>
        </div>

        <div className="flex gap-6">
          {/* 총 ROI */}
          <div className="bg-gray-700 rounded-lg px-4 py-2">
            <div className="text-xs text-gray-400">총 ROI</div>
            <div className="text-2xl font-bold text-white">{totalROIs}</div>
          </div>

          {/* 긴급 지역 */}
          <div className="bg-gray-700 rounded-lg px-4 py-2">
            <div className="text-xs text-gray-400">긴급 지역</div>
            <div className="text-2xl font-bold text-red-400">{highPriority}</div>
          </div>

          {/* 예정 촬영 */}
          <div className="bg-gray-700 rounded-lg px-4 py-2">
            <div className="text-xs text-gray-400">예정 촬영</div>
            <div className="text-2xl font-bold text-green-400">{scheduledPasses}</div>
          </div>
        </div>
      </div>
    </div>
  );
}