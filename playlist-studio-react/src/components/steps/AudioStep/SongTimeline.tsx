import React, { useRef, useState, useEffect } from 'react';

interface SongTimelineProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek?: (time: number) => void;
}

const parseDuration = (durationStr: string): number => {
  const parts = durationStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return 0; // Return 0 if duration not available
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const SongTimeline: React.FC<SongTimelineProps> = ({ currentTime, duration, isPlaying, onSeek }) => {
  const durationSeconds = typeof duration === 'string' ? parseDuration(duration) : duration;
  const progress = durationSeconds > 0 ? Math.min((currentTime / durationSeconds) * 100, 100) : 0;
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateSeekTime = (clientX: number): number => {
    if (!timelineRef.current || !onSeek || durationSeconds <= 0) return currentTime;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const seekTime = percentage * durationSeconds;
    
    return seekTime;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || durationSeconds <= 0) return;
    
    e.preventDefault();
    setIsDragging(true);
    const seekTime = calculateSeekTime(e.clientX);
    onSeek(seekTime);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only handle click if not dragging (to avoid double seek)
    if (isDragging || !onSeek || durationSeconds <= 0) return;
    
    const seekTime = calculateSeekTime(e.clientX);
    onSeek(seekTime);
  };

  // Global mouse event handlers for smooth dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!onSeek || durationSeconds <= 0 || !timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const seekTime = percentage * durationSeconds;
      
      onSeek(seekTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onSeek, durationSeconds]);

  return (
    <div className="w-full mb-2">
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span>{formatTime(currentTime)}</span>
        <span>{durationSeconds > 0 ? formatTime(durationSeconds) : '--:--'}</span>
      </div>
      <div
        ref={timelineRef}
        className="w-full h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer relative group"
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        title="Click or drag to seek"
      >
        <div
          className={`h-full transition-all ${
            isDragging ? 'duration-75' : 'duration-300'
          } ${
            isPlaying ? 'bg-blue-500' : 'bg-gray-400'
          }`}
          style={{ width: `${progress}%` }}
        />
        {/* Draggable handle */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-opacity ${
            isPlaying || isDragging ? 'opacity-100 bg-blue-500' : 'opacity-0 group-hover:opacity-100 bg-gray-400'
          }`}
          style={{ left: `${progress}%` }}
        />
      </div>
    </div>
  );
};

