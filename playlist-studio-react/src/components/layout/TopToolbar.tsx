import React from 'react';
import { usePlaylist } from '@/context/PlaylistContext';

const TopToolbar: React.FC = () => {
  const { currentStep, setCurrentStep } = usePlaylist();

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNextStep = () => {
    if (currentStep < 2) {
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
          <div className="text-xs text-gray-500">Professional Music Video Creator</div>
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
          disabled={currentStep === 2}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentStep === 2 ? 'Complete' : 'Next →'}
        </button>
      </div>
    </div>
  );
};

export default TopToolbar;