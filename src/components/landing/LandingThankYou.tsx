import { useEffect } from "react";
import { CheckCircle, Phone } from "lucide-react";
import { usePixelTrack } from "./FacebookPixel";

interface LandingThankYouProps {
  orderId: string;
  total: number;
  productName: string;
  brandColor?: string;
}

export function LandingThankYou({
  orderId,
  total,
  productName,
  brandColor = "#2563eb",
}: LandingThankYouProps) {
  const { trackEvent } = usePixelTrack();

  useEffect(() => {
    trackEvent("Purchase", { value: total, currency: "XOF", content_name: productName }, orderId);
  }, [orderId, total, productName, trackEvent]);

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("fr-FR").format(p) + " FCFA";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-6 md:p-8 max-w-md w-full text-center mx-2">
        <div
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: `${brandColor}20` }}
        >
          <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: brandColor }} />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          Merci pour votre commande !
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mb-6">
          Votre commande de <strong>{productName}</strong> d'un montant de{" "}
          <strong style={{ color: brandColor }}>{formatPrice(total)}</strong> a été
          enregistrée avec succès.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-500">Référence de commande</p>
          <p className="font-mono text-sm font-medium text-gray-900 mt-1">
            {orderId.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="flex items-center gap-2 justify-center text-sm text-gray-500">
          <Phone className="w-4 h-4" />
          <span>Un conseiller vous contactera sous peu</span>
        </div>
      </div>
    </div>
  );
}
