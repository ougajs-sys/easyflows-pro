import { useState, useEffect } from 'react';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useFollowUps } from '@/hooks/useFollowUps';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Database } from '@/integrations/supabase/types';

type FollowUpType = Database['public']['Enums']['followup_type'];

const followUpSchema = z.object({
  client_id: z.string().min(1, 'Sélectionnez un client'),
  type: z.enum(['reminder', 'partial_payment', 'rescheduled', 'retargeting']),
  scheduled_at: z.date({ required_error: 'Sélectionnez une date' }),
  notes: z.string().optional(),
});

type FollowUpFormData = z.infer<typeof followUpSchema>;

interface FollowUpFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeOptions: { value: FollowUpType; label: string; description: string }[] = [
  { value: 'reminder', label: 'Rappel', description: 'Rappel général pour le client' },
  { value: 'partial_payment', label: 'Paiement partiel', description: 'Relance pour solde restant' },
  { value: 'rescheduled', label: 'Commande reportée', description: 'Suivi d\'une commande reportée' },
  { value: 'retargeting', label: 'Retargeting', description: 'Réactivation d\'un client inactif' },
];

export function FollowUpForm({ open, onOpenChange }: FollowUpFormProps) {
  const { createFollowUp } = useFollowUps();
  const { clients } = useClients();
  const { user } = useAuth();
  const [clientOpen, setClientOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const form = useForm<FollowUpFormData>({
    resolver: zodResolver(followUpSchema),
    defaultValues: {
      client_id: '',
      type: 'reminder',
      notes: '',
    },
  });

  const onSubmit = async (data: FollowUpFormData) => {
    try {
      await createFollowUp.mutateAsync({
        client_id: data.client_id,
        type: data.type,
        scheduled_at: data.scheduled_at.toISOString(),
        notes: data.notes || null,
        status: 'awaiting_validation' as any,
        created_by: user?.id,
      });
      toast.success('Relance créée avec succès');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erreur lors de la création de la relance');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle relance</DialogTitle>
          <DialogDescription>
            Planifiez une relance pour un client
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Client Selection */}
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Client *</FormLabel>
                  <Popover open={clientOpen} onOpenChange={setClientOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? clients.find(c => c.id === field.value)?.full_name
                            : "Sélectionner un client"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[400px]">
                      <Command>
                        <CommandInput placeholder="Rechercher un client..." />
                        <CommandList>
                          <CommandEmpty>Aucun client trouvé</CommandEmpty>
                          <CommandGroup>
                            {clients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={client.full_name}
                                onSelect={() => {
                                  form.setValue('client_id', client.id);
                                  setClientOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    client.id === field.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{client.full_name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {client.phone} {client.city && `- ${client.city}`}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de relance *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div>{option.label}</div>
                            <div className="text-xs text-muted-foreground">{option.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Scheduled Date */}
            <FormField
              control={form.control}
              name="scheduled_at"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date de relance *</FormLabel>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: fr })
                          ) : (
                            <span>Sélectionner une date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setCalendarOpen(false);
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informations sur la relance..."
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
              <Button type="submit" disabled={createFollowUp.isPending}>
                Créer la relance
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
