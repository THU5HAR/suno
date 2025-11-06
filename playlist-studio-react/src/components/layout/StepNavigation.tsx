import React from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { STEP_LABELS } from '@/utils/constants';

const StepNavigation: React.FC = () => {
  const { currentStep, stepCompletion, setCurrentStep, playlist, stitchedAudioUrl, markStepCompleted } = usePlaylist();

  const handleStepClick = (targetStep: number) => {
    // If clicking on a different step, check if work was done on current step
    if (targetStep !== currentStep) {
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
    }

    // Navigate to the clicked step
    setCurrentStep(targetStep);
  };

  const getStepClass = (stepNumber: number) => {
    const baseClasses = 'step-item';
    if (stepNumber === currentStep) return `${baseClasses} active`;
    if (stepCompletion[stepNumber]) return `${baseClasses} completed`;
    return `${baseClasses} pending`;
  };

  const getProgressPercent = () => {
    const completedSteps = Object.values(stepCompletion).filter(Boolean).length;
    return (completedSteps / 4) * 100;
  };

  return (
    <div className="bg-white border-b border-gray-200 py-5">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex justify-center gap-0">
          {[1, 2, 3, 4].map((stepNumber) => (
            <div
              key={stepNumber}
              className={getStepClass(stepNumber)}
              onClick={() => handleStepClick(stepNumber)}
            >
              <div className="step-number">{stepNumber}</div>
              <div className="step-label">{STEP_LABELS[stepNumber as keyof typeof STEP_LABELS]}</div>
            </div>
          ))}
        </div>
        <div className="step-progress-bar">
          <div
            className="step-progress-fill"
            style={{ width: `${getProgressPercent()}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default StepNavigation;
