import { clsx } from 'clsx';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function StepIndicator({ currentStep, totalSteps, stepLabels }: StepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                step <= currentStep
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-600'
              )}
            >
              {step}
            </div>
            {step < totalSteps && (
              <div
                className={clsx(
                  'w-16 h-1 mx-2',
                  step < currentStep ? 'bg-primary' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-sm">
        {stepLabels.map((label, index) => (
          <span 
            key={index}
            className={currentStep >= index + 1 ? 'text-primary font-medium' : 'text-gray-500'}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}