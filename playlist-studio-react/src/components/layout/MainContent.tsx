import React, { useEffect, useRef } from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { SongLibrary } from '@/components/steps/AudioStep/SongLibrary';
import { StitchPanel } from '@/components/steps/ReviewStep/StitchPanel';
import { ExportPanel } from '@/components/steps/ReviewStep/ExportPanel';
import { ProjectSummary } from '@/components/steps/ReviewStep/ProjectSummary';
import { VideoEditor, VideoEditorRef } from '@/components/steps/VideoStep/VideoEditor';
import { Button } from '@/components/ui/Button';

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
  const { currentStep } = usePlaylist();
  const videoEditorRef = useRef<VideoEditorRef>(null);

  // Expose videoEditorRef to window for sidebar access (temporary solution)
  // In a real app, you'd use a context or state management
  useEffect(() => {
    (window as any).videoEditorRef = videoEditorRef;
    return () => {
      delete (window as any).videoEditorRef;
    };
  }, []);

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
              {/* Song Library Component */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <SongLibrary />
              </div>
            </div>
          </div>
        );

      case 2:
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

      case 3:
        return (
          <div className="p-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-semibold text-gray-900 mb-2">
                Video Design & Thumbnail
              </h2>
              <p className="text-gray-600">
                Design your video thumbnail and customize the visual appearance
              </p>
            </div>

            <VideoEditor
              ref={videoEditorRef}
              onThumbnailChange={(data) => {
                // Store thumbnail data for review step
                if (typeof window !== 'undefined') {
                  (window as any).thumbnailSettings = {
                    thumbnailUrl: data.thumbnailUrl,
                    cleanBackgroundUrl: data.cleanBackgroundUrl,
                    playlistPosition: data.playlistPosition
                  };
                }
              }}
            />
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
