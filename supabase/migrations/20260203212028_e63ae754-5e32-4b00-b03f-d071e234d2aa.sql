-- Ajouter les tables manquantes à la publication Realtime
-- Cela permet la synchronisation temps réel sur tous les tableaux de bord

ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_persons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collected_revenues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.revenue_deposits;