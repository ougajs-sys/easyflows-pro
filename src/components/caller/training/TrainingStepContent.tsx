import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  content: React.ReactNode;
}

interface TrainingStepContentProps {
  steps: Step[];
  onComplete: () => void;
  isCompleted: boolean;
}

export function TrainingStepContent({ steps, onComplete, isCompleted }: TrainingStepContentProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Étape {currentStep + 1} sur {steps.length}
          </span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step indicators */}
      <div className="flex justify-center gap-2">
        {steps.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentStep(index)}
            className={cn(
              "w-8 h-8 rounded-full text-sm font-medium transition-colors",
              index === currentStep
                ? "bg-primary text-primary-foreground"
                : index < currentStep
                ? "bg-success/20 text-success"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {index < currentStep ? (
              <CheckCircle2 className="w-4 h-4 mx-auto" />
            ) : (
              index + 1
            )}
          </button>
        ))}
      </div>

      {/* Step title */}
      <h3 className="text-lg font-semibold text-center">{steps[currentStep].title}</h3>

      {/* Step content */}
      <div className="bg-secondary/30 rounded-lg p-4 min-h-[200px]">
        {steps[currentStep].content}
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="flex-1"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Précédent
        </Button>
        
        {isCompleted ? (
          <div className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-success/10 text-success">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Terminé</span>
          </div>
        ) : (
          <Button onClick={handleNext} className="flex-1">
            {isLastStep ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Terminer
              </>
            ) : (
              <>
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
