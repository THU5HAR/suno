import React from 'react';
import { usePlaylist } from '@/context/PlaylistContext';

const TopToolbar: React.FC = () => {
  const { currentStep, setCurrentStep, playlist, stitchedAudioUrl, markStepCompleted } = usePlaylist();

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNextStep = () => {
    // Check if work was done on current step before marking as complete
    let hasWorkBeenDone = false;

    switch (currentStep) {
      case 1: // Audio Editing
        // Mark complete if songs were added
        hasWorkBeenDone = playlist.length > 0;
        break;
      case 2: // Stitch Audio
        // Mark complete if audio was stitched
        hasWorkBeenDone = !!stitchedAudioUrl;
        break;
      case 3: // Video Design
        // Always mark complete when moving forward (no confirmation needed)
        hasWorkBeenDone = true;
        break;
      case 4: // Review & Export (final step)
        // Always mark complete when reaching final step
        hasWorkBeenDone = true;
        break;
    }

    // Only mark as completed if work was done
    if (hasWorkBeenDone) {
      markStepCompleted(currentStep);
    }

    // Move to next step
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">♪</span>
        </div>
        <div>
          <div className="font-semibold text-gray-900">Playlist Studio</div>
          <div className="text-xs text-gray-500">Professional Music Playlist Creator</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handlePrevStep}
          disabled={currentStep === 1}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>
        <button
          onClick={handleNextStep}
          disabled={currentStep === 4}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentStep === 4 ? 'Complete' : 'Next →'}
        </button>
      </div>
    </div>
  );
};

export default TopToolbar;
