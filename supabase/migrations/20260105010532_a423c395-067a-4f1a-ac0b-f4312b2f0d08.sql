-- Créer l'entrée delivery_persons manquante pour jhon
INSERT INTO public.delivery_persons (user_id, status, is_active)
VALUES ('eb9bb052-b352-43e4-9f53-4643247928d8', 'offline', true)
ON CONFLICT (user_id) DO NOTHING;