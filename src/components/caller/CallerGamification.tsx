import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Star, 
  Target, 
  Flame, 
  Medal,
  TrendingUp,
  Crown,
  Zap,
  Award,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CallerScore {
  id: string;
  user_id: string;
  total_points: number;
  level: number;
  confirmed_orders: number;
  conversion_rate: number;
  streak_days: number;
  best_streak: number;
  last_activity_date: string | null;
}

interface Achievement {
  id: string;
  user_id: string;
  achievement_type: string;
  achievement_name: string;
  description: string | null;
  points_awarded: number;
  earned_at: string;
}

interface LeaderboardEntry {
  user_id: string;
  total_points: number;
  level: number;
  confirmed_orders: number;
  profiles: {
    full_name: string | null;
  } | null;
}

const ACHIEVEMENTS = [
  { type: "first_order", name: "Premier pas", description: "Première commande confirmée", icon: Star, points: 10 },
  { type: "ten_orders", name: "Décollage", description: "10 commandes confirmées", icon: TrendingUp, points: 50 },
  { type: "fifty_orders", name: "Expert", description: "50 commandes confirmées", icon: Medal, points: 100 },
  { type: "hundred_orders", name: "Maître", description: "100 commandes confirmées", icon: Crown, points: 200 },
  { type: "streak_7", name: "Régulier", description: "7 jours consécutifs", icon: Flame, points: 75 },
  { type: "streak_30", name: "Marathonien", description: "30 jours consécutifs", icon: Zap, points: 200 },
  { type: "conversion_50", name: "Performant", description: "50% de taux de conversion", icon: Target, points: 100 },
  { type: "conversion_75", name: "Élite", description: "75% de taux de conversion", icon: Trophy, points: 250 },
];

const LEVELS = [
  { level: 1, name: "Débutant", minPoints: 0, color: "text-gray-500" },
  { level: 2, name: "Apprenti", minPoints: 100, color: "text-blue-500" },
  { level: 3, name: "Confirmé", minPoints: 300, color: "text-green-500" },
  { level: 4, name: "Expert", minPoints: 600, color: "text-purple-500" },
  { level: 5, name: "Maître", minPoints: 1000, color: "text-amber-500" },
  { level: 6, name: "Légende", minPoints: 2000, color: "text-red-500" },
];

export function CallerGamification() {
  const { user } = useAuth();

  // Fetch user's score
  const { data: score, isLoading: scoreLoading } = useQuery({
    queryKey: ["caller-score", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("caller_scores")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as CallerScore | null;
    },
    enabled: !!user?.id,
  });

  // Fetch user's achievements
  const { data: achievements } = useQuery({
    queryKey: ["caller-achievements", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("caller_achievements")
        .select("*")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return data as Achievement[];
    },
    enabled: !!user?.id,
  });

  // Fetch leaderboard
  const { data: leaderboard } = useQuery({
    queryKey: ["caller-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caller_scores")
        .select(`
          user_id,
          total_points,
          level,
          confirmed_orders,
          profiles:user_id(full_name)
        `)
        .order("total_points", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as unknown as LeaderboardEntry[];
    },
  });

  if (scoreLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentLevel = [...LEVELS].reverse().find((l) => (score?.total_points || 0) >= l.minPoints) || LEVELS[0];
  const nextLevel = LEVELS.find((l) => l.minPoints > (score?.total_points || 0));
  const progressToNextLevel = nextLevel 
    ? Math.round(((score?.total_points || 0) - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints) * 100)
    : 100;

  const earnedAchievementTypes = new Set(achievements?.map((a) => a.achievement_type) || []);
  const userRank = leaderboard?.findIndex((l) => l.user_id === user?.id) ?? -1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes Performances</h1>
        <p className="text-muted-foreground">Points, niveaux et récompenses</p>
      </div>

      {/* Level & Points Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br",
                  "from-primary/20 to-primary/40"
                )}>
                  <Trophy className={cn("w-8 h-8", currentLevel.color)} />
                </div>
                <Badge className="absolute -bottom-1 -right-1 text-xs">
                  Niv. {currentLevel.level}
                </Badge>
              </div>
              <div>
                <p className={cn("text-xl font-bold", currentLevel.color)}>
                  {currentLevel.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {score?.total_points || 0} points
                </p>
              </div>
            </div>
            <div className="text-right">
              {userRank >= 0 && (
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <span className="text-2xl font-bold">#{userRank + 1}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Classement</p>
            </div>
          </div>

          {nextLevel && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>{currentLevel.name}</span>
                <span className="text-muted-foreground">
                  {nextLevel.minPoints - (score?.total_points || 0)} pts restants
                </span>
                <span>{nextLevel.name}</span>
              </div>
              <Progress value={progressToNextLevel} className="h-3" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Flame className="w-6 h-6 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">{score?.streak_days || 0}</p>
            <p className="text-xs text-muted-foreground">Jours consécutifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{score?.best_streak || 0}</p>
            <p className="text-xs text-muted-foreground">Meilleure série</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{score?.conversion_rate || 0}%</p>
            <p className="text-xs text-muted-foreground">Conversion</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{earnedAchievementTypes.size}</p>
            <p className="text-xs text-muted-foreground">Badges</p>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="w-5 h-5" />
            Badges & Récompenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ACHIEVEMENTS.map((achievement) => {
              const isEarned = earnedAchievementTypes.has(achievement.type);
              const Icon = achievement.icon;
              
              return (
                <div
                  key={achievement.type}
                  className={cn(
                    "p-4 rounded-lg border text-center transition-all",
                    isEarned 
                      ? "bg-primary/5 border-primary/30" 
                      : "bg-secondary/30 opacity-50"
                  )}
                >
                  <Icon className={cn(
                    "w-8 h-8 mx-auto mb-2",
                    isEarned ? "text-primary" : "text-muted-foreground"
                  )} />
                  <p className="font-medium text-sm">{achievement.name}</p>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                  <Badge variant="outline" className="mt-2 text-xs">
                    +{achievement.points} pts
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Classement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {leaderboard?.map((entry, index) => (
              <div
                key={entry.user_id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg",
                  entry.user_id === user?.id 
                    ? "bg-primary/10 border border-primary/30" 
                    : "bg-secondary/30"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold",
                  index === 0 ? "bg-amber-500 text-white" :
                  index === 1 ? "bg-gray-400 text-white" :
                  index === 2 ? "bg-amber-700 text-white" :
                  "bg-secondary text-muted-foreground"
                )}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {entry.profiles?.full_name || "Utilisateur"}
                    {entry.user_id === user?.id && (
                      <Badge variant="outline" className="ml-2 text-xs">Vous</Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.confirmed_orders} commandes confirmées
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{entry.total_points}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
