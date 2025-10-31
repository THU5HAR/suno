import React from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { useNotifications } from '@/context/NotificationContext';
import { useCanvas } from '@/context/CanvasContext';
import { AssetLibrary } from '@/components/steps/DesignStep/AssetLibrary';
import { FeedbackSidebar } from '@/components/steps/AudioStep/FeedbackSidebar';
import { Button } from '@/components/ui/Button';
import { Asset } from '@/types';

const Sidebar: React.FC = () => {
  const { currentStep, playlist, clearAll, setCurrentStep } = usePlaylist();
  const { showNotification } = useNotifications();
  const { canvasEditorRef } = useCanvas();

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
              <button className="tool-item">
                <div className="tool-icon">📊</div>
                <div className="tool-text">Upload Excel</div>
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
                Design Tools
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    if (canvasEditorRef.current?.addRectangle) {
                      canvasEditorRef.current.addRectangle();
                    }
                  }}
                >
                  ⬜ Rectangle
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    if (canvasEditorRef.current?.addCircle) {
                      canvasEditorRef.current.addCircle();
                    }
                  }}
                >
                  ⭕ Circle
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    if (canvasEditorRef.current?.addText) {
                      canvasEditorRef.current.addText();
                    }
                  }}
                >
                  📝 Text
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    if (canvasEditorRef.current?.clearCanvas) {
                      canvasEditorRef.current.clearCanvas();
                      showNotification('Canvas cleared', 'success');
                    }
                  }}
                >
                  🗑️ Clear Canvas
                </Button>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Asset Library
              </div>
              <AssetLibrary
                onAssetSelect={(asset: Asset) => {
                  showNotification(`Selected asset: ${asset.name}`, 'info');
                  // TODO: Implement adding asset to canvas
                }}
              />
            </div>
          </div>
        );

      case 3:
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
                    <span className="font-semibold">0:00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Feedback:</span>
                    <span className="font-semibold">0</span>
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
                  showNotification('Switched to Design step', 'info');
                }}
              >
                🎨 Edit Design
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