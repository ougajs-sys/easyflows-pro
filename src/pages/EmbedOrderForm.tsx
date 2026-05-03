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

  const fontStack = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  if (isSuccess) {
    return (
      <div className="flex items-center justify-center p-3 sm:p-5" style={{ fontFamily: fontStack }}>
        <div className="w-full max-w-[440px] text-center bg-white rounded-2xl shadow-[0_4px_24px_rgba(15,23,42,0.06)] border border-gray-100 p-6 sm:p-8">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${brandColor}15` }}
          >
            <CheckCircle2 className="w-8 h-8" style={{ color: brandColor }} />
          </div>
          <h2 className="text-[19px] font-bold text-gray-900 mb-1.5">
            Commande confirmée !
          </h2>
          <p className="text-[15px] text-gray-500 mb-5 leading-relaxed">
            Merci ! Vous recevrez un SMS de confirmation sous peu.
          </p>
          <Button
            onClick={() => setIsSuccess(false)}
            className="rounded-xl px-6 h-12 text-[15px] font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: brandColor }}
          >
            Passer une autre commande
          </Button>
        </div>
      </div>
    );
  }

  // Compact, mobile-first, readable design.
  // Inputs use 16px font to prevent iOS zoom + touch-friendly heights.
  const inputClasses = "h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-offset-0 transition-all text-[16px]";
  const labelClasses = "flex items-center gap-1.5 text-[14px] font-semibold text-gray-700 mb-1.5";

  return (
    <div
      className="flex items-center justify-center p-2 sm:p-4"
      style={{ fontFamily: fontStack }}
    >
      <div
        className="w-full max-w-[440px] bg-white rounded-2xl shadow-[0_4px_24px_rgba(15,23,42,0.06)] border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={{ ['--tw-ring-color' as any]: `${brandColor}40` }}
      >
        {/* Header */}
        <div
          className="px-5 pt-5 pb-4 border-b border-gray-100"
          style={{ background: `linear-gradient(135deg, ${brandColor}08 0%, transparent 100%)` }}
        >
          {brandName && (
            <p className="text-[11px] font-bold tracking-[0.15em] uppercase mb-1" style={{ color: brandColor }}>
              {brandName}
            </p>
          )}
          <h1 className="text-[20px] sm:text-[22px] font-bold text-gray-900 tracking-tight leading-tight">
            Commander maintenant
          </h1>
          <p className="text-[14px] text-gray-500 mt-1">
            Livraison rapide • Paiement à la réception
          </p>
        </div>

        <div className="px-5 py-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" autoComplete="off">
            {/* Product Selection */}
            <div>
              <Label className={labelClasses}>
                <Package className="w-4 h-4" style={{ color: brandColor }} />
                Produit
              </Label>
              {preselectedProduct ? (
                <div
                  className="p-3 rounded-xl border"
                  style={{ backgroundColor: `${brandColor}08`, borderColor: `${brandColor}25` }}
                >
                  <p className="font-semibold text-gray-900 text-[15px]">{preselectedProduct}</p>
                  <p className="text-[13px] text-gray-500 mt-0.5">
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
                      <SelectItem key={product.id} value={product.name} className="text-[15px] text-gray-700">
                        {product.name} — {product.price.toLocaleString()} FCFA
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.product_name && (
                <p className="text-[12px] text-red-500 mt-1">{errors.product_name.message}</p>
              )}
            </div>

            {/* Customer Name */}
            <div>
              <Label className={labelClasses}>
                <User className="w-4 h-4" style={{ color: brandColor }} />
                Nom complet
              </Label>
              <Input
                {...register('client_name')}
                placeholder="Votre nom"
                className={inputClasses}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="words"
                spellCheck="false"
              />
              {errors.client_name && (
                <p className="text-[12px] text-red-500 mt-1">{errors.client_name.message}</p>
              )}
            </div>

            {/* Phone + Quantity (2 cols on all sizes for compactness) */}
            <div className="grid grid-cols-[1fr_90px] gap-3">
              <div>
                <Label className={labelClasses}>
                  <Phone className="w-4 h-4" style={{ color: brandColor }} />
                  Téléphone
                </Label>
                <Input
                  {...register('phone')}
                  type="tel"
                  placeholder="+225 ..."
                  className={inputClasses}
                  autoComplete="new-password"
                  autoCorrect="off"
                  inputMode="numeric"
                  data-form-type="other"
                  data-lpignore="true"
                />
                {errors.phone && (
                  <p className="text-[12px] text-red-500 mt-1">{errors.phone.message}</p>
                )}
              </div>
              <div>
                <Label className={labelClasses}>
                  <Hash className="w-4 h-4" style={{ color: brandColor }} />
                  Qté
                </Label>
                <Input
                  {...register('quantity', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  className={`${inputClasses} text-center font-semibold`}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <Label className={labelClasses}>
                <MapPin className="w-4 h-4" style={{ color: brandColor }} />
                Adresse de livraison
              </Label>
              <Textarea
                {...register('address')}
                placeholder="Quartier, ville, point de repère..."
                className="min-h-[60px] resize-none rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 transition-all text-[16px] py-2.5"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              {errors.address && (
                <p className="text-[12px] text-red-500 mt-1">{errors.address.message}</p>
              )}
            </div>

            {/* Hidden price field */}
            <input type="hidden" {...register('price', { valueAsNumber: true })} />

            {/* Total */}
            <div
              className="p-3.5 rounded-xl flex justify-between items-center"
              style={{ backgroundColor: `${brandColor}0d`, border: `1px solid ${brandColor}25` }}
            >
              <span className="text-[14px] font-medium text-gray-700">Total</span>
              <span className="text-[20px] font-bold" style={{ color: brandColor }}>
                {totalAmount.toLocaleString()} FCFA
              </span>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-[13px] border border-red-100">
                {error}
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-13 min-h-[52px] text-[16px] font-bold rounded-xl text-white hover:opacity-95 transition-all shadow-sm active:scale-[0.99]"
              style={{ backgroundColor: brandColor, boxShadow: `0 4px 14px ${brandColor}40` }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Envoi en cours...
                </>
              ) : (
                '✓ Confirmer ma commande'
              )}
            </Button>

            <p className="text-[12px] text-center text-gray-500 leading-relaxed">
              🔒 Paiement à la livraison • Vos données sont protégées
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
