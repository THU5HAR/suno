import React, { useState, useRef } from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { Song, Feedback } from '@/types';

interface TimelineSong {
  id: string;
  title: string;
  artist?: string;
  startTime: number;
  endTime: number;
}

interface TimelineProps {
  currentTime?: number;
  playingSongId?: string | null;
}

export const Timeline: React.FC<TimelineProps> = ({ currentTime = 0, playingSongId = null }) => {
  const { playlist, feedback, reorderSongs } = usePlaylist();
  const [draggedSong, setDraggedSong] = useState<Song | null>(null);
  const [hoveredFeedback, setHoveredFeedback] = useState<Feedback | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const parseDuration = (durationStr: string): number => {
    const parts = durationStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 180; // default 3 minutes
  };

  // Calculate timeline positions based on actual song durations
  let accumulatedTime = 0;
  const timelineSongs: TimelineSong[] = playlist.map((song) => {
    const startTime = accumulatedTime;
    const songDuration = song.duration ? parseDuration(song.duration) : 180;
    accumulatedTime += songDuration;
    return {
      ...song,
      startTime,
      endTime: accumulatedTime,
    };
  });

  const totalDuration = accumulatedTime || timelineSongs.length * 180;
  const pixelsPerSecond = 200 / 60; // 200px per minute

  const handleDragStart = (e: React.DragEvent, song: TimelineSong) => {
    setDraggedSong(playlist.find(s => s.id === song.id) || null);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedSong) return;

    const draggedIndex = playlist.findIndex(song => song.id === draggedSong.id);
    if (draggedIndex !== -1 && draggedIndex !== targetIndex) {
      reorderSongs(draggedIndex, targetIndex);
    }
    setDraggedSong(null);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate absolute timestamp for feedback (accounting for song positions)
  const getAbsoluteTimestamp = (songIndex: number, relativeTimestamp: number): number => {
    if (songIndex < 0 || songIndex >= timelineSongs.length) {
      return relativeTimestamp;
    }
    
    // Use the timelineSongs array which already has calculated start times
    const songStartTime = timelineSongs[songIndex]?.startTime || 0;
    return songStartTime + relativeTimestamp;
  };

  const handleFeedbackHover = (fb: Feedback, e: React.MouseEvent) => {
    setHoveredFeedback(fb);
    const timelineContainer = timelineRef.current;
    if (!timelineContainer) return;
    
    const containerRect = timelineContainer.getBoundingClientRect();
    const markerRect = e.currentTarget.getBoundingClientRect();
    
    // Calculate position relative to the timeline container
    const markerCenterX = markerRect.left - containerRect.left + (markerRect.width / 2);
    const markerTopY = markerRect.top - containerRect.top;
    
    setTooltipPosition({
      x: markerCenterX,
      y: markerTopY,
    });
  };

  const handleFeedbackLeave = () => {
    setHoveredFeedback(null);
    setTooltipPosition(null);
  };

  return (
    <div className="timeline">
      <h2 className="text-xl font-semibold mb-4">Timeline</h2>
      <div className="bg-gray-100 p-4 rounded-lg">
        <div
          ref={timelineRef}
          className="relative bg-white border rounded min-h-[200px] overflow-x-auto"
          style={{ width: '100%', minWidth: `${totalDuration * pixelsPerSecond}px` }}
        >
          {/* Time markers */}
          <div className="absolute top-0 left-0 right-0 h-8 border-b bg-gray-50">
            {Array.from({ length: Math.ceil(totalDuration / 60) + 1 }, (_, i) => (
              <div
                key={i}
                className="absolute top-0 text-xs text-gray-500"
                style={{ left: `${i * 60 * pixelsPerSecond}px` }}
              >
                {formatTime(i * 60)}
              </div>
            ))}
          </div>

          {/* Feedback Markers - Vertical lines with dots */}
          {feedback.length > 0 && feedback.map((fb) => {
            // Safety check for valid song index
            if (fb.songIndex < 0 || fb.songIndex >= playlist.length) {
              return null;
            }
            
            const absoluteTimestamp = getAbsoluteTimestamp(fb.songIndex, fb.timestamp);
            const song = playlist[fb.songIndex];
            const markerLeft = absoluteTimestamp * pixelsPerSecond;
            
            return (
              <div
                key={fb.id}
                className="absolute top-8 w-1 bg-yellow-500 hover:bg-yellow-600 z-30 cursor-pointer transition-all hover:w-1.5 group"
                style={{
                  left: `${markerLeft}px`,
                  height: 'calc(100% - 32px)',
                  minHeight: '64px',
                }}
                onMouseEnter={(e) => handleFeedbackHover(fb, e)}
                onMouseLeave={handleFeedbackLeave}
                title={`${song?.title || 'Song'} - ${fb.title} - ${formatTime(fb.timestamp)}`}
              >
                <div className="absolute -top-2 -left-2 w-5 h-5 bg-yellow-500 rounded-full border-2 border-white shadow-md hover:scale-125 transition-transform z-30"></div>
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
              </div>
            );
          })}

          {/* Playback Progress Indicator */}
          {playingSongId && currentTime > 0 && (
            <div
              className="absolute top-8 w-1 bg-red-500 z-10"
              style={{
                left: `${currentTime * pixelsPerSecond}px`,
                height: '100%',
                minHeight: '64px',
              }}
            >
              <div className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 rounded-full border-2 border-white"></div>
            </div>
          )}

          {/* Feedback Tooltip */}
          {hoveredFeedback && tooltipPosition && (
            <div
              className="absolute z-50 bg-gray-900 text-white rounded-lg p-3 shadow-xl max-w-xs pointer-events-none"
              style={{
                left: `${Math.max(10, Math.min(tooltipPosition.x, (totalDuration * pixelsPerSecond) - 160))}px`,
                top: `${tooltipPosition.y - 10}px`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="text-xs font-semibold mb-1 text-yellow-400 flex items-center gap-1">
                <span>📝</span>
                <span>{hoveredFeedback.title}</span>
              </div>
              <div className="text-xs text-gray-300 mb-2">
                {playlist[hoveredFeedback.songIndex]?.title || 'Unknown Song'} - [{formatTime(hoveredFeedback.timestamp)}]
              </div>
              <div className="text-xs text-white leading-relaxed whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                {hoveredFeedback.text}
              </div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          )}

          {/* Songs */}
          <div className="pt-8">
            {timelineSongs.map((song, index) => {
              const isPlaying = playingSongId === song.id;
              return (
                <div
                  key={song.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, song)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`absolute top-8 h-16 text-white rounded cursor-move flex items-center px-3 transition-colors ${
                    isPlaying ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                  style={{
                    left: `${song.startTime * pixelsPerSecond}px`,
                    width: `${(song.endTime - song.startTime) * pixelsPerSecond}px`,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{song.title}</div>
                    {song.artist && <div className="text-sm opacity-80 truncate">{song.artist}</div>}
                  </div>
                  <div className="text-xs opacity-80 ml-2">
                    {formatTime(song.startTime)} - {formatTime(song.endTime)}
                  </div>
                </div>
              );
            })}
          </div>

          {playlist.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-500">
              No songs in timeline. Add songs to get started!
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>Drag and drop songs to reorder them in the timeline.</p>
        <p>Total duration: {formatTime(totalDuration)}</p>
        {feedback.length > 0 && (
          <p className="mt-2 text-xs text-yellow-600">
            💡 {feedback.length} feedback marker{feedback.length !== 1 ? 's' : ''} - Hover over yellow lines to view notes
          </p>
        )}
      </div>
    </div>
  );
};