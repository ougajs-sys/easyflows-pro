import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  label: string;
}

interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
  type?: "checklist" | "info";
}

interface ChecklistContentProps {
  sections: ChecklistSection[];
  onComplete: () => void;
  isCompleted: boolean;
}

export function ChecklistContent({ sections, onComplete, isCompleted }: ChecklistContentProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [currentSection, setCurrentSection] = useState(0);

  const allChecklistItems = sections
    .filter((s) => s.type !== "info")
    .flatMap((s) => s.items);
  
  const allChecked = allChecklistItems.every((item) => checkedItems.has(item.id));
  const progress = (checkedItems.size / allChecklistItems.length) * 100;
  const isLastSection = currentSection === sections.length - 1;

  const handleToggle = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleComplete = () => {
    if (allChecked) {
      onComplete();
    }
  };

  const section = sections[currentSection];

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {checkedItems.size} / {allChecklistItems.length} vérifications
        </span>
        <span className="font-medium">{Math.round(progress)}%</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sections.map((s, index) => (
          <button
            key={index}
            onClick={() => setCurrentSection(index)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              index === currentSection
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="bg-secondary/30 rounded-lg p-4 min-h-[200px]">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          {section.type === "info" ? (
            <AlertTriangle className="w-5 h-5 text-warning" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-primary" />
          )}
          {section.title}
        </h3>

        <div className="space-y-3">
          {section.items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg transition-colors",
                section.type === "info" 
                  ? "bg-warning/10 border border-warning/20"
                  : checkedItems.has(item.id)
                  ? "bg-success/10 border border-success/20"
                  : "bg-card border"
              )}
            >
              {section.type !== "info" && (
                <Checkbox
                  id={item.id}
                  checked={checkedItems.has(item.id)}
                  onCheckedChange={() => handleToggle(item.id)}
                  className="mt-0.5"
                />
              )}
              <label
                htmlFor={section.type !== "info" ? item.id : undefined}
                className={cn(
                  "text-sm cursor-pointer flex-1",
                  section.type !== "info" && checkedItems.has(item.id) && "line-through text-muted-foreground"
                )}
              >
                {item.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentSection((prev) => Math.max(0, prev - 1))}
          disabled={currentSection === 0}
          className="flex-1"
        >
          Précédent
        </Button>
        
        {isLastSection ? (
          isCompleted ? (
            <div className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-success/10 text-success">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Terminé</span>
            </div>
          ) : (
            <Button 
              onClick={handleComplete} 
              disabled={!allChecked}
              className="flex-1"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Valider
            </Button>
          )
        ) : (
          <Button 
            onClick={() => setCurrentSection((prev) => prev + 1)}
            className="flex-1"
          >
            Suivant
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      {!allChecked && isLastSection && !isCompleted && (
        <p className="text-sm text-muted-foreground text-center">
          Cochez toutes les vérifications pour valider ce module
        </p>
      )}
    </div>
  );
}
