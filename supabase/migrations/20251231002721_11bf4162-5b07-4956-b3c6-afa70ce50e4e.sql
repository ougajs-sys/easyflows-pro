-- Renommer la colonne "Administrateur General" en "role" dans user_roles
ALTER TABLE public.user_roles 
RENAME COLUMN "Administrateur General" TO role;