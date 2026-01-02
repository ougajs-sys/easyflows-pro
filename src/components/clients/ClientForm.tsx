import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type Client = Database['public']['Tables']['clients']['Row'];

const clientSchema = z.object({
  full_name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  phone: z.string().min(8, 'Numéro de téléphone invalide'),
  phone_secondary: z.string().optional(),
  city: z.string().optional(),
  zone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
}

export function ClientForm({ open, onOpenChange, client }: ClientFormProps) {
  const { createClient, updateClient } = useClients();
  const { user } = useAuth();
  const isEditing = !!client;

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      phone_secondary: '',
      city: '',
      zone: '',
      address: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (client) {
      form.reset({
        full_name: client.full_name,
        phone: client.phone,
        phone_secondary: client.phone_secondary || '',
        city: client.city || '',
        zone: client.zone || '',
        address: client.address || '',
        notes: client.notes || '',
      });
    } else {
      form.reset({
        full_name: '',
        phone: '',
        phone_secondary: '',
        city: '',
        zone: '',
        address: '',
        notes: '',
      });
    }
  }, [client, form]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      if (isEditing && client) {
        await updateClient.mutateAsync({
          id: client.id,
          ...data,
        });
        toast.success('Client modifié avec succès');
      } else {
        await createClient.mutateAsync({
          full_name: data.full_name,
          phone: data.phone,
          phone_secondary: data.phone_secondary || null,
          city: data.city || null,
          zone: data.zone || null,
          address: data.address || null,
          notes: data.notes || null,
          created_by: user?.id,
        });
        toast.success('Client créé avec succès');
      }
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Erreur lors de la modification' : 'Erreur lors de la création');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifiez les informations du client'
              : 'Ajoutez un nouveau client à votre base'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom complet *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nom du client" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone principal *</FormLabel>
                    <FormControl>
                      <Input placeholder="06XXXXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_secondary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone secondaire</FormLabel>
                    <FormControl>
                      <Input placeholder="06XXXXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville</FormLabel>
                    <FormControl>
                      <Input placeholder="Casablanca" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone / Quartier</FormLabel>
                    <FormControl>
                      <Input placeholder="Maarif" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse complète</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Adresse de livraison..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes sur le client..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createClient.isPending || updateClient.isPending}>
                {isEditing ? 'Enregistrer' : 'Créer le client'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
