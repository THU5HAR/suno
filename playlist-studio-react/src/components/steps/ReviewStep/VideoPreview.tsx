import React, { useState, useRef, useEffect, useMemo } from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { Button } from '@/components/ui/Button';

export const VideoPreview: React.FC = () => {
  const { playlist, stitchedAudioUrl, stepData } = usePlaylist();
  
  // Get thumbnail settings from window (set by VideoEditor)
  const [thumbnailSettings, setThumbnailSettings] = useState<any>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).thumbnailSettings) {
      setThumbnailSettings((window as any).thumbnailSettings);
    }
  }, []);
  
  const thumbnailUrl = thumbnailSettings?.thumbnailUrl || null;
  const playlistPosition = thumbnailSettings?.playlistPosition || { x: 10, y: 50 };
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate song start times (accounting for delays)
  const calculateSongStartTimes = () => {
    const parseDuration = (durationStr: string): number => {
      const parts = durationStr.split(':');
      if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }
      return 180; // default 3 minutes
    };

    // Get delay from stitch settings (default 0)
    const delayBetweenSongs = stepData[2]?.stitchSettings?.delayBetweenSongs ?? 0;

    let accumulatedTime = 0;
    return playlist.map((song, index) => {
      const startTime = accumulatedTime;
      const songDuration = song.duration ? parseDuration(song.duration) : 180;
      accumulatedTime += songDuration;
      
      // Add delay after each song except the last one
      if (index < playlist.length - 1 && delayBetweenSongs > 0) {
        accumulatedTime += delayBetweenSongs;
      }
      
      return {
        songId: song.id,
        startTime,
        endTime: accumulatedTime,
        formattedTime: formatTime(startTime),
      };
    });
  };

  // Calculate song start times (memoized)
  const songStartTimes = useMemo(() => calculateSongStartTimes(), [playlist]);

  // Get current playing song based on time
  const getCurrentSong = () => {
    const currentSong = songStartTimes.find(
      (song, index) => 
        currentTime >= song.startTime && 
        (index === songStartTimes.length - 1 || currentTime < songStartTimes[index + 1].startTime)
    );
    return currentSong;
  };

  // Update current time from audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isDragging]);

  // Render thumbnail with highlighted song
  const renderThumbnail = () => {
    const canvas = canvasRef.current;
    if (!canvas || !thumbnailUrl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 1920;
    canvas.height = 1080;

    // Load and draw thumbnail image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Get current song and highlight it
      const currentSong = songStartTimes.find(
        (song, index) => 
          currentTime >= song.startTime && 
          (index === songStartTimes.length - 1 || currentTime < songStartTimes[index + 1].startTime)
      );
      if (currentSong && playlist.length > 0) {
        const songIndex = playlist.findIndex(s => s.id === currentSong.songId);
        if (songIndex !== -1) {
          const maxItems = 8;
          const itemsToShow = playlist.slice(0, maxItems);
          const playlistX = (canvas.width * playlistPosition.x) / 100;
          const playlistY = (canvas.height * playlistPosition.y) / 100;
          const itemHeight = 60;
          const spacing = 20;

          // Calculate start times for songs (already calculated above)
          const startTimesMap = new Map(songStartTimes.map(st => [st.songId, st.formattedTime]));

          ctx.font = '36px Arial';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';

          itemsToShow.forEach((song, index) => {
            const y = playlistY + (index * (itemHeight + spacing));
            const startTime = startTimesMap.get(song.id) || '0:00';
            const isCurrentSong = song.id === currentSong.songId;
            
            // Draw highlight background for current song
            if (isCurrentSong) {
              ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'; // Blue highlight background
              ctx.fillRect(
                playlistX - 10,
                y - 5,
                canvas.width * 0.8 + 20,
                itemHeight + 10
              );
            }
            
            // Draw song text with different color for current song
            ctx.fillStyle = isCurrentSong ? '#3b82f6' : '#FFFFFF'; // Blue for current, white for others
            const songText = `${index + 1}. ${song.title}${song.artist ? ` - ${song.artist}` : ''}`;
            const timestampText = `[${startTime}]`;
            
            const songTextWidth = ctx.measureText(songText).width;
            const maxWidth = canvas.width * 0.8;
            
            ctx.fillText(songText, playlistX, y, maxWidth);
            
            // Draw timestamp
            ctx.font = '28px Arial';
            ctx.fillStyle = isCurrentSong ? '#3b82f6' : '#FFFFFF';
            ctx.globalAlpha = 0.8;
            ctx.fillText(
              timestampText,
              playlistX + Math.min(songTextWidth, maxWidth - 100) + 10,
              y + 4,
              canvas.width * 0.2
            );
            ctx.globalAlpha = 1.0;
            ctx.font = '36px Arial';
          });
        }
      }
    };
    img.src = thumbnailUrl;
  };

  // Re-render when current time or playlist changes
  useEffect(() => {
    if (thumbnailUrl) {
      renderThumbnail();
    }
  }, [currentTime, thumbnailUrl, playlist, playlistPosition, songStartTimes]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
    setCurrentTime(time);
  };

  const totalDuration = songStartTimes.length > 0 
    ? songStartTimes[songStartTimes.length - 1].endTime 
    : 0;
  const currentSong = getCurrentSong();
  const currentSongIndex = currentSong 
    ? playlist.findIndex(s => s.id === currentSong.songId)
    : -1;

  if (!stitchedAudioUrl) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-500 text-center">
          Please stitch your playlist first to preview the video
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Video Preview</h3>
      
      {/* Thumbnail Canvas */}
      <div className="bg-gray-100 rounded-lg p-4 flex justify-center">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto border border-gray-300 rounded"
          style={{ maxHeight: '400px' }}
        />
      </div>

      {/* Audio Player */}
      <div className="space-y-3">
        <audio
          ref={audioRef}
          src={stitchedAudioUrl}
          className="w-full"
        />
        
        {/* Timeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>{formatTime(currentTime)}</span>
            <span className="font-medium">
              {currentSongIndex !== -1 
                ? `Song ${currentSongIndex + 1}: ${playlist[currentSongIndex]?.title || ''}`
                : 'Not playing'}
            </span>
            <span>{formatTime(totalDuration)}</span>
          </div>
          
          <div className="relative">
            <input
              type="range"
              min="0"
              max={totalDuration}
              step="0.1"
              value={currentTime}
              onChange={(e) => {
                const time = Number(e.target.value);
                setCurrentTime(time);
                handleSeek(time);
              }}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / totalDuration) * 100}%, #e5e7eb ${(currentTime / totalDuration) * 100}%, #e5e7eb 100%)`
              }}
            />
            
            {/* Song markers on timeline */}
            <div className="absolute top-0 left-0 right-0 h-2 pointer-events-none">
              {songStartTimes.map((song, index) => {
                const position = (song.startTime / totalDuration) * 100;
                return (
                  <div
                    key={song.songId}
                    className="absolute w-0.5 h-full bg-gray-400"
                    style={{ left: `${position}%` }}
                    title={`Song ${index + 1} starts at ${formatTime(song.startTime)}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Play/Pause Button */}
        <Button
          onClick={handlePlayPause}
          variant="primary"
          className="w-full"
        >
          {isPlaying ? '⏸️ Pause' : '▶️ Play'}
        </Button>
      </div>
    </div>
  );
};

