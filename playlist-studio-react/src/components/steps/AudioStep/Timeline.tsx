import React, { useState, useRef } from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { Feedback } from '@/types';

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
  const [draggedSongIndex, setDraggedSongIndex] = useState<number>(-1);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number>(-1);
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

  // Calculate which index to drop at based on mouse X position
  const calculateDropIndex = (clientX: number): number => {
    if (!timelineRef.current || timelineSongs.length === 0) return -1;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    
    // If before the first song, drop at index 0
    if (x < timelineSongs[0].startTime * pixelsPerSecond) {
      return 0;
    }
    
    // If after the last song, drop at the end
    const lastSong = timelineSongs[timelineSongs.length - 1];
    if (x >= lastSong.endTime * pixelsPerSecond) {
      return timelineSongs.length;
    }
    
    // Find which song we're over or between
    for (let i = 0; i < timelineSongs.length; i++) {
      const song = timelineSongs[i];
      const songLeft = song.startTime * pixelsPerSecond;
      const songRight = song.endTime * pixelsPerSecond;
      const songCenter = (songLeft + songRight) / 2;
      
      // If we're within this song's bounds
      if (x >= songLeft && x < songRight) {
        // If before the center, drop before this song (at index i)
        // If after the center, drop after this song (at index i + 1)
        return x < songCenter ? i : i + 1;
      }
      
      // If between this song and the next
      if (i < timelineSongs.length - 1) {
        const nextSong = timelineSongs[i + 1];
        const nextSongLeft = nextSong.startTime * pixelsPerSecond;
        
        if (x >= songRight && x < nextSongLeft) {
          // Between songs - drop after current (at index i + 1)
          return i + 1;
        }
      }
    }
    
    return timelineSongs.length;
  };

  const handleDragStart = (e: React.DragEvent, song: TimelineSong, index: number) => {
    setDraggedSongIndex(index);
    setDropIndicatorIndex(-1);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', song.id);
    // Set a drag image to make it clearer
    if (e.dataTransfer.setDragImage && e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
    }
    // Make the dragged element semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedSongIndex(-1);
    setDropIndicatorIndex(-1);
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedSongIndex === -1) return;
    
    const dropIndex = calculateDropIndex(e.clientX);
    if (dropIndex !== -1) {
      setDropIndicatorIndex(dropIndex);
    }
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedSongIndex === -1) {
      setDraggedSongIndex(-1);
      setDropIndicatorIndex(-1);
      return;
    }

    // If drop indicator wasn't set, calculate it now
    let targetIndex = dropIndicatorIndex;
    if (targetIndex === -1) {
      targetIndex = calculateDropIndex(e.clientX);
    }
    
    if (targetIndex === -1 || targetIndex < 0) {
      setDraggedSongIndex(-1);
      setDropIndicatorIndex(-1);
      return;
    }
    
    // Adjust target index when dragging forward
    // When you remove an item from index i, items after it shift down by 1
    // So if dragging from index 2 to index 5, we actually want index 4 after removal
    if (draggedSongIndex < targetIndex) {
      targetIndex = targetIndex - 1;
    }
    
    // Clamp target index to valid range
    targetIndex = Math.max(0, Math.min(targetIndex, playlist.length - 1));

    if (draggedSongIndex !== targetIndex && draggedSongIndex >= 0 && targetIndex >= 0) {
      reorderSongs(draggedSongIndex, targetIndex);
    }
    
    setDraggedSongIndex(-1);
    setDropIndicatorIndex(-1);
  };

  const handleContainerDragLeave = (e: React.DragEvent) => {
    // Only clear indicator if we're actually leaving the container
    // Check if we're moving to a child element (which is fine) vs leaving entirely
    const relatedTarget = e.relatedTarget as Node;
    if (relatedTarget && timelineRef.current && !timelineRef.current.contains(relatedTarget)) {
      // Only clear if we're truly leaving the container
      setDropIndicatorIndex(-1);
    }
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
          onDragOver={handleContainerDragOver}
          onDrop={handleContainerDrop}
          onDragLeave={handleContainerDragLeave}
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

          {/* Drop Indicator */}
          {dropIndicatorIndex >= 0 && dropIndicatorIndex <= timelineSongs.length && draggedSongIndex !== dropIndicatorIndex && (
            <div
              className="absolute top-8 w-1 bg-blue-600 z-40 pointer-events-none animate-pulse"
              style={{
                left: (() => {
                  if (dropIndicatorIndex === 0) {
                    return '0px';
                  } else if (dropIndicatorIndex < timelineSongs.length) {
                    // Show between previous song and current song
                    const prevSong = timelineSongs[dropIndicatorIndex - 1];
                    return `${prevSong.endTime * pixelsPerSecond}px`;
                  } else {
                    // Show after last song
                    return `${totalDuration * pixelsPerSecond}px`;
                  }
                })(),
                height: '64px',
              }}
            >
              <div className="absolute -top-2 -left-2 w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
            </div>
          )}

          {/* Songs */}
          <div className="pt-8">
            {timelineSongs.map((song, index) => {
              const isPlaying = playingSongId === song.id;
              const isDragging = draggedSongIndex === index;
              return (
                <div
                  key={song.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, song, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => {
                    // Allow drop on this element, but let event bubble to container
                    if (draggedSongIndex >= 0 && draggedSongIndex !== index) {
                      e.preventDefault();
                      // Don't stop propagation - let container handle the positioning
                    }
                  }}
                  onDrop={(e) => {
                    // Prevent drop on individual songs - let container handle it
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className={`absolute top-8 h-16 text-white rounded cursor-move flex items-center px-3 transition-all ${
                    isDragging ? 'opacity-50 scale-95' : 'opacity-100'
                  } ${
                    isPlaying ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                  style={{
                    left: `${song.startTime * pixelsPerSecond}px`,
                    width: `${(song.endTime - song.startTime) * pixelsPerSecond}px`,
                    zIndex: isDragging ? 50 : 20,
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