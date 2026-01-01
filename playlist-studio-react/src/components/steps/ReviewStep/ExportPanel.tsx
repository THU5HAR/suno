import React, { useState } from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { useNotifications } from '@/context/NotificationContext';
import { Button } from '@/components/ui/Button';

export const ExportPanel: React.FC = () => {
  const {
    playlist,
    stitchedAudioUrl,
    feedback,
    downloadStitchedAudio,
    stepData,
  } = usePlaylist();
  const { showNotification } = useNotifications();
  const [isExportingVideo, setIsExportingVideo] = useState(false);

  const handleExportCSV = () => {
    try {
      if (playlist.length === 0) {
        showNotification('No playlist to export', 'warning');
        return;
      }

      // Create CSV content
      const headers = ['Title', 'Artist', 'Duration', 'URL'];
      const rows = playlist.map(song => [
        song.title || '',
        song.artist || '',
        song.duration || '',
        song.url || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `playlist_${new Date().getTime()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showNotification('Playlist exported to CSV successfully', 'success');
    } catch (error: any) {
      showNotification(`Failed to export CSV: ${error.message}`, 'error');
      console.error('CSV export error:', error);
    }
  };

  const handleExportExcel = async () => {
    try {
      if (playlist.length === 0) {
        showNotification('No playlist to export', 'warning');
        return;
      }

      // Dynamic import of xlsx
      const XLSX = await import('xlsx');

      // Create worksheet data
      const worksheetData = [
        ['Title', 'Artist', 'Duration', 'URL'],
        ...playlist.map(song => [
          song.title || '',
          song.artist || '',
          song.duration || '',
          song.url || ''
        ])
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Playlist');

      // Download Excel file
      XLSX.writeFile(workbook, `playlist_${new Date().getTime()}.xlsx`);

      showNotification('Playlist exported to Excel successfully', 'success');
    } catch (error: any) {
      showNotification(`Failed to export Excel: ${error.message}`, 'error');
      console.error('Excel export error:', error);
    }
  };

  const handleDownloadAudio = async () => {
    if (!stitchedAudioUrl) {
      showNotification('No stitched audio available. Please stitch the playlist first.', 'warning');
      return;
    }

    try {
      await downloadStitchedAudio();
      showNotification('Stitched audio downloaded successfully', 'success');
    } catch (error: any) {
      showNotification(`Failed to download audio: ${error.message}`, 'error');
      console.error('Audio download error:', error);
    }
  };

  const handleExportVideo = async () => {
    if (!stitchedAudioUrl) {
      showNotification('No stitched audio available. Please stitch the playlist first.', 'warning');
      return;
    }

    const thumbnailSettings = (window as any).thumbnailSettings;
    if (!thumbnailSettings?.thumbnailUrl) {
      showNotification('No thumbnail available. Please design a video thumbnail first.', 'warning');
      return;
    }

    setIsExportingVideo(true);
    showNotification('Generating video frames... this may take a moment.', 'info');

    try {
      // Import FFmpeg dynamically
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { toBlobURL } = await import('@ffmpeg/util');

      const ffmpeg = new FFmpeg();

      // Load FFmpeg (using ESM build)
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      // Load audio
      const audioResponse = await fetch(stitchedAudioUrl);
      const audioBlob = await audioResponse.blob();
      const audioArrayBuffer = await audioBlob.arrayBuffer();
      await ffmpeg.writeFile('audio.wav', new Uint8Array(audioArrayBuffer));

      // Get all settings from thumbnailSettings
      const settings = thumbnailSettings;
      const {
        backgroundColor = '#000000',
        title = 'My Playlist',
        showTitle = true,
        titlePosition = { x: 50, y: 33.33 },
        titleFontSize = 48,
        titleFontFamily = 'Arial',
        titleOpacity = 1,
        showTitleBorder = false,
        titleBorderColor = '#FFFFFF',
        titleBorderWidth = 2,
        titleBorderRadius = 0,
        playlistPosition = { x: 50, y: 50 },
        playlistFontSize = 36,
        playlistTextColor = '#FFFFFF',
        playlistOpacity = 1,
        showPlaylistBorder = false,
        playlistBorderColor = '#FFFFFF',
        playlistBorderWidth = 2,
        playlistBorderRadius = 0,
        elements = [], // Custom elements (text, images)
        textColor = '#FFFFFF',
        fontSize = 48,
      } = settings;

      // Preload all images for custom elements
      const imageMap = new Map<string, HTMLImageElement>();
      const imagePromises = elements
        .filter((el: any) => el.type === 'image' && el.imageUrl)
        .map((el: any) => {
          return new Promise<{ id: string; img: HTMLImageElement }>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve({ id: el.id, img });
            img.onerror = () => {
              console.warn('Failed to load image:', el.imageUrl);
              resolve({ id: el.id, img: new Image() }); // Resolve with empty image to continue
            };
            img.src = el.imageUrl;
          });
        });

      await Promise.all(imagePromises);
      imagePromises.forEach(({ id, img }) => {
        if (img.complete) {
          imageMap.set(id, img);
        }
      });

      // Prepare canvas for drawing frames
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');

      // Helper to calculate song start times (matching VideoEditor logic)
      const calculateSongStartTimes = () => {
        const parseDuration = (durationStr: string): number => {
          if (!durationStr) return 180;
          const parts = durationStr.split(':');
          if (parts.length === 2) {
            const minutes = parseInt(parts[0], 10);
            const seconds = parseInt(parts[1], 10);
            if (isNaN(minutes) || isNaN(seconds)) return 180;
            return minutes * 60 + seconds;
          }
          return 180;
        };

        const delayBetweenSongs = stepData[2]?.stitchSettings?.delayBetweenSongs ?? 0;
        let accumulatedTime = 0;
        return playlist.map((song, index) => {
          const startTime = accumulatedTime;
          const songDuration = song.duration ? parseDuration(song.duration) : 180;
          const endTime = accumulatedTime + songDuration;
          accumulatedTime = endTime;
          if (index < playlist.length - 1 && delayBetweenSongs > 0) {
            accumulatedTime += delayBetweenSongs;
          }
          
          const minutes = Math.floor(startTime / 60);
          const seconds = Math.floor(startTime % 60);
          return {
            songId: song.id,
            startTime,
            endTime,
            formattedTime: `${minutes}:${seconds.toString().padStart(2, '0')}`
          };
        });
      };

      // Helper to draw a single frame with EXACT same logic as VideoEditor
      const drawFrame = (highlightIndex: number) => {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Fill background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw title if enabled
        if (showTitle && title) {
          ctx.save();
          ctx.globalAlpha = titleOpacity;
          ctx.fillStyle = textColor;
          ctx.font = `bold ${titleFontSize}px ${titleFontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const titleX = (canvas.width * titlePosition.x) / 100;
          const titleY = (canvas.height * titlePosition.y) / 100;

          const metrics = ctx.measureText(title);
          const textWidth = metrics.width;
          const textHeight = titleFontSize;

          // Draw border around title if enabled
          if (showTitleBorder) {
            ctx.strokeStyle = titleBorderColor;
            ctx.lineWidth = titleBorderWidth;
            ctx.beginPath();
            const padding = 10;
            const borderX = titleX - textWidth / 2 - padding;
            const borderY = titleY - textHeight / 2 - padding;
            const borderWidth = textWidth + (padding * 2);
            const borderHeight = textHeight + (padding * 2);

            if (titleBorderRadius > 0) {
              const radius = titleBorderRadius;
              ctx.moveTo(borderX + radius, borderY);
              ctx.lineTo(borderX + borderWidth - radius, borderY);
              ctx.quadraticCurveTo(borderX + borderWidth, borderY, borderX + borderWidth, borderY + radius);
              ctx.lineTo(borderX + borderWidth, borderY + borderHeight - radius);
              ctx.quadraticCurveTo(borderX + borderWidth, borderY + borderHeight, borderX + borderWidth - radius, borderY + borderHeight);
              ctx.lineTo(borderX + radius, borderY + borderHeight);
              ctx.quadraticCurveTo(borderX, borderY + borderHeight, borderX, borderY + borderHeight - radius);
              ctx.lineTo(borderX, borderY + radius);
              ctx.quadraticCurveTo(borderX, borderY, borderX + radius, borderY);
            } else {
              ctx.rect(borderX, borderY, borderWidth, borderHeight);
            }
            ctx.stroke();
          }

          ctx.fillText(title, titleX, titleY);
          ctx.restore();
        }

        // Draw custom elements (text, images)
        elements.forEach((element: any) => {
          ctx.save();
          ctx.globalAlpha = element.opacity !== undefined ? element.opacity : 1;
          const halfWidth = (element.width || 0) / 2;
          const halfHeight = (element.height || 0) / 2;

          if (element.type === 'text') {
            ctx.fillStyle = element.color || textColor;
            const elementFontSize = element.fontSize || fontSize;
            const elementFontFamily = element.fontFamily || 'Arial';
            ctx.font = `${elementFontSize}px ${elementFontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(element.text || '', element.x, element.y);
          } else if (element.type === 'image' && element.imageUrl) {
            const cachedImg = imageMap.get(element.id);
            if (cachedImg && cachedImg.complete) {
              ctx.drawImage(cachedImg, element.x - halfWidth, element.y - halfHeight, element.width || 200, element.height || 200);
            }
          }
          ctx.restore();
        });

        // Draw playlist items with 2-column layout (matching VideoEditor)
        if (playlist.length > 0) {
          ctx.save();
          ctx.globalAlpha = playlistOpacity;

          const maxItems = 10;
          const itemsToShow = playlist.slice(0, maxItems);
          const columnWidth = canvas.width * 0.35;
          const columnSpacing = canvas.width * 0.1;
          const songsPerColumn = 5;

          // Calculate playlist position (matching VideoEditor logic)
          const totalPlaylistWidth = (columnWidth * 2) + columnSpacing;
          const playlistX = playlistPosition.x === 50
            ? (canvas.width - totalPlaylistWidth) / 2
            : (canvas.width * playlistPosition.x) / 100 - (totalPlaylistWidth / 2);
          const playlistY = (canvas.height * playlistPosition.y) / 100;

          // Calculate start times for songs
          const songStartTimes = calculateSongStartTimes();
          const startTimesMap = new Map(songStartTimes.map(st => [st.songId, st.formattedTime]));

          ctx.font = `${playlistFontSize}px Arial`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';

          const adjustedItemHeight = playlistFontSize * 1.5;
          const adjustedSpacing = playlistFontSize * 0.5;

          // Draw border around entire playlist if enabled
          if (showPlaylistBorder) {
            const playlistHeight = songsPerColumn * (adjustedItemHeight + adjustedSpacing);
            const playlistWidth = columnWidth * 2 + columnSpacing;

            ctx.strokeStyle = playlistBorderColor;
            ctx.lineWidth = playlistBorderWidth;
            ctx.beginPath();
            if (playlistBorderRadius > 0) {
              const radius = playlistBorderRadius;
              ctx.moveTo(playlistX + radius, playlistY);
              ctx.lineTo(playlistX + playlistWidth - radius, playlistY);
              ctx.quadraticCurveTo(playlistX + playlistWidth, playlistY, playlistX + playlistWidth, playlistY + radius);
              ctx.lineTo(playlistX + playlistWidth, playlistY + playlistHeight - radius);
              ctx.quadraticCurveTo(playlistX + playlistWidth, playlistY + playlistHeight, playlistX + playlistWidth - radius, playlistY + playlistHeight);
              ctx.lineTo(playlistX + radius, playlistY + playlistHeight);
              ctx.quadraticCurveTo(playlistX, playlistY + playlistHeight, playlistX, playlistY + playlistHeight - radius);
              ctx.lineTo(playlistX, playlistY + radius);
              ctx.quadraticCurveTo(playlistX, playlistY, playlistX + radius, playlistY);
            } else {
              ctx.rect(playlistX, playlistY, playlistWidth, playlistHeight);
            }
            ctx.stroke();
          }

          itemsToShow.forEach((song, index) => {
            const column = Math.floor(index / songsPerColumn);
            const rowInColumn = index % songsPerColumn;

            const x = playlistX + (column * (columnWidth + columnSpacing));
            const y = playlistY + (rowInColumn * (adjustedItemHeight + adjustedSpacing));

            const startTime = startTimesMap.get(song.id) || '0:00';
            const isCurrentSong = index === highlightIndex;

            // Draw highlight background for current song
            if (isCurrentSong) {
              ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
              ctx.fillRect(
                x - 10,
                y - 5,
                columnWidth + 20,
                adjustedItemHeight + 10
              );
            }

            // Draw song text
            ctx.fillStyle = isCurrentSong ? '#3b82f6' : playlistTextColor;
            const songText = `${index + 1}. ${song.title}${song.artist ? ` - ${song.artist}` : ''}`;
            const timestampText = `[${startTime}]`;

            const songTextWidth = ctx.measureText(songText).width;
            const maxWidth = columnWidth - 100;

            ctx.fillText(songText, x, y, maxWidth);

            // Draw timestamp
            const timestampFontSize = Math.max(20, playlistFontSize * 0.75);
            ctx.font = `${timestampFontSize}px Arial`;
            ctx.fillStyle = isCurrentSong ? '#3b82f6' : playlistTextColor;
            ctx.globalAlpha = playlistOpacity * 0.8;
            ctx.fillText(
              timestampText,
              x + Math.min(songTextWidth, maxWidth) + 10,
              y + 4,
              columnWidth * 0.3
            );
            ctx.globalAlpha = playlistOpacity;
            ctx.font = `${playlistFontSize}px Arial`;
          });

          ctx.restore();
        }
      };

      // Calculate durations for each song
      // We need exact durations to tell FFmpeg how long to show each frame
      const parseDuration = (durationStr: string): number => {
        const parts = durationStr.split(':');
        if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        return 180;
      };

      // Generate Frames and Concat List
      let concatList = '';

      // We iterate through the playlist.
      // For each song, we generate a frame highlighting it.
      // We assign it a duration equal to the song's duration.

      // Note: Delays. The preview includes delays. 
      // If there is a delay, what should be shown?
      // Ideally, the previous song remains highlighted? Or no highlight?
      // Simple approach: The previous song frame extends through the delay.
      for (let i = 0; i < playlist.length; i++) {
        const song = playlist[i];
        const duration = parseDuration(song.duration || '3:00'); // Seconds

        // Draw frame for Song i
        drawFrame(i);

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error(`Failed to generate frame for song ${i}`);

        const buffer = await blob.arrayBuffer();
        const filename = `frame_${i}.png`;
        await ffmpeg.writeFile(filename, new Uint8Array(buffer));

        // Add to concat list
        // Format:
        // file 'filename'
        // duration 123.45
        concatList += `file '${filename}'\n`;
        concatList += `duration ${duration}\n`;
      }

      // Add the last frame again without duration (standard ffmpeg concat practice for last file)
      // Or ensure the last one has a very long duration to cover any trailing audio
      if (playlist.length > 0) {
        concatList += `file 'frame_${playlist.length - 1}.png'\n`;
        // Give it extra time to be safe, -shortest will kill it
        // concatList += `duration 1000\n`; 
      }

      await ffmpeg.writeFile('frames.txt', concatList);

      // Execute FFmpeg Concat
      const outputFileName = 'output.mp4';

      await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'frames.txt',
        '-i', 'audio.wav',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-r', '1', // 1 fps output is sufficient for static slides
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest', // Stop when audio ends
        '-pix_fmt', 'yuv420p',
        '-y',
        outputFileName
      ]);

      // Read output
      const data = await ffmpeg.readFile(outputFileName);
      // Convert FileData to ArrayBuffer for Blob
      let arrayBuffer: ArrayBuffer;
      if (data instanceof Uint8Array) {
        arrayBuffer = new ArrayBuffer(data.length);
        const view = new Uint8Array(arrayBuffer);
        view.set(data);
      } else {
        const buffer = (data as any).buffer || data;
        if (buffer instanceof ArrayBuffer) {
          arrayBuffer = new ArrayBuffer(buffer.byteLength);
          const sourceView = new Uint8Array(buffer);
          const targetView = new Uint8Array(arrayBuffer);
          targetView.set(sourceView);
        } else {
          const sourceView = new Uint8Array(buffer);
          arrayBuffer = new ArrayBuffer(sourceView.length);
          const targetView = new Uint8Array(arrayBuffer);
          targetView.set(sourceView);
        }
      }

      // Download
      const videoBlob = new Blob([arrayBuffer], { type: 'video/mp4' });
      const videoUrl = URL.createObjectURL(videoBlob);
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `playlist-video-dynamic_${new Date().getTime()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(videoUrl);

      // Cleanup
      // (Optional: loop to delete frames, but ffmpeg cleanups usually fine if re-instantiated or memory cleared)
      // await ffmpeg.deleteFile('frames.txt');
      // await ffmpeg.deleteFile('audio.wav');

      showNotification('Video exported successfully!', 'success');

    } catch (error: any) {
      console.error('Video export error:', error);
      showNotification(`Failed to export video: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsExportingVideo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Confirmation Message */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">✅ Ready to Export!</h3>
          <p className="text-gray-600 mb-6">
            Your playlist has been stitched and the video thumbnail has been designed.
            You can now export your final files.
          </p>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Export Options</h3>

        <div className="space-y-4">
          {/* Video Export */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Video Export</h4>
            <p className="text-xs text-gray-500 mb-3">
              Export video file with thumbnail image and stitched audio combined
            </p>
            <Button
              variant="primary"
              onClick={handleExportVideo}
              disabled={!stitchedAudioUrl || isExportingVideo}
              className="w-full"
            >
              {isExportingVideo
                ? '⏳ Creating Video...'
                : stitchedAudioUrl
                  ? '🎬 Export Video with Audio'
                  : '⚠️ Stitch Audio First'}
            </Button>
          </div>

          {/* Audio Export */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Audio Export</h4>
            <p className="text-xs text-gray-500 mb-3">
              Download the stitched audio file as a single audio track (no video)
            </p>
            <Button
              variant="secondary"
              onClick={handleDownloadAudio}
              disabled={!stitchedAudioUrl}
              className="w-full"
            >
              {stitchedAudioUrl ? '🎵 Download Audio Only' : '⚠️ Stitch Audio First'}
            </Button>
          </div>

          {/* Data Export */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Data Export</h4>
            <p className="text-xs text-gray-500 mb-3">
              Export your playlist and feedback as CSV or Excel files
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                onClick={handleExportCSV}
                disabled={playlist.length === 0}
                className="w-full"
              >
                📊 Export CSV
              </Button>
              <Button
                variant="secondary"
                onClick={handleExportExcel}
                disabled={playlist.length === 0}
                className="w-full"
              >
                📈 Export Excel
              </Button>
            </div>
          </div>

          {/* Project Summary */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Export Summary</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Songs:</span>
                <span className="font-semibold">{playlist.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Feedback Notes:</span>
                <span className="font-semibold">{feedback.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Stitched Audio:</span>
                <span className="font-semibold">{stitchedAudioUrl ? '✅ Ready' : '❌ Not Ready'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
