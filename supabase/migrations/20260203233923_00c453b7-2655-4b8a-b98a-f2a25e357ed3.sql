-- Fix chat contacts visibility: allow selecting roles/profiles for users that can_chat() with you

-- user_roles: allow reading confirmed roles for chat-eligible contacts
DROP POLICY IF EXISTS "user_roles_select_chat_contacts" ON public.user_roles;
CREATE POLICY "user_roles_select_chat_contacts"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  confirmed = true
  AND (
    user_id = auth.uid()
    OR public.can_chat(auth.uid(), user_id)
    OR public.can_chat(user_id, auth.uid())
  )
);

-- profiles: allow reading profiles for chat-eligible contacts
DROP POLICY IF EXISTS "profiles_select_chat_contacts" ON public.profiles;
CREATE POLICY "profiles_select_chat_contacts"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.can_chat(auth.uid(), id)
  OR public.can_chat(id, auth.uid())
);
