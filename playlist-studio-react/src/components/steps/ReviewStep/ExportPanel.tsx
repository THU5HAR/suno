import React from 'react';
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

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Export Options</h3>

      <div className="space-y-4">
        {/* Audio Export */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Audio Export</h4>
          <p className="text-xs text-gray-500 mb-3">
            Download the stitched audio file as a single audio track
          </p>
          <Button
            variant="primary"
            onClick={handleDownloadAudio}
            disabled={!stitchedAudioUrl}
            className="w-full"
          >
            {stitchedAudioUrl ? '📥 Download Stitched Audio' : '⚠️ Stitch Audio First'}
          </Button>
          {stitchedAudioUrl && (
            <div className="mt-2">
              <audio src={stitchedAudioUrl} controls className="w-full" />
            </div>
          )}
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
  );
};
