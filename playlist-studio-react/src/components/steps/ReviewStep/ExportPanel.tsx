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

      // Load base background image
      const img = new Image();
      img.crossOrigin = 'anonymous';

      // Use clean background if available (prevents double-playlist effect)
      const imageSrc = thumbnailSettings.cleanBackgroundUrl || thumbnailSettings.thumbnailUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageSrc;
      });

      // Prepare canvas for drawing frames
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');

      // Helper to draw a single frame
      const drawFrame = (highlightIndex: number) => {
        // Draw base image
        ctx.globalAlpha = 1.0;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Draw playlist with highlight
        const playlistPosition = thumbnailSettings.playlistPosition || { x: 10, y: 50 };
        const maxItems = 8;
        const itemsToShow = playlist.slice(0, maxItems);
        const playlistX = (canvas.width * playlistPosition.x) / 100;
        const playlistY = (canvas.height * playlistPosition.y) / 100;
        const itemHeight = 60;
        const spacing = 20;

        ctx.font = '36px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        itemsToShow.forEach((song, index) => {
          const y = playlistY + (index * (itemHeight + spacing));
          const isCurrentSong = index === highlightIndex; // Simple index matching for now (since no scrolling)

          // Format start time - simple calculation for display
          // Note: In a real implementation we might want to pass exact start times, 
          // but for visual consistency with preview, recalculating is fine.
          // We only need the text to look right.

          // Draw highlight background
          if (isCurrentSong) {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
            ctx.fillRect(playlistX - 10, y - 5, canvas.width * 0.8 + 20, itemHeight + 10);
          }

          // Draw text
          ctx.fillStyle = isCurrentSong ? '#3b82f6' : '#FFFFFF';
          const songText = `${index + 1}. ${song.title}${song.artist ? ` - ${song.artist}` : ''}`;

          // We need to fetch the approximate start time for display text
          // Ideally we pre-calculate this, but for simplicity we can estimate:
          // This is just visual text, the video timing is handled by concat file.
          // ... actually, we can skip the timestamp text or just render it if we have it?
          // The preview renders `[start:time]`. Let's try to include it.
          // For now, drawing the title is the priority.

          const maxWidth = canvas.width * 0.8;
          ctx.fillText(songText, playlistX, y, maxWidth);
        });
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
