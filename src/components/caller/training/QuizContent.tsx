import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, ArrowRight, Trophy, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizContentProps {
  questions: QuizQuestion[];
  onComplete: () => void;
  isCompleted: boolean;
  passingScore?: number; // percentage (0-100)
}

export function QuizContent({ 
  questions, 
  onComplete, 
  isCompleted,
  passingScore = 75 
}: QuizContentProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const isCorrect = selectedAnswer === question.correctIndex;
  const finalPercentage = Math.round((score / questions.length) * 100);
  const passed = finalPercentage >= passingScore;

  const handleSelectAnswer = (index: number) => {
    if (showFeedback) return;
    setSelectedAnswer(index);
    setShowFeedback(true);
    if (index === question.correctIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      setQuizComplete(true);
      if (passed || isCompleted) {
        onComplete();
      }
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setScore(0);
    setQuizComplete(false);
  };

  if (quizComplete) {
    return (
      <div className="space-y-6 text-center py-6">
        <div className={cn(
          "w-20 h-20 rounded-full mx-auto flex items-center justify-center",
          passed ? "bg-success/20" : "bg-warning/20"
        )}>
          <Trophy className={cn(
            "w-10 h-10",
            passed ? "text-success" : "text-warning"
          )} />
        </div>
        
        <div>
          <h3 className="text-2xl font-bold mb-2">
            {passed ? "Félicitations !" : "Presque !"}
          </h3>
          <p className="text-muted-foreground">
            Vous avez obtenu {score} sur {questions.length} ({finalPercentage}%)
          </p>
        </div>

        <div className="bg-secondary/30 rounded-lg p-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Score minimum requis</span>
            <span className="font-medium">{passingScore}%</span>
          </div>
          <Progress 
            value={finalPercentage} 
            className={cn("h-3", passed ? "[&>div]:bg-success" : "[&>div]:bg-warning")} 
          />
        </div>

        {passed ? (
          <div className="p-4 rounded-lg bg-success/10 text-success">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-2" />
            <p className="font-medium">Module validé avec succès !</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Il vous faut au moins {passingScore}% pour valider ce module.
            </p>
            <Button onClick={handleRetry} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Réessayer le quiz
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Question {currentQuestion + 1} sur {questions.length}
          </span>
          <span className="font-medium">Score: {score}/{currentQuestion + (showFeedback ? 1 : 0)}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <div className="bg-secondary/30 rounded-lg p-4">
        <h3 className="font-semibold text-lg mb-4">{question.question}</h3>
        
        <div className="space-y-2">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectOption = index === question.correctIndex;
            
            let optionClass = "border-border hover:border-primary/50 hover:bg-primary/5";
            if (showFeedback) {
              if (isCorrectOption) {
                optionClass = "border-success bg-success/10 text-success";
              } else if (isSelected && !isCorrectOption) {
                optionClass = "border-destructive bg-destructive/10 text-destructive";
              } else {
                optionClass = "border-border opacity-50";
              }
            } else if (isSelected) {
              optionClass = "border-primary bg-primary/10";
            }

            return (
              <button
                key={index}
                onClick={() => handleSelectAnswer(index)}
                disabled={showFeedback}
                className={cn(
                  "w-full p-3 rounded-lg border-2 text-left transition-all flex items-center gap-3",
                  optionClass
                )}
              >
                <span className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                  showFeedback && isCorrectOption ? "bg-success text-success-foreground" :
                  showFeedback && isSelected && !isCorrectOption ? "bg-destructive text-destructive-foreground" :
                  isSelected ? "bg-primary text-primary-foreground" : "bg-secondary"
                )}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1">{option}</span>
                {showFeedback && isCorrectOption && (
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                )}
                {showFeedback && isSelected && !isCorrectOption && (
                  <XCircle className="w-5 h-5 text-destructive shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback */}
      {showFeedback && (
        <div className={cn(
          "p-4 rounded-lg",
          isCorrect ? "bg-success/10 border border-success/30" : "bg-warning/10 border border-warning/30"
        )}>
          <div className="flex items-start gap-3">
            {isCorrect ? (
              <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            )}
            <div>
              <p className={cn("font-medium", isCorrect ? "text-success" : "text-warning")}>
                {isCorrect ? "Bonne réponse !" : "Pas tout à fait..."}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {question.explanation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Next button */}
      {showFeedback && (
        <Button onClick={handleNextQuestion} className="w-full gap-2">
          {currentQuestion < questions.length - 1 ? (
            <>
              Question suivante
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              Voir les résultats
              <Trophy className="w-4 h-4" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
