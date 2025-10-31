import React, { useState } from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { SongLibrary } from '@/components/steps/AudioStep/SongLibrary';
import { Timeline } from '@/components/steps/AudioStep/Timeline';
import { parseCSV, parseExcel } from '@/utils/helpers';
import { useNotifications } from '@/context/NotificationContext';
import { StitchPanel } from '@/components/steps/ReviewStep/StitchPanel';
import { ExportPanel } from '@/components/steps/ReviewStep/ExportPanel';
import { ProjectSummary } from '@/components/steps/ReviewStep/ProjectSummary';
import { Button } from '@/components/ui/Button';
import { CanvasEditor } from '@/components/steps/DesignStep';
import { useCanvas } from '@/context/CanvasContext';
import { CANVAS_CONFIG } from '@/utils/constants';

const StitchedAudioPreview: React.FC = () => {
  const { stitchedAudioUrl, downloadStitchedAudio } = usePlaylist();

  if (!stitchedAudioUrl) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Stitched Audio Preview</h3>
      <audio src={stitchedAudioUrl} controls className="w-full mb-3" />
      <div className="flex justify-end">
        <Button variant="secondary" onClick={downloadStitchedAudio}>
          📥 Download Stitched Audio
        </Button>
      </div>
    </div>
  );
};

const MainContent: React.FC = () => {
  const { currentStep, addSong } = usePlaylist();
  const { showNotification } = useNotifications();
  const { canvasEditorRef } = useCanvas();
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="p-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-semibold text-gray-900 mb-2">
                Audio Editing & Review
              </h2>
              <p className="text-gray-600">
                Add songs, create your playlist, and add timestamped feedback
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex justify-center">
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <div className="upload-zone">
                    <div className="upload-icon">📁</div>
                    <div className="upload-text">Upload CSV or Excel File</div>
                    <div className="upload-hint">Drop files here or click to browse</div>
                  </div>
                </label>
                <input 
                  type="file" 
                  className="hidden" 
                  id="csv-upload"
                  accept=".csv,.xlsx,.xls"
                  disabled={isProcessingFile}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    setIsProcessingFile(true);
                    try {
                      const fileExtension = file.name.split('.').pop()?.toLowerCase();
                      let songs;

                      if (fileExtension === 'csv') {
                        songs = await parseCSV(file);
                      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                        songs = await parseExcel(file);
                      } else {
                        throw new Error('Unsupported file format. Please use CSV or Excel files.');
                      }

                      // Add all parsed songs to the playlist
                      songs.forEach(song => {
                        addSong(song);
                      });

                      showNotification(
                        `Successfully added ${songs.length} song${songs.length !== 1 ? 's' : ''} from ${file.name}!`,
                        'success'
                      );

                      // Reset file input
                      e.target.value = '';
                    } catch (error: any) {
                      showNotification(
                        `Failed to parse file: ${error.message}`,
                        'error'
                      );
                      console.error('File parsing error:', error);
                    } finally {
                      setIsProcessingFile(false);
                    }
                  }}
                />
              </div>

              <div className="flex justify-center gap-4">
                {/* These buttons are now handled by SongLibrary component's "Add Song" button */}
              </div>

              {/* Song Library Component */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <SongLibrary />
              </div>

              {/* Timeline Component - Shows all feedback markers */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <Timeline currentTime={0} playingSongId={null} />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="p-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-semibold text-gray-900 mb-2">
                Video Design & Thumbnail
              </h2>
              <p className="text-gray-600">
                Design your video thumbnail and visual elements
              </p>
            </div>

            <div className="space-y-6">
              {/* Main Canvas Area - Full Width */}
              <div className="flex justify-center">
                <CanvasEditor
                  ref={canvasEditorRef as React.RefObject<any>}
                  width={CANVAS_CONFIG.width}
                  height={CANVAS_CONFIG.height}
                  className="w-full max-w-7xl"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="p-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-semibold text-gray-900 mb-2">
                Stitch & Prepare Export
              </h2>
              <p className="text-gray-600">
                Stitch your playlist into a single audio file before exporting
              </p>
            </div>

            <div className="space-y-6">
              <StitchPanel />

              {/* Stitched Audio Preview and Download */}
              <StitchedAudioPreview />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="p-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-semibold text-gray-900 mb-2">
                Review & Export
              </h2>
              <p className="text-gray-600">
                Review your complete project and export final files
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Export Panel */}
              <div className="lg:col-span-2">
                <ExportPanel />
              </div>

              {/* Project Summary */}
              <div>
                <ProjectSummary />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      {renderStepContent()}
    </div>
  );
};

export default MainContent;