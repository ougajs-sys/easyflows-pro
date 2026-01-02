import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { usePayments } from '@/hooks/usePayments';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type PaymentMethod = Database['public']['Enums']['payment_method'];

const paymentSchema = z.object({
  order_id: z.string().min(1, 'Sélectionnez une commande'),
  amount: z.number().min(1, 'Le montant doit être supérieur à 0'),
  method: z.enum(['cash', 'mobile_money', 'card', 'transfer']),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const methodOptions: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Espèces' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'card', label: 'Carte bancaire' },
  { value: 'transfer', label: 'Virement bancaire' },
];

export function PaymentForm({ open, onOpenChange }: PaymentFormProps) {
  const { createPayment, pendingOrders } = usePayments();
  const { user } = useAuth();
  const [orderOpen, setOrderOpen] = useState(false);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      order_id: '',
      amount: 0,
      method: 'cash',
      reference: '',
      notes: '',
    },
  });

  const selectedOrderId = form.watch('order_id');
  const selectedOrder = pendingOrders.find(o => o.id === selectedOrderId);
  const maxAmount = selectedOrder ? Number(selectedOrder.amount_due || 0) : 0;

  const onSubmit = async (data: PaymentFormData) => {
    try {
      await createPayment.mutateAsync({
        order_id: data.order_id,
        amount: data.amount,
        method: data.method,
        status: 'completed',
        reference: data.reference || null,
        notes: data.notes || null,
        received_by: user?.id,
      });
      toast.success('Paiement enregistré avec succès');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement du paiement');
    }
  };

  const handleOrderSelect = (orderId: string) => {
    form.setValue('order_id', orderId);
    const order = pendingOrders.find(o => o.id === orderId);
    if (order) {
      form.setValue('amount', Number(order.amount_due || 0));
    }
    setOrderOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
          <DialogDescription>
            Ajoutez un paiement pour une commande existante
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Order Selection */}
            <FormField
              control={form.control}
              name="order_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Commande *</FormLabel>
                  <Popover open={orderOpen} onOpenChange={setOrderOpen}>
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
                            ? pendingOrders.find(o => o.id === field.value)?.order_number
                            : "Sélectionner une commande"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[400px]">
                      <Command>
                        <CommandInput placeholder="Rechercher une commande..." />
                        <CommandList>
                          <CommandEmpty>Aucune commande avec montant dû</CommandEmpty>
                          <CommandGroup>
                            {pendingOrders.map((order) => (
                              <CommandItem
                                key={order.id}
                                value={order.order_number || order.id}
                                onSelect={() => handleOrderSelect(order.id)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    order.id === field.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{order.order_number}</span>
                                    <Badge variant="destructive" className="text-xs">
                                      {Number(order.amount_due || 0).toLocaleString()} DH
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {order.client?.full_name} - {order.client?.phone}
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

            {/* Selected Order Info */}
            {selectedOrder && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span>Montant restant dû: </span>
                  <Badge variant="destructive">{maxAmount.toLocaleString()} DH</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Total: {Number(selectedOrder.total_amount).toLocaleString()} DH | 
                  Payé: {Number(selectedOrder.amount_paid).toLocaleString()} DH
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant (DH) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={maxAmount || undefined}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Method */}
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Méthode de paiement *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {methodOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Reference */}
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Référence (optionnel)</FormLabel>
                  <FormControl>
                    <Input placeholder="Numéro de transaction, reçu..." {...field} />
                  </FormControl>
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
                      placeholder="Informations supplémentaires..."
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
              <Button type="submit" disabled={createPayment.isPending}>
                Enregistrer le paiement
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
