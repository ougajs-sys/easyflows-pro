import React from "react";
import { cn } from "@/lib/utils";

interface AIScoreCircleProps {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AIScoreCircle({ score, size = "md", className }: AIScoreCircleProps) {
  const sizeClasses = {
    sm: "w-20 h-20",
    md: "w-32 h-32",
    lg: "w-40 h-40",
  };

  const textSizeClasses = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-5xl",
  };

  const subTextSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  // Score color logic
  const getScoreColor = () => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-primary";
    if (score >= 40) return "text-warning";
    return "text-destructive";
  };

  const getScoreLabel = () => {
    if (score >= 80) return "Excellent !";
    if (score >= 60) return "Correct";
    if (score >= 40) return "À améliorer";
    return "Attention !";
  };

  const getStrokeColor = () => {
    if (score >= 80) return "stroke-success";
    if (score >= 60) return "stroke-primary";
    if (score >= 40) return "stroke-warning";
    return "stroke-destructive";
  };

  // Calculate circle stroke
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            strokeWidth="8"
            className="stroke-muted"
          />
          {/* Progress circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={cn("transition-all duration-1000 ease-out", getStrokeColor())}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-bold", textSizeClasses[size], getScoreColor())}>
            {score}
          </span>
          <span className={cn("text-muted-foreground", subTextSizeClasses[size])}>
            /100
          </span>
        </div>
      </div>
      <span className={cn("font-medium", getScoreColor())}>
        {getScoreLabel()}
      </span>
    </div>
  );
}
