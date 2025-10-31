import React, { useState } from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { useNotifications } from '@/context/NotificationContext';
import { videoGenerationService } from '@/services/videoGenerationService';
import { VIDEO_CONFIG } from '@/utils/constants';
import { calculateTotalDuration } from '@/utils/helpers';
import { Button } from '@/components/ui/Button';

export const ExportPanel: React.FC = () => {
  const {
    playlist,
    stitchedAudioUrl,
    currentVideoUrl,
    setCurrentVideoUrl,
    setIsGenerating,
    updateProcessingState,
    isGenerating,
    processingState,
    stepData,
    downloadStitchedAudio,
  } = usePlaylist();
  const { showNotification } = useNotifications();
  const [videoOptions] = useState({
    width: VIDEO_CONFIG.width,
    height: VIDEO_CONFIG.height,
    sidebarWidth: VIDEO_CONFIG.sidebarWidth,
  });

  const handleGenerateVideo = async () => {
    if (!stitchedAudioUrl || playlist.length === 0) {
      showNotification('Audio must be stitched and playlist must contain songs before generating video', 'error');
      return;
    }

    // Get canvas data from Design step (step 2)
    const canvasData = stepData[2]?.canvasData;
    console.log('ExportPanel - stepData:', stepData);
    console.log('ExportPanel - canvasData for step 2:', canvasData);
    
    if (!canvasData) {
      console.error('No canvas data found. Available stepData keys:', Object.keys(stepData));
      showNotification('No canvas data found. Please complete the design step first.', 'warning');
      return;
    }
    
    console.log('Canvas data found:', {
      backgroundColor: canvasData.backgroundColor,
      objectCount: canvasData.objects.length,
      objects: canvasData.objects.map(obj => ({ type: obj.type }))
    });

    try {
      setIsGenerating(true);
      updateProcessingState({
        isProcessing: true,
        progress: 0,
        currentOperation: 'Preparing video generation',
      });

      // Get audio buffer from the stitched audio
      const audioResponse = await fetch(stitchedAudioUrl);
      const audioBlob = await audioResponse.blob();
      const audioBuffer = await audioBlob.arrayBuffer();

      const audioBufferObj = {
        name: 'stitched_audio.wav',
        data: audioBuffer,
        originalName: 'stitched_audio.wav',
      };

      // Calculate duration from playlist
      const totalDuration = calculateTotalDuration(playlist);

      // Generate video
      const videoBlob = await videoGenerationService.generateVideo(
        audioBufferObj,
        canvasData,
        {
          width: videoOptions.width,
          height: videoOptions.height,
          duration: totalDuration,
          includeAudio: true,
          sidebarWidth: videoOptions.sidebarWidth,
        },
        updateProcessingState
      );

      // Create video URL
      const videoUrl = URL.createObjectURL(videoBlob);
      setCurrentVideoUrl(videoUrl);

      showNotification('Video generated successfully!', 'success');
    } catch (error) {
      console.error('Video generation failed:', error);
      showNotification(error instanceof Error ? error.message : 'Video generation failed', 'error');
    } finally {
      setIsGenerating(false);
      updateProcessingState({
        isProcessing: false,
        progress: 0,
        currentOperation: undefined,
      });
    }
  };

  const handleDownloadVideo = async () => {
    if (!currentVideoUrl) {
      showNotification('No video available to download', 'warning');
      return;
    }

    try {
      const response = await fetch(currentVideoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `playlist_video_${new Date().getTime()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showNotification('Video downloaded successfully!', 'success');
    } catch (error) {
      console.error('Video download failed:', error);
      showNotification('Failed to download video', 'error');
    }
  };

  const hasCanvasData = !!stepData[2]?.canvasData;
  const canGenerateVideo = hasCanvasData && !!stitchedAudioUrl && playlist.length > 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4">Export Options</h2>

      {/* Stitched Audio Export */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Stitched Audio</h3>
        {stitchedAudioUrl ? (
          <div className="space-y-3">
            <audio src={stitchedAudioUrl} controls className="w-full" />
            <Button
              onClick={downloadStitchedAudio}
              variant="secondary"
              className="w-full"
              disabled={!stitchedAudioUrl}
            >
              📥 Download Audio (WAV)
            </Button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Stitch your playlist first in Step 3</p>
        )}
      </div>

      {/* Video Generation */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Video Export</h3>
        {!hasCanvasData && (
          <p className="text-sm text-gray-500 mb-3">
            Complete the Design step (Step 2) to generate video
          </p>
        )}
        {!stitchedAudioUrl && (
          <p className="text-sm text-gray-500 mb-3">
            Stitch your playlist first in Step 3
          </p>
        )}

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

        {!currentVideoUrl && (
          <Button
            onClick={handleGenerateVideo}
            disabled={!canGenerateVideo || isGenerating}
            className="w-full"
          >
            {isGenerating ? 'Generating Video...' : '🎬 Generate Video'}
          </Button>
        )}

        {currentVideoUrl && (
          <div className="space-y-3">
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <video
                src={currentVideoUrl}
                controls
                className="w-full"
                style={{ maxHeight: '400px' }}
              />
            </div>
            <Button
              onClick={handleDownloadVideo}
              variant="secondary"
              className="w-full"
            >
              📥 Download Video (MP4)
            </Button>
            <Button
              onClick={handleGenerateVideo}
              variant="secondary"
              disabled={isGenerating}
              className="w-full"
            >
              🔄 Regenerate Video
            </Button>
          </div>
        )}
      </div>

      {/* Export Summary */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Export Summary</h3>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Songs:</span>
            <span className="font-medium">{playlist.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Audio Stitched:</span>
            <span className="font-medium">{stitchedAudioUrl ? '✓ Yes' : '✗ No'}</span>
          </div>
          <div className="flex justify-between">
            <span>Video Generated:</span>
            <span className="font-medium">{currentVideoUrl ? '✓ Yes' : '✗ No'}</span>
          </div>
          <div className="flex justify-between">
            <span>Canvas Design:</span>
            <span className="font-medium">{hasCanvasData ? '✓ Yes' : '✗ No'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

