import React from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { useNotifications } from '@/context/NotificationContext';
import { downloadFeedbackReport } from '@/utils/docxExport';
import { Button } from '@/components/ui/Button';
import { Feedback } from '@/types';

export const FeedbackSidebar: React.FC = () => {
  const { playlist, feedback, removeFeedback } = usePlaylist();
  const { showNotification } = useNotifications();

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownloadFeedback = async () => {
    if (feedback.length === 0) {
      showNotification('No feedback to export', 'warning');
      return;
    }

    try {
      const feedbackItems = feedback.map((fb) => {
        const song = playlist[fb.songIndex];
        return {
          songTitle: song?.title || 'Unknown Song',
          artist: song?.artist,
          timestamp: fb.timestamp,
          title: fb.title,
          text: fb.text,
        };
      });

      const playlistName = `Playlist_${playlist.length}_Songs`;
      await downloadFeedbackReport(feedbackItems, playlistName);
      showNotification('📄 Feedback notes exported successfully!', 'success');
    } catch (error) {
      console.error('Feedback export failed:', error);
      showNotification('Failed to export feedback notes', 'error');
    }
  };

  // Group feedback by song for better organization
  const feedbackBySong = feedback.reduce((acc, fb) => {
    const song = playlist[fb.songIndex];
    const songTitle = song?.title || `Song ${fb.songIndex + 1}`;
    if (!acc[songTitle]) {
      acc[songTitle] = [];
    }
    acc[songTitle].push(fb);
    return acc;
  }, {} as Record<string, Feedback[]>);

  // Sort feedback within each song by timestamp (chronological order)
  Object.keys(feedbackBySong).forEach((songTitle) => {
    feedbackBySong[songTitle].sort((a, b) => {
      // First sort by song index, then by timestamp
      if (a.songIndex !== b.songIndex) {
        return a.songIndex - b.songIndex;
      }
      return a.timestamp - b.timestamp;
    });
  });

  return (
    <div className="feedback-sidebar space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">📝 Feedback Notes</h3>
        <div className="flex gap-2">
          <span className="text-xs text-gray-500">{feedback.length} note{feedback.length !== 1 ? 's' : ''}</span>
          {feedback.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDownloadFeedback}
              title="Download feedback as DOCX"
            >
              📥
            </Button>
          )}
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto space-y-4">
        {feedback.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <p>No feedback notes yet.</p>
            <p className="text-xs mt-2">Add feedback while reviewing songs!</p>
          </div>
        ) : (
          Object.entries(feedbackBySong).map(([songTitle, songFeedback]) => (
            <div key={songTitle} className="border-b border-gray-200 pb-3 last:border-b-0">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">{songTitle}</h4>
              <div className="space-y-2">
                {songFeedback.map((fb) => {
                  return (
                    <div
                      key={fb.id}
                      className="bg-gray-50 rounded p-2 text-xs hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-blue-600">
                              [{formatTimestamp(fb.timestamp)}]
                            </span>
                            <span className="font-semibold text-gray-900">{fb.title}</span>
                          </div>
                          <p className="text-gray-600 text-xs leading-relaxed whitespace-pre-wrap break-words">
                            {fb.text}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('Delete this feedback note?')) {
                              removeFeedback(fb.id);
                              showNotification('Feedback note deleted', 'success');
                            }
                          }}
                          className="text-red-500 hover:text-red-700 text-xs px-1"
                          title="Delete note"
                        >
                          ×
                        </button>
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        {new Date(fb.createdAt).toLocaleDateString()} {new Date(fb.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {feedback.length > 0 && (
        <div className="border-t pt-3">
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={handleDownloadFeedback}
          >
            📄 Download All Notes (DOCX)
          </Button>
        </div>
      )}
    </div>
  );
};

