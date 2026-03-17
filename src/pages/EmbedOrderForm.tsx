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
  const redirectUrl = searchParams.get('redirect'); // URL de redirection après commande

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
          product_name: data.product_name,
          quantity: data.quantity,
          price: data.price,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Si une URL de redirection est définie, rediriger le client
      if (redirectUrl) {
        // Redirection vers la page de remerciement externe (avec Pixel Facebook, etc.)
        window.top?.location.replace(redirectUrl);
        return;
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
      <div className="min-h-[100svh] sm:min-h-screen flex items-center justify-center p-4 sm:p-6" style={{ backgroundColor: '#faf9f7' }}>
        <div className="w-full sm:max-w-md text-center bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-10">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: `${brandColor}12` }}
          >
            <CheckCircle2 className="w-9 h-9" style={{ color: brandColor }} />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Commande confirmée !
          </h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Merci pour votre commande. Vous recevrez un SMS de confirmation sous peu.
          </p>
          <Button 
            onClick={() => setIsSuccess(false)}
            className="rounded-xl px-6 h-11 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: brandColor }}
          >
            Passer une autre commande
          </Button>
        </div>
      </div>
    );
  }

  const inputClasses = "h-11 sm:h-12 rounded-xl border-gray-200 bg-white text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200 transition-all text-sm";
  const labelClasses = "flex items-center gap-1.5 text-xs font-medium text-gray-500 tracking-wide uppercase";

  return (
    <div className="min-h-[100svh] sm:min-h-screen flex items-center justify-center p-3 sm:p-6" style={{ backgroundColor: '#faf9f7' }}>
      <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Subtle top accent */}
        <div className="h-1 w-full opacity-80" style={{ backgroundColor: brandColor }} />
        
        <div className="px-5 sm:px-7 pt-5 sm:pt-7 pb-1 sm:pb-2">
          {brandName && (
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-1" style={{ color: brandColor }}>
              {brandName}
            </p>
          )}
          <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
            Commander maintenant
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
            Remplissez le formulaire pour passer votre commande
          </p>
        </div>

        <div className="px-5 sm:px-7 pb-5 sm:pb-7 pt-3 sm:pt-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
            {/* Product Selection */}
            <div className="space-y-1.5">
              <Label className={labelClasses}>
                <Package className="w-3.5 h-3.5" style={{ color: brandColor }} />
                Produit
              </Label>
              {preselectedProduct ? (
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="font-medium text-gray-700 text-sm">{preselectedProduct}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {price?.toLocaleString()} FCFA / unité
                  </p>
                </div>
              ) : (
                <Select value={selectedProductName} onValueChange={handleProductChange}>
                  <SelectTrigger className={inputClasses}>
                    <SelectValue placeholder="Sélectionner un produit" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-200">
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.name} className="text-sm">
                        {product.name} — {product.price.toLocaleString()} FCFA
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.product_name && (
                <p className="text-xs text-red-400">{errors.product_name.message}</p>
              )}
            </div>

            {/* Customer Name */}
            <div className="space-y-1.5">
              <Label className={labelClasses}>
                <User className="w-3.5 h-3.5" style={{ color: brandColor }} />
                Nom complet
              </Label>
              <Input
                {...register('client_name')}
                placeholder="Votre nom"
                className={inputClasses}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              {errors.client_name && (
                <p className="text-xs text-red-400">{errors.client_name.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label className={labelClasses}>
                <Phone className="w-3.5 h-3.5" style={{ color: brandColor }} />
                Téléphone
              </Label>
              <Input
                {...register('phone')}
                type="tel"
                placeholder="+225 XX XX XX XX"
                className={inputClasses}
                autoComplete="new-password"
                autoCorrect="off"
                inputMode="numeric"
                data-form-type="other"
                data-lpignore="true"
              />
              {errors.phone && (
                <p className="text-xs text-red-400">{errors.phone.message}</p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label className={labelClasses}>
                <Hash className="w-3.5 h-3.5" style={{ color: brandColor }} />
                Quantité
              </Label>
              <Input
                {...register('quantity', { valueAsNumber: true })}
                type="number"
                min="1"
                className={inputClasses}
                autoComplete="off"
              />
              {errors.quantity && (
                <p className="text-xs text-red-400">{errors.quantity.message}</p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label className={labelClasses}>
                <MapPin className="w-3.5 h-3.5" style={{ color: brandColor }} />
                Adresse de livraison
              </Label>
              <Textarea
                {...register('address')}
                placeholder="Votre adresse complète"
                className="min-h-[70px] sm:min-h-[80px] resize-none rounded-xl border-gray-200 bg-white text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200 transition-all text-sm"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              {errors.address && (
                <p className="text-xs text-red-400">{errors.address.message}</p>
              )}
            </div>

            {/* Hidden price field */}
            <input type="hidden" {...register('price', { valueAsNumber: true })} />

            {/* Total */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total à payer</span>
                <span className="text-lg sm:text-xl font-bold" style={{ color: brandColor }}>
                  {totalAmount.toLocaleString()} FCFA
                </span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-500 text-sm border border-red-100">
                {error}
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 sm:h-13 text-sm sm:text-base font-semibold rounded-xl text-white hover:opacity-90 transition-all shadow-sm"
              style={{ backgroundColor: brandColor }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Envoi en cours...
                </>
              ) : (
                'Confirmer ma commande'
              )}
            </Button>

            <p className="text-[11px] text-center text-gray-400 leading-relaxed">
              En confirmant, vous acceptez nos conditions de vente.
              <br />Paiement à la livraison.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
