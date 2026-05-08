'use client';

import { ROI } from '@/lib/dataConverter';

interface ROIListProps {
  rois: ROI[];
  selectedROI: ROI | null;
  onSelectROI: (roi: ROI) => void;
}

export default function ROIList({ rois, selectedROI, onSelectROI }: ROIListProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴 긴급';
      case 'medium': return '🟠 주의';
      case 'low': return '🟡 관찰';
      default: return '⚪ 일반';
    }
  };

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">ROI 목록</h2>
        <p className="text-sm text-gray-400 mt-1">총 {rois.length}개 지역</p>
      </div>

      <div className="p-2">
        {rois.map((roi) => (
          <div
            key={roi.id}
            onClick={() => onSelectROI(roi)}
            className={`p-3 mb-2 rounded cursor-pointer transition-all ${
              selectedROI?.id === roi.id
                ? 'bg-blue-600 shadow-lg'
                : 'bg-gray-700 hover:bg-gray-650'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">{roi.name}</h3>
              <span className={`px-2 py-1 rounded text-xs text-white ${getPriorityColor(roi.priority)}`}>
                {getPriorityLabel(roi.priority)}
              </span>
            </div>

            <div className="text-sm text-gray-300 space-y-1">
              <div>📍 {roi.location}</div>
              <div>⚡ 위험도: {roi.riskLabel}</div>
              <div>📊 이벤트: {roi.events}건</div>
              {roi.schedules && roi.schedules.length > 0 && (
                <div className="text-green-400">
                  🛰️ 스케줄: {roi.schedules.length}개
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}