import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, ShoppingCart, X } from "lucide-react";
import { CI_CITIES } from "@/data/healthProducts";

const orderSchema = z.object({
  full_name: z.string().min(2, "Le nom est requis"),
  phone: z.string().min(8, "Le numéro de téléphone est requis"),
  quantity: z.coerce.number().int().min(1, "Minimum 1"),
  city: z.string().min(1, "Choisissez une ville"),
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
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      quantity: 1,
      city: "",
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
      setIsOpen(false);
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
    <>
      {/* Floating CTA Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-2 px-8 py-3.5 rounded-full text-white font-bold text-base shadow-xl hover:scale-105 active:scale-95 transition-all"
        style={{ backgroundColor: brandColor }}
      >
        <ShoppingCart className="w-5 h-5" />
        Commander — {formatPrice(total)}
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/50 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          {/* Modal Card - bottom sheet on mobile, centered on desktop */}
          <div className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-[440px] sm:w-[90%] sm:rounded-2xl bg-white rounded-t-[20px] sm:rounded-b-2xl max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="p-4 sm:p-6">
              {/* Close button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>

              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-0.5 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" style={{ color: brandColor }} />
                Commander maintenant
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mb-4">
                {productName} — {formatPrice(price)} / unité
              </p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2.5 sm:space-y-3">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 text-xs font-semibold">Nom complet *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Votre nom"
                            className="text-base h-10 sm:text-sm"
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
                        <FormLabel className="text-gray-700 text-xs font-semibold">Téléphone *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="07 XX XX XX XX"
                            type="tel"
                            className="text-base h-10 sm:text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2.5">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-gray-700 text-xs font-semibold">Quantité *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              className="text-base h-10 sm:text-sm"
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
                        <FormItem className="flex-[2]">
                          <FormLabel className="text-gray-700 text-xs font-semibold">Adresse *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Quartier, ville..."
                              className="text-base h-10 sm:text-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 text-xs font-semibold">Notes (optionnel)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Instructions spéciales..."
                            className="text-base h-10 sm:text-sm"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Total */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border">
                    <span className="font-medium text-gray-700 text-sm">Total</span>
                    <span className="text-base font-bold" style={{ color: brandColor }}>
                      {formatPrice(total)}
                    </span>
                  </div>

                  {error && (
                    <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg">{error}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 text-sm font-semibold text-white rounded-xl"
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
        </div>
      )}
    </>
  );
}
