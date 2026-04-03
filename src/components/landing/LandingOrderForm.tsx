import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, ShoppingCart } from "lucide-react";

const orderSchema = z.object({
  full_name: z.string().min(2, "Le nom est requis"),
  phone: z.string().min(8, "Le numéro de téléphone est requis"),
  quantity: z.coerce.number().int().min(1, "Minimum 1"),
  delivery_address: z.string().min(3, "L'adresse est requise"),
  notes: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface LandingOrderFormProps {
  productId: string;
  productName: string;
  price: number;
  brandColor?: string;
  onOrderSuccess: (orderId: string, total: number) => void;
}

export function LandingOrderForm({
  productId,
  productName,
  price,
  brandColor = "#2563eb",
  onOrderSuccess,
}: LandingOrderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      quantity: 1,
      delivery_address: "",
      notes: "",
    },
  });

  const quantity = form.watch("quantity");
  const total = price * (quantity || 1);

  const handleSubmit = async (data: OrderFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/webhook-orders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_name: data.full_name,
            client_phone: data.phone,
            product_id: productId,
            product_name: productName,
            quantity: data.quantity,
            unit_price: price,
            total_amount: total,
            delivery_address: data.delivery_address,
            notes: data.notes || "",
            source: "landing_page",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Erreur lors de la commande");
      }

      const result = await response.json();
      onOrderSuccess(result.order?.id || result.order_id || result.id || crypto.randomUUID(), total);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("fr-FR").format(p) + " FCFA";

  return (
    <div className="w-full max-w-lg mx-auto px-1">
      <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 border">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" style={{ color: brandColor }} />
          Commander maintenant
        </h2>
        <p className="text-sm text-gray-500 mb-5 sm:mb-6">
          {productName} — {formatPrice(price)} / unité
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 text-sm">Nom complet *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Votre nom"
                      className="text-base h-12 sm:h-10 sm:text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 text-sm">Téléphone *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="07 XX XX XX XX"
                      type="tel"
                      className="text-base h-12 sm:h-10 sm:text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 text-sm">Quantité *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      className="text-base h-12 sm:h-10 sm:text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="delivery_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 text-sm">Adresse de livraison *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Quartier, ville..."
                      className="text-base h-12 sm:h-10 sm:text-sm"
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
                  <FormLabel className="text-gray-700 text-sm">Notes (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Instructions spéciales..."
                      rows={2}
                      className="text-base sm:text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Total */}
            <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-gray-50 border">
              <span className="font-medium text-gray-700">Total</span>
              <span className="text-lg font-bold" style={{ color: brandColor }}>
                {formatPrice(total)}
              </span>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 sm:h-12 text-base font-semibold text-white rounded-xl"
              style={{ backgroundColor: brandColor }}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <ShoppingCart className="w-5 h-5 mr-2" />
              )}
              {isSubmitting ? "Traitement..." : `Commander — ${formatPrice(total)}`}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
