import React from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { STEP_LABELS } from '@/utils/constants';

const StepNavigation: React.FC = () => {
  const { currentStep, stepCompletion, setCurrentStep } = usePlaylist();

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
              onClick={() => setCurrentStep(stepNumber)}
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
