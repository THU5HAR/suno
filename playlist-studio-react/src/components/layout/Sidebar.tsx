import React from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { useNotifications } from '@/context/NotificationContext';
import { FeedbackSidebar } from '@/components/steps/AudioStep/FeedbackSidebar';
import { DesignTools } from '@/components/steps/VideoStep/DesignTools';
import { Button } from '@/components/ui/Button';
import { calculateTotalDuration, formatDuration } from '@/utils/helpers';

const Sidebar: React.FC = () => {
  const { currentStep, playlist, clearAll, setCurrentStep } = usePlaylist();
  const { showNotification } = useNotifications();
  
  // Get video editor ref from window (temporary solution - ideally use context)
  const getVideoEditorRef = () => (window as any).videoEditorRef?.current;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Audio Management
              </div>
              <button className="tool-item">
                <div className="tool-icon">➕</div>
                <div className="tool-text">Add Songs</div>
              </button>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Song Library
              </div>
              <div className="song-library">
                {playlist.length === 0 ? (
                  <div className="empty-library">No songs added yet</div>
                ) : (
                  playlist.map((song) => (
                    <div key={song.id} className="song-item">
                      <div className="song-title">{song.title}</div>
                      <div className="song-artist">{song.artist || 'Unknown Artist'}</div>
                      <div className="song-duration">{song.duration || 'Unknown'}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Audio Controls
              </div>
              <Button
                variant="secondary"
                className="w-full mb-2"
                onClick={() => {
                  if (confirm('Are you sure you want to clear all songs?')) {
                    clearAll();
                    showNotification('All songs cleared', 'success');
                  }
                }}
              >
                🗑️ Clear All
              </Button>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Feedback Notes
              </div>
              <FeedbackSidebar />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Project Summary
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Songs:</span>
                    <span className="font-semibold">{playlist.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Duration:</span>
                    <span className="font-semibold">{formatDuration(calculateTotalDuration(playlist))}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Quick Actions
              </div>
              <Button
                variant="secondary"
                className="w-full mb-2"
                onClick={() => {
                  setCurrentStep(1);
                  showNotification('Switched to Audio step', 'info');
                }}
              >
                🎵 Edit Audio
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setCurrentStep(3);
                  showNotification('Switched to Video step', 'info');
                }}
              >
                🎬 Edit Video
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <DesignTools
              onAddText={() => getVideoEditorRef()?.addText()}
              onAddImage={(imageUrl) => getVideoEditorRef()?.addImage(imageUrl)}
              onClearCanvas={() => getVideoEditorRef()?.clearCanvas()}
            />

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Project Summary
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Songs:</span>
                    <span className="font-semibold">{playlist.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Duration:</span>
                    <span className="font-semibold">{formatDuration(calculateTotalDuration(playlist))}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Quick Actions
              </div>
              <Button
                variant="secondary"
                className="w-full mb-2"
                onClick={() => {
                  setCurrentStep(1);
                  showNotification('Switched to Audio step', 'info');
                }}
              >
                🎵 Edit Audio
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setCurrentStep(2);
                  showNotification('Switched to Stitch step', 'info');
                }}
              >
                🎼 Edit Stitch
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
      {renderStepContent()}
    </div>
  );
};

export default Sidebar;
