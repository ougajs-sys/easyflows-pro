
-- 1. role_requests: drop overly permissive INSERT policies, keep only restricted one
DROP POLICY IF EXISTS "self_insert_role_request" ON public.role_requests;
DROP POLICY IF EXISTS "user_own_role_requests_insert" ON public.role_requests;

-- 2. push_log: restrict INSERT to authenticated owners (service_role bypasses RLS)
DROP POLICY IF EXISTS "Service role can insert push logs" ON public.push_log;
CREATE POLICY "Authenticated users can insert own push logs"
  ON public.push_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- 3. caller_achievements: restrict SELECT
DROP POLICY IF EXISTS "Authenticated users can view all achievements" ON public.caller_achievements;
CREATE POLICY "Owner, supervisor and admin can view achievements"
  ON public.caller_achievements FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'superviseur'::app_role)
    OR public.has_role(auth.uid(), 'administrateur'::app_role)
  );

-- 4. rooms / room_members RLS policies
CREATE POLICY "Members can view their rooms"
  ON public.rooms FOR SELECT
  TO authenticated
  USING (id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins and supervisors can manage rooms"
  ON public.rooms FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrateur'::app_role) OR public.has_role(auth.uid(), 'superviseur'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'administrateur'::app_role) OR public.has_role(auth.uid(), 'superviseur'::app_role));

CREATE POLICY "Members can view memberships of their rooms"
  ON public.room_members FOR SELECT
  TO authenticated
  USING (room_id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can join rooms as themselves"
  ON public.room_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins and supervisors manage memberships"
  ON public.room_members FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrateur'::app_role) OR public.has_role(auth.uid(), 'superviseur'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'administrateur'::app_role) OR public.has_role(auth.uid(), 'superviseur'::app_role));

CREATE POLICY "Users can leave rooms themselves"
  ON public.room_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 5. Avatars bucket: make private, restrict reads to authenticated
UPDATE storage.buckets SET public = false WHERE id = 'avatars';
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Authenticated users can view avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

-- 6. Align overloaded has_role to enforce confirmed = true
CREATE OR REPLACE FUNCTION public.has_role(_role app_role, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND confirmed = true
  )
$function$;
