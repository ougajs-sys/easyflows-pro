
-- 1. Fix messages insert policy: self-referencing rm.room_id = rm.room_id
DROP POLICY IF EXISTS "msg_insert" ON public.messages;
CREATE POLICY "msg_insert" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      room_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.room_members rm
        WHERE rm.room_id = messages.room_id
          AND rm.user_id = auth.uid()
      )
    )
  );

-- 2. Fix orders select policy: remove leading "true OR"
DROP POLICY IF EXISTS "orders_select_combined" ON public.orders;
CREATE POLICY "orders_select_combined" ON public.orders
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR delivery_person_id IN (SELECT id FROM public.delivery_persons WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'superviseur')
    OR public.has_role(auth.uid(), 'administrateur')
  );

-- 3. Fix role_requests update: add status check to WITH CHECK
DROP POLICY IF EXISTS "user_own_role_requests_update" ON public.role_requests;
CREATE POLICY "user_own_role_requests_update" ON public.role_requests
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- 4. Fix caller_achievements: restrict to authenticated only
DROP POLICY IF EXISTS "Users can view all achievements" ON public.caller_achievements;
CREATE POLICY "Authenticated users can view all achievements" ON public.caller_achievements
  FOR SELECT TO authenticated
  USING (true);

-- 5. Fix ai_execution_logs: restrict insert to authenticated
DROP POLICY IF EXISTS "System can insert logs" ON public.ai_execution_logs;
CREATE POLICY "Authenticated can insert logs" ON public.ai_execution_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);
