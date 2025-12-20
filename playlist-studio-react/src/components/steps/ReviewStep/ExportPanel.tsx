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
    showNotification('Creating video with audio... This may take a moment.', 'info');

    try {
      // Import FFmpeg dynamically
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { toBlobURL } = await import('@ffmpeg/util');

      const ffmpeg = new FFmpeg();

      // Load FFmpeg
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      // Convert thumbnail image URL to blob
      const imageResponse = await fetch(thumbnailSettings.thumbnailUrl);
      const imageBlob = await imageResponse.blob();
      const imageArrayBuffer = await imageBlob.arrayBuffer();

      // Convert audio URL to blob
      const audioResponse = await fetch(stitchedAudioUrl);
      const audioBlob = await audioResponse.blob();
      const audioArrayBuffer = await audioBlob.arrayBuffer();

      // Write files to FFmpeg virtual filesystem
      await ffmpeg.writeFile('thumbnail.png', new Uint8Array(imageArrayBuffer));
      await ffmpeg.writeFile('audio.wav', new Uint8Array(audioArrayBuffer));

      // Get audio duration (approximate from blob size or use a default)
      // For now, we'll let FFmpeg determine it
      const outputFileName = 'output.mp4';

      // Create video: static image with audio
      // -loop 1: loop the image
      // -i audio.wav: input audio
      // -c:v libx264: video codec
      // -tune stillimage: optimize for static image
      // -c:a aac: audio codec
      // -shortest: finish when audio ends
      // -pix_fmt yuv420p: ensure compatibility
      await ffmpeg.exec([
        '-loop', '1',
        '-r', '1', // Set frame rate to 1 fps for static image (huge speedup)
        '-i', 'thumbnail.png',
        '-i', 'audio.wav',
        '-c:v', 'libx264',
        '-tune', 'stillimage',
        '-preset', 'ultrafast', // Use fastest encoding speed
        '-c:a', 'aac',
        '-b:a', '192k', // Reasonable audio quality
        '-shortest',
        '-pix_fmt', 'yuv420p',
        '-y',
        outputFileName
      ]);

      // Read the output file
      const data = await ffmpeg.readFile(outputFileName);

      // Convert FileData to ArrayBuffer for Blob
      let arrayBuffer: ArrayBuffer;
      if (data instanceof Uint8Array) {
        // Create a new ArrayBuffer and copy the data
        arrayBuffer = new ArrayBuffer(data.length);
        const view = new Uint8Array(arrayBuffer);
        view.set(data);
      } else {
        // Handle FileData type by creating a new ArrayBuffer from the buffer
        const buffer = (data as any).buffer || data;
        if (buffer instanceof ArrayBuffer) {
          // Create a copy to ensure it's not a SharedArrayBuffer
          arrayBuffer = new ArrayBuffer(buffer.byteLength);
          const sourceView = new Uint8Array(buffer);
          const targetView = new Uint8Array(arrayBuffer);
          targetView.set(sourceView);
        } else {
          // Fallback: create from length
          const sourceView = new Uint8Array(buffer);
          arrayBuffer = new ArrayBuffer(sourceView.length);
          const targetView = new Uint8Array(arrayBuffer);
          targetView.set(sourceView);
        }
      }

      // Create blob and download
      const videoBlob = new Blob([arrayBuffer], { type: 'video/mp4' });
      const videoUrl = URL.createObjectURL(videoBlob);
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `playlist-video_${new Date().getTime()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(videoUrl);

      // Clean up FFmpeg files
      await ffmpeg.deleteFile('thumbnail.png');
      await ffmpeg.deleteFile('audio.wav');
      await ffmpeg.deleteFile(outputFileName);

      showNotification('Video with audio exported successfully!', 'success');
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
