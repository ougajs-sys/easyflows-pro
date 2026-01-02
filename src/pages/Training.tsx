import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TrainingModules } from "@/components/training/TrainingModules";
import { TrainingProgress } from "@/components/training/TrainingProgress";
import { TrainingVideo } from "@/components/training/TrainingVideo";
import { GraduationCap } from "lucide-react";

export default function Training() {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">
              <span className="text-gradient">Centre de</span> Formation
            </h1>
            <p className="text-muted-foreground">
              Guides interactifs et vidéos pour maîtriser Pipeline
            </p>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <TrainingProgress />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Modules List */}
        <div className="lg:col-span-1">
          <TrainingModules 
            selectedModule={selectedModule}
            onSelectModule={setSelectedModule}
          />
        </div>

        {/* Video/Content Area */}
        <div className="lg:col-span-2">
          <TrainingVideo moduleId={selectedModule} />
        </div>
      </div>
    </DashboardLayout>
  );
}
