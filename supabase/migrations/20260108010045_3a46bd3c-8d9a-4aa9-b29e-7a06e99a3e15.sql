-- ============================================
-- 1. TABLE MESSAGES POUR CHAT TEMPS RÉEL
-- ============================================
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID,
  channel VARCHAR(100) NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
  order_id UUID REFERENCES public.orders(id),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies for messages
CREATE POLICY "Users can view messages in their channels"
ON public.messages FOR SELECT
USING (
  auth.uid() = sender_id OR 
  auth.uid() = receiver_id OR
  receiver_id IS NULL
);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
USING (auth.uid() = sender_id);

-- Enable realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- ============================================
-- 2. TABLE TRAINING_RESOURCES
-- ============================================
CREATE TABLE public.training_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('video', 'document', 'quiz')),
  category VARCHAR(100) NOT NULL,
  url TEXT,
  youtube_id VARCHAR(50),
  duration VARCHAR(50),
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_resources ENABLE ROW LEVEL SECURITY;

-- Everyone can view training resources
CREATE POLICY "Everyone can view training resources"
ON public.training_resources FOR SELECT
USING (is_active = true);

-- Only admins can manage training resources
CREATE POLICY "Admins can manage training resources"
ON public.training_resources FOR ALL
USING (public.has_role(auth.uid(), 'administrateur'));

-- ============================================
-- 3. TABLE USER_TRAINING_PROGRESS
-- ============================================
CREATE TABLE public.user_training_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  resource_id UUID NOT NULL REFERENCES public.training_resources(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  progress_percent INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, resource_id)
);

-- Enable RLS
ALTER TABLE public.user_training_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
ON public.user_training_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.user_training_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify their own progress"
ON public.user_training_progress FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================
-- 4. TABLE CALLER_SCORES (GAMIFICATION)
-- ============================================
CREATE TABLE public.caller_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  confirmed_orders INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.caller_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all scores"
ON public.caller_scores FOR SELECT
USING (true);

CREATE POLICY "Users can update their own score"
ON public.caller_scores FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own score"
ON public.caller_scores FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 5. TABLE CALLER_ACHIEVEMENTS (BADGES)
-- ============================================
CREATE TABLE public.caller_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_type VARCHAR(100) NOT NULL,
  achievement_name VARCHAR(255) NOT NULL,
  description TEXT,
  points_awarded INTEGER DEFAULT 0,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_type)
);

-- Enable RLS
ALTER TABLE public.caller_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all achievements"
ON public.caller_achievements FOR SELECT
USING (true);

CREATE POLICY "System can insert achievements"
ON public.caller_achievements FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 6. TABLE SCHEDULED_FOLLOWUPS (Pour automatisation)
-- ============================================
CREATE TABLE public.scheduled_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  followup_type VARCHAR(50) DEFAULT 'call',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'cancelled')),
  sms_content TEXT,
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view followups"
ON public.scheduled_followups FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create followups"
ON public.scheduled_followups FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update followups"
ON public.scheduled_followups FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Enable realtime for messages and followups
ALTER TABLE public.scheduled_followups REPLICA IDENTITY FULL;

-- ============================================
-- 7. INSERT SAMPLE TRAINING DATA
-- ============================================
INSERT INTO public.training_resources (title, description, type, category, youtube_id, duration, order_index) VALUES
('Introduction à la plateforme', 'Découvrez les fonctionnalités principales de la plateforme', 'video', 'bases', 'dQw4w9WgXcQ', '5 min', 1),
('Comment confirmer une commande', 'Guide étape par étape pour confirmer efficacement', 'video', 'bases', 'dQw4w9WgXcQ', '8 min', 2),
('Techniques de vente par téléphone', 'Apprenez les meilleures techniques d''appel', 'video', 'avance', 'dQw4w9WgXcQ', '12 min', 3),
('Gestion des objections clients', 'Comment répondre aux objections courantes', 'video', 'avance', 'dQw4w9WgXcQ', '10 min', 4),
('Guide des statuts de commande', 'Document expliquant tous les statuts', 'document', 'bases', NULL, '3 min', 5),
('Politique de relance', 'Procédures de relance des clients', 'document', 'procedures', NULL, '5 min', 6),
('Quiz - Les bases', 'Testez vos connaissances de base', 'quiz', 'bases', NULL, '10 min', 7),
('Quiz - Techniques avancées', 'Évaluez votre maîtrise des techniques', 'quiz', 'avance', NULL, '15 min', 8);

-- ============================================
-- 8. FUNCTION TO UPDATE CALLER SCORES
-- ============================================
CREATE OR REPLACE FUNCTION public.update_caller_score()
RETURNS TRIGGER AS $$
DECLARE
  caller_user_id UUID;
  current_confirmed INTEGER;
  current_total INTEGER;
  new_rate DECIMAL(5,2);
  points_to_add INTEGER := 0;
BEGIN
  -- Get the caller who handled this order
  caller_user_id := NEW.created_by;
  
  IF caller_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate points based on status change
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    points_to_add := 10;
  ELSIF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    points_to_add := 20;
  END IF;
  
  -- Get current stats
  SELECT COUNT(*) FILTER (WHERE status = 'confirmed' OR status = 'delivered'),
         COUNT(*)
  INTO current_confirmed, current_total
  FROM public.orders
  WHERE created_by = caller_user_id;
  
  -- Calculate conversion rate
  IF current_total > 0 THEN
    new_rate := (current_confirmed::DECIMAL / current_total) * 100;
  ELSE
    new_rate := 0;
  END IF;
  
  -- Upsert caller score
  INSERT INTO public.caller_scores (user_id, total_points, confirmed_orders, conversion_rate, last_activity_date)
  VALUES (caller_user_id, points_to_add, current_confirmed, new_rate, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = public.caller_scores.total_points + points_to_add,
    confirmed_orders = current_confirmed,
    conversion_rate = new_rate,
    last_activity_date = CURRENT_DATE,
    streak_days = CASE 
      WHEN public.caller_scores.last_activity_date = CURRENT_DATE - INTERVAL '1 day' 
      THEN public.caller_scores.streak_days + 1
      WHEN public.caller_scores.last_activity_date = CURRENT_DATE 
      THEN public.caller_scores.streak_days
      ELSE 1
    END,
    best_streak = GREATEST(public.caller_scores.best_streak, 
      CASE 
        WHEN public.caller_scores.last_activity_date = CURRENT_DATE - INTERVAL '1 day' 
        THEN public.caller_scores.streak_days + 1
        ELSE public.caller_scores.streak_days
      END
    ),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for score updates
CREATE TRIGGER update_caller_score_trigger
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_caller_score();

-- Add triggers for updated_at
CREATE TRIGGER update_training_resources_updated_at
BEFORE UPDATE ON public.training_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_training_progress_updated_at
BEFORE UPDATE ON public.user_training_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_caller_scores_updated_at
BEFORE UPDATE ON public.caller_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_followups_updated_at
BEFORE UPDATE ON public.scheduled_followups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();