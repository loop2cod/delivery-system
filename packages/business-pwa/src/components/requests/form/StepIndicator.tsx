import { clsx } from 'clsx';
import { CheckIcon } from '@heroicons/react/24/solid';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function StepIndicator({ currentStep, totalSteps, stepLabels }: StepIndicatorProps) {
  const getStepStatus = (stepNumber: number) => {
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <div className="mb-8">
      {/* Mobile View - Vertical Layout */}
      <div className="block sm:hidden">
        <div className="relative">
          {/* Progress Bar Background */}
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-200"></div>
          
          {/* Active Progress Bar */}
          <div 
            className="absolute left-6 top-8 w-0.5 bg-primary transition-all duration-500 ease-out"
            style={{ height: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          ></div>
          
          {/* Steps */}
          <div className="space-y-6">
            {stepLabels.map((label, index) => {
              const stepNumber = index + 1;
              const status = getStepStatus(stepNumber);
              
              return (
                <div key={stepNumber} className="relative flex items-center">
                  {/* Step Circle */}
                  <div
                    className={clsx(
                      'relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 border-4',
                      {
                        'bg-primary border-primary text-white shadow-lg': status === 'completed' || status === 'current',
                        'bg-white border-gray-300 text-gray-400': status === 'upcoming',
                      }
                    )}
                  >
                    {status === 'completed' ? (
                      <CheckIcon className="w-6 h-6 text-white" />
                    ) : (
                      <span>{stepNumber}</span>
                    )}
                    
                    {/* Current step pulse animation */}
                    {status === 'current' && (
                      <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20"></div>
                    )}
                  </div>
                  
                  {/* Step Content */}
                  <div className="ml-4 flex-1">
                    <h3 className={clsx(
                      'text-base font-semibold transition-colors duration-200',
                      {
                        'text-primary': status === 'completed' || status === 'current',
                        'text-gray-900': status === 'current',
                        'text-gray-400': status === 'upcoming',
                      }
                    )}>
                      {label}
                    </h3>
                    <p className={clsx(
                      'text-sm transition-colors duration-200',
                      {
                        'text-primary/70': status === 'completed',
                        'text-gray-600': status === 'current',
                        'text-gray-400': status === 'upcoming',
                      }
                    )}>
                      {status === 'completed' && 'Completed'}
                      {status === 'current' && 'In Progress'}
                      {status === 'upcoming' && 'Pending'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop View - Horizontal Layout */}
      <div className="hidden sm:block">
        {/* Steps Container */}
        <div className="relative">
          {/* Background Progress Line */}
          <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200"></div>
          
          {/* Active Progress Line */}
          <div 
            className="absolute top-6 left-0 h-0.5 bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          ></div>
          
          {/* Steps */}
          <div className="relative flex justify-between">
            {stepLabels.map((label, index) => {
              const stepNumber = index + 1;
              const status = getStepStatus(stepNumber);
              
              return (
                <div key={stepNumber} className="flex flex-col items-center">
                  {/* Step Circle */}
                  <div
                    className={clsx(
                      'relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 border-4 bg-white',
                      {
                        'border-primary text-primary shadow-lg ring-4 ring-primary/10': status === 'completed' || status === 'current',
                        'border-gray-300 text-gray-400': status === 'upcoming',
                      }
                    )}
                  >
                    {status === 'completed' ? (
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <CheckIcon className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <span>{stepNumber}</span>
                    )}
                    
                    {/* Current step pulse animation */}
                    {status === 'current' && (
                      <div className="absolute inset-0 rounded-full border-4 border-primary animate-pulse opacity-40"></div>
                    )}
                  </div>
                  
                  {/* Step Label */}
                  <div className="mt-3 text-center max-w-24 lg:max-w-32">
                    <h3 className={clsx(
                      'text-sm lg:text-base font-semibold transition-colors duration-200 leading-tight',
                      {
                        'text-primary': status === 'completed' || status === 'current',
                        'text-gray-400': status === 'upcoming',
                      }
                    )}>
                      {label}
                    </h3>
                    <p className={clsx(
                      'text-xs mt-1 transition-colors duration-200',
                      {
                        'text-primary/70': status === 'completed',
                        'text-gray-600': status === 'current',
                        'text-gray-400': status === 'upcoming',
                      }
                    )}>
                      {status === 'completed' && 'Completed'}
                      {status === 'current' && 'Current'}
                      {status === 'upcoming' && 'Pending'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}