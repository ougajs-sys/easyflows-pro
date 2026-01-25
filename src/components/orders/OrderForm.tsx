import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients } from '@/hooks/useClients';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { useToast } from '@/hooks/use-toast';
import { Plus, UserPlus } from 'lucide-react';

const orderSchema = z.object({
  client_id: z.string().min(1, 'Client requis'),
  product_id: z.string().min(1, 'Produit requis'),
  quantity: z.coerce.number().min(1, 'Quantité minimum 1'),
  unit_price: z.coerce.number().min(0, 'Prix invalide'),
  amount_paid: z.coerce.number().min(0, 'Montant invalide'),
  delivery_address: z.string().optional(),
  delivery_notes: z.string().optional(),
});

const newClientSchema = z.object({
  full_name: z.string().min(2, 'Nom requis'),
  phone: z.string().min(8, 'Téléphone requis'),
  address: z.string().optional(),
  city: z.string().optional(),
  zone: z.string().optional(),
});

type NewClientData = {
  full_name: string;
  phone: string;
  address?: string;
  city?: string;
  zone?: string;
};

type OrderFormData = z.infer<typeof orderSchema>;

interface OrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderForm({ open, onOpenChange }: OrderFormProps) {
  const { clients, createClient } = useClients();
  const { products } = useProducts();
  const { createOrder } = useOrders();
  const { toast } = useToast();
  const [showNewClient, setShowNewClient] = useState(false);

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      quantity: 1,
      unit_price: 0,
      amount_paid: 0,
      delivery_address: '',
      delivery_notes: '',
    },
  });

  const clientForm = useForm<NewClientData>({
    resolver: zodResolver(newClientSchema),
  });

  const selectedProductId = form.watch('product_id');
  const quantity = form.watch('quantity');
  const unitPrice = form.watch('unit_price');

  // Auto-fill price when product is selected
  useEffect(() => {
    if (selectedProductId) {
      const product = products.find(p => p.id === selectedProductId);
      if (product) {
        form.setValue('unit_price', Number(product.price));
      }
    }
  }, [selectedProductId, products, form]);

  const totalAmount = quantity * unitPrice;
  const amountPaid = form.watch('amount_paid');
  const amountDue = totalAmount - (amountPaid || 0);

  const onSubmit = async (data: OrderFormData) => {
    try {
      await createOrder.mutateAsync({
        client_id: data.client_id,
        product_id: data.product_id,
        quantity: data.quantity,
        unit_price: data.unit_price,
        total_amount: totalAmount,
        amount_paid: data.amount_paid,
        delivery_address: data.delivery_address,
        delivery_notes: data.delivery_notes,
        status: 'pending',
      });

      toast({
        title: 'Commande créée',
        description: 'La commande a été enregistrée avec succès.',
      });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la commande.',
        variant: 'destructive',
      });
    }
  };

  const onCreateClient = async (data: NewClientData) => {
    try {
      const result = await createClient.mutateAsync({
        full_name: data.full_name,
        phone: data.phone,
        address: data.address,
        city: data.city,
        zone: data.zone,
      });
      form.setValue('client_id', result.id);
      form.setValue('delivery_address', data.address || '');
      setShowNewClient(false);
      clientForm.reset();
      toast({
        title: 'Client créé',
        description: 'Le client a été ajouté avec succès.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le client.',
        variant: 'destructive',
      });
    }
  };

  const activeProducts = products.filter(p => p.is_active && p.stock > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle Commande</DialogTitle>
        </DialogHeader>

        {showNewClient ? (
          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(onCreateClient)} className="space-y-4">
              <FormField
                control={clientForm.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom du client" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={clientForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input placeholder="Numéro de téléphone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={clientForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville</FormLabel>
                      <FormControl>
                        <Input placeholder="Ville" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={clientForm.control}
                  name="zone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zone</FormLabel>
                      <FormControl>
                        <Input placeholder="Zone/Quartier" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={clientForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Adresse complète" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowNewClient(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createClient.isPending}>
                  {createClient.isPending ? 'Création...' : 'Créer le client'}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex gap-2 items-end">
                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Client</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.full_name} - {client.phone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setShowNewClient(true)}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>

              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un produit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {product.price} FCFA (Stock: {product.stock})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantité</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix unitaire (FCFA)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Montant total:</span>
                  <span className="font-semibold">{totalAmount.toLocaleString()} FCFA</span>
                </div>
                <FormField
                  control={form.control}
                  name="amount_paid"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel className="text-sm">Montant payé (FCFA)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} className="w-32 text-right" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-between text-sm border-t pt-2">
                  <span>Reste à payer:</span>
                  <span className={`font-semibold ${amountDue > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {amountDue.toLocaleString()} FCFA
                  </span>
                </div>
              </div>

              <FormField
                control={form.control}
                name="delivery_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse de livraison</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Adresse de livraison" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="delivery_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes de livraison</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Instructions spéciales..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createOrder.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  {createOrder.isPending ? 'Création...' : 'Créer la commande'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
