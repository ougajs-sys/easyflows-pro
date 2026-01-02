-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create SMS templates table
CREATE TABLE public.sms_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('promotion', 'relance', 'notification', 'custom')),
  message TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

-- Policies for templates
CREATE POLICY "Authenticated users can view templates" 
ON public.sms_templates 
FOR SELECT 
USING (true);

CREATE POLICY "Admins and supervisors can manage templates" 
ON public.sms_templates 
FOR ALL 
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'superviseur'));

-- Add trigger for updated_at
CREATE TRIGGER update_sms_templates_updated_at
  BEFORE UPDATE ON public.sms_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.sms_templates (name, category, message, variables) VALUES
-- Promotions
('Promo Flash', 'promotion', 'PROMO FLASH! -{{reduction}}% sur tous nos produits jusqu''au {{date_fin}}. Commandez maintenant! {{lien}}', ARRAY['reduction', 'date_fin', 'lien']),
('Nouveau Produit', 'promotion', 'Découvrez notre nouveau produit: {{produit}}! Disponible dès maintenant. {{lien}}', ARRAY['produit', 'lien']),
('Offre Spéciale VIP', 'promotion', 'Cher client VIP, profitez de -{{reduction}}% exclusif avec le code {{code}}. Valable jusqu''au {{date_fin}}.', ARRAY['reduction', 'code', 'date_fin']),
('Soldes', 'promotion', 'Les SOLDES sont là! Jusqu''à -{{reduction}}% sur une sélection de produits. Foncez! {{lien}}', ARRAY['reduction', 'lien']),

-- Relances
('Relance Panier', 'relance', 'Bonjour {{prenom}}! Vous avez oublié quelque chose? Votre commande vous attend. Finalisez-la maintenant! {{lien}}', ARRAY['prenom', 'lien']),
('Client Inactif', 'relance', 'Vous nous manquez {{prenom}}! Revenez profiter de -{{reduction}}% sur votre prochaine commande avec le code {{code}}.', ARRAY['prenom', 'reduction', 'code']),
('Relance Paiement', 'relance', 'Rappel: Votre commande {{numero}} est en attente de paiement. Montant restant: {{montant}} DH. Merci de régulariser.', ARRAY['numero', 'montant']),
('Satisfaction', 'relance', 'Bonjour {{prenom}}! Comment s''est passée votre dernière commande? Donnez-nous votre avis: {{lien}}', ARRAY['prenom', 'lien']),

-- Notifications
('Confirmation Commande', 'notification', 'Commande {{numero}} confirmée! Montant: {{montant}} DH. Livraison prévue le {{date}}. Merci!', ARRAY['numero', 'montant', 'date']),
('Livraison En Cours', 'notification', 'Votre commande {{numero}} est en cours de livraison! Notre livreur arrivera bientôt. Contact: {{telephone}}', ARRAY['numero', 'telephone']),
('Livraison Effectuée', 'notification', 'Commande {{numero}} livrée avec succès! Merci pour votre confiance. A bientôt!', ARRAY['numero']),
('Rappel RDV', 'notification', 'Rappel: Livraison prévue demain {{date}} entre {{heure_debut}} et {{heure_fin}}. Soyez disponible!', ARRAY['date', 'heure_debut', 'heure_fin']);