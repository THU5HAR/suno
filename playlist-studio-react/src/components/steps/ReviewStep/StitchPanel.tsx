import React, { useState, useEffect } from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { useNotifications } from '@/context/NotificationContext';
import { audioService } from '@/services/audioService';
import { Button } from '@/components/ui/Button';

export const StitchPanel: React.FC = () => {
  const {
    playlist,
    stitchedAudioUrl,
    stitchPlaylist,
    processingState,
    isGenerating,
    stepData,
  } = usePlaylist();
  const { showNotification } = useNotifications();
  // Load stitch settings from stepData if available
  const stitchSettings = stepData[2]?.stitchSettings;
  const [crossfadeDuration, setCrossfadeDuration] = useState(stitchSettings?.crossfadeDuration ?? 1);
  const [delayBetweenSongs, setDelayBetweenSongs] = useState(stitchSettings?.delayBetweenSongs ?? 0);
  const [downloadStatus, setDownloadStatus] = useState<Record<string, 'pending' | 'downloading' | 'completed' | 'cached'>>({});

  // Update download status based on processing state
  useEffect(() => {
    if (!processingState.isProcessing || !processingState.currentOperation) {
      return;
    }

    const operation = processingState.currentOperation;
    
    // Check if operation mentions a specific song
    playlist.forEach(song => {
      if (operation.includes(`"${song.title}"`)) {
        if (operation.includes('Downloading')) {
          setDownloadStatus(prev => ({ ...prev, [song.id]: 'downloading' }));
        } else if (operation.includes('Downloaded') || operation.includes('Using cached')) {
          setDownloadStatus(prev => ({ ...prev, [song.id]: 'completed' }));
        }
      }
    });
  }, [processingState.currentOperation, playlist]);

  const handleStitch = async () => {
    if (playlist.length < 2) {
      showNotification('Please add at least 2 songs to stitch', 'warning');
      return;
    }

    try {
      // Reset download status
      const status: Record<string, 'pending' | 'downloading' | 'completed' | 'cached'> = {};
      playlist.forEach(song => {
        status[song.id] = audioService.isSongCached(song.id) ? 'cached' : 'pending';
      });
      setDownloadStatus(status);

      // Show notification about download process
      showNotification('📥 Downloading songs temporarily (in memory) for stitching. Only the final stitched audio will be saved.', 'info');

      await stitchPlaylist(crossfadeDuration, delayBetweenSongs);
      showNotification('✅ Songs stitched successfully! You can download the stitched audio in the Export step.', 'success');
      
      // Mark all as completed
      playlist.forEach(song => {
        status[song.id] = 'completed';
      });
      setDownloadStatus(status);
    } catch (error) {
      console.error('Stitching failed:', error);
      showNotification(
        error instanceof Error ? error.message : 'Failed to stitch songs',
        'error'
      );
    }
  };

  const handleReStitch = async () => {
    if (playlist.length === 0) {
      showNotification('Please add songs to your playlist', 'warning');
      return;
    }

    try {
      await stitchPlaylist(crossfadeDuration, delayBetweenSongs);
      showNotification('✅ Playlist re-stitched successfully!', 'success');
    } catch (error) {
      console.error('Re-stitching failed:', error);
      showNotification(
        error instanceof Error ? error.message : 'Failed to re-stitch playlist',
        'error'
      );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">🎵 Stitch Songs</h2>

      {/* Song Order */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Song Order:</h3>
        <div className="space-y-2 bg-gray-50 p-3 rounded">
          {playlist.map((song, index) => {
            const status = downloadStatus[song.id] || 
              (audioService.isSongCached(song.id) ? 'cached' : 'pending');
            return (
              <div key={song.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600">{index + 1}.</span>
                  <span className="text-gray-900">{song.title}</span>
                  {song.artist && (
                    <span className="text-gray-500">- {song.artist}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {status === 'cached' && (
                    <span className="text-xs text-green-600 font-medium">✓ Cached</span>
                  )}
                  {status === 'downloading' && (
                    <span className="text-xs text-blue-600 font-medium animate-pulse">⬇ Loading...</span>
                  )}
                  {status === 'completed' && (
                    <span className="text-xs text-green-600 font-medium">✓ Ready</span>
                  )}
                  {status === 'pending' && !audioService.isSongCached(song.id) && (
                    <span className="text-xs text-gray-500">⏳ Pending</span>
                  )}
                </div>
              </div>
            );
          })}
          {playlist.length === 0 && (
            <p className="text-gray-500 text-sm">No songs in playlist</p>
          )}
        </div>
      </div>

      {/* Stitch Settings */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Crossfade (seconds)
          </label>
          <input
            type="number"
            min="0"
            max="5"
            step="0.5"
            value={crossfadeDuration}
            onChange={(e) => setCrossfadeDuration(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Delay Between Songs (seconds)
          </label>
          <input
            type="number"
            min="0"
            max="10"
            step="0.5"
            value={delayBetweenSongs}
            onChange={(e) => setDelayBetweenSongs(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Adds silent gap between songs in seconds"
          />
        </div>
      </div>

      {/* Processing Status */}
      {processingState.isProcessing && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">
              {processingState.currentOperation || 'Processing...'}
            </span>
            <span className="text-sm text-blue-600">
              {processingState.progress}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${processingState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stitch Buttons */}
      <div className="flex gap-2">
        {stitchedAudioUrl ? (
          <Button
            onClick={handleReStitch}
            disabled={isGenerating || playlist.length === 0}
            variant="secondary"
            className="flex-1"
          >
            🔄 Re-Stitch Songs
          </Button>
        ) : (
          <Button
            onClick={handleStitch}
            disabled={isGenerating || playlist.length < 2}
            className="flex-1"
          >
            {isGenerating ? 'Stitching...' : '🎵 Stitch Songs'}
          </Button>
        )}

        {stitchedAudioUrl && (
          <div className="flex items-center text-sm text-green-600 font-medium px-3">
            ✅ Stitched
          </div>
        )}
      </div>

      {stitchedAudioUrl && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 text-center font-medium">
            ✅ Stitched audio ready! Go to the Export step to download it.
          </p>
          <p className="text-xs text-green-700 text-center mt-1">
            Note: Individual songs were only loaded temporarily. Only the final stitched audio is saved.
          </p>
        </div>
      )}
    </div>
  );
};

