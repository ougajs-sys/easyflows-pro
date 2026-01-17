import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Loader2, Package, User, Phone, MapPin, Hash } from 'lucide-react';

const orderSchema = z.object({
  client_name: z.string().min(2, 'Nom requis (min 2 caractères)'),
  phone: z.string().min(8, 'Téléphone requis (min 8 chiffres)'),
  address: z.string().min(5, 'Adresse requise (min 5 caractères)'),
  city: z.string().optional(),
  product_name: z.string().min(1, 'Produit requis'),
  quantity: z.number().min(1, 'Quantité minimum: 1'),
  price: z.number().min(0, 'Prix invalide'),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
}

export default function EmbedOrderForm() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preselectedProduct = searchParams.get('product');
  const preselectedPrice = searchParams.get('price');
  const brandColor = searchParams.get('color') || '#8B5CF6';
  const brandName = searchParams.get('brand') || '';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      quantity: 1,
      price: preselectedPrice ? parseFloat(preselectedPrice) : 0,
      product_name: preselectedProduct || '',
    },
  });

  const selectedProductName = watch('product_name');
  const quantity = watch('quantity');
  const price = watch('price');
  const totalAmount = (quantity || 1) * (price || 0);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (preselectedProduct) {
      setValue('product_name', preselectedProduct);
    }
    if (preselectedPrice) {
      setValue('price', parseFloat(preselectedPrice));
    }
  }, [preselectedProduct, preselectedPrice, setValue]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, stock, is_active')
      .eq('is_active', true)
      .gt('stock', 0)
      .order('name');

    if (!error && data) {
      setProducts(data);
      if (!preselectedProduct && data.length > 0) {
        setValue('product_name', data[0].name);
        setValue('price', data[0].price);
      }
    }
  };

  const handleProductChange = (productName: string) => {
    setValue('product_name', productName);
    const product = products.find(p => p.name === productName);
    if (product) {
      setValue('price', product.price);
    }
  };

  const onSubmit = async (data: OrderFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await supabase.functions.invoke('webhook-orders', {
        body: {
          client_name: data.client_name,
          phone: data.phone,
          address: data.address,
          city: data.city || '',
          product_name: data.product_name,
          quantity: data.quantity,
          price: data.price,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setIsSuccess(true);
      reset();
    } catch (err) {
      console.error('Order submission error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la soumission');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-emerald-100">
        <Card className="w-full max-w-md text-center shadow-xl border-0">
          <CardContent className="pt-12 pb-8">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${brandColor}20` }}
            >
              <CheckCircle2 className="w-12 h-12" style={{ color: brandColor }} />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Commande confirmée !
            </h2>
            <p className="text-muted-foreground mb-6">
              Merci pour votre commande. Vous recevrez un SMS de confirmation sous peu.
            </p>
            <Button 
              onClick={() => setIsSuccess(false)}
              style={{ backgroundColor: brandColor }}
              className="hover:opacity-90"
            >
              Passer une autre commande
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-lg shadow-xl border-0 overflow-hidden">
        <div 
          className="h-2 w-full" 
          style={{ backgroundColor: brandColor }}
        />
        <CardHeader className="space-y-1 pb-4">
          {brandName && (
            <p className="text-sm font-medium" style={{ color: brandColor }}>
              {brandName}
            </p>
          )}
          <CardTitle className="text-2xl font-bold">
            Commander maintenant
          </CardTitle>
          <CardDescription>
            Remplissez le formulaire pour passer votre commande
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" autoComplete="off">
            {/* Product Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Package className="w-4 h-4" style={{ color: brandColor }} />
                Produit
              </Label>
              {preselectedProduct ? (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="font-medium">{preselectedProduct}</p>
                  <p className="text-sm text-muted-foreground">
                    {price?.toLocaleString()} FCFA / unité
                  </p>
                </div>
              ) : (
                <Select
                  value={selectedProductName}
                  onValueChange={handleProductChange}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Sélectionner un produit" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.name}>
                        {product.name} - {product.price.toLocaleString()} FCFA
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.product_name && (
                <p className="text-sm text-destructive">{errors.product_name.message}</p>
              )}
            </div>

            {/* Customer Name */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <User className="w-4 h-4" style={{ color: brandColor }} />
                Nom complet
              </Label>
              <Input
                {...register('client_name')}
                placeholder="Votre nom"
                className="h-12"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              {errors.client_name && (
                <p className="text-sm text-destructive">{errors.client_name.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Phone className="w-4 h-4" style={{ color: brandColor }} />
                Téléphone
              </Label>
              <Input
                {...register('phone')}
                type="tel"
                placeholder="+225 XX XX XX XX"
                className="h-12"
                autoComplete="new-password"
                autoCorrect="off"
                inputMode="numeric"
                data-form-type="other"
                data-lpignore="true"
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Hash className="w-4 h-4" style={{ color: brandColor }} />
                Quantité
              </Label>
              <Input
                {...register('quantity', { valueAsNumber: true })}
                type="number"
                min="1"
                className="h-12"
                autoComplete="off"
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="w-4 h-4" style={{ color: brandColor }} />
                Adresse de livraison
              </Label>
              <Textarea
                {...register('address')}
                placeholder="Votre adresse complète"
                className="min-h-[80px] resize-none"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
              )}
            </div>

            {/* City (optional) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Ville (optionnel)
              </Label>
              <Input
                {...register('city')}
                placeholder="Abidjan, Bouaké..."
                className="h-12"
                autoComplete="off"
                autoCorrect="off"
              />
            </div>

            {/* Hidden price field */}
            <input type="hidden" {...register('price', { valueAsNumber: true })} />

            {/* Total */}
            <div 
              className="p-4 rounded-xl"
              style={{ backgroundColor: `${brandColor}10` }}
            >
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total à payer</span>
                <span 
                  className="text-2xl font-bold"
                  style={{ color: brandColor }}
                >
                  {totalAmount.toLocaleString()} FCFA
                </span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 text-lg font-semibold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: brandColor }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Envoi en cours...
                </>
              ) : (
                'Confirmer ma commande'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              En confirmant, vous acceptez nos conditions de vente.
              <br />Paiement à la livraison.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
