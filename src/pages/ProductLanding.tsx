import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FacebookPixel, usePixelTrack } from "@/components/landing/FacebookPixel";
import { LandingOrderForm } from "@/components/landing/LandingOrderForm";
import { LandingThankYou } from "@/components/landing/LandingThankYou";
import { buildInjectedFormHtml } from "@/components/landing/buildInjectedFormHtml";
import { Loader2, ShoppingCart } from "lucide-react";

interface LandingProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  is_active: boolean;
  slug: string;
  image_url: string | null;
  landing_headline: string | null;
  landing_description: string | null;
  landing_html: string | null;
  facebook_pixel_id: string | null;
  brand_color: string | null;
}

export default function ProductLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<LandingProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderId: string;
    total: number;
  } | null>(null);

  const { trackEvent } = usePixelTrack();

  useEffect(() => {
    async function fetchProduct() {
      if (!slug) return;
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setProduct(data as LandingProduct);
        if (data.facebook_pixel_id) {
          setTimeout(() => {
            trackEvent("ViewContent", {
              content_name: data.name,
              content_ids: [data.id],
              content_type: "product",
              value: data.price,
              currency: "XOF",
            });
          }, 1000);
        }
      }
      setLoading(false);
    }
    fetchProduct();
  }, [slug]);

  // Listen for postMessage from iframe (custom HTML form submission)
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "order-success") {
        const { orderId, total } = event.data;
        handleOrderSuccess(orderId, total);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [product]);

  const handleOrderSuccess = useCallback(
    async (orderId: string, total: number) => {
      if (!product) return;
      // Fire CAPI server-side
      if (product.facebook_pixel_id) {
        try {
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/facebook-conversions`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pixel_id: product.facebook_pixel_id,
                event_name: "Purchase",
                event_id: orderId,
                value: total,
                currency: "XOF",
                client_user_agent: navigator.userAgent,
                source_url: window.location.href,
              }),
            }
          );
        } catch (e) {
          console.warn("CAPI tracking failed:", e);
        }
      }
      setOrderSuccess({ orderId, total });
    },
    [product]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Produit introuvable</h1>
          <p className="text-gray-500">Ce produit n'existe pas ou n'est plus disponible.</p>
        </div>
      </div>
    );
  }

  const brandColor = product.brand_color || "#2563eb";

  if (orderSuccess) {
    return (
      <>
        {product.facebook_pixel_id && (
          <FacebookPixel pixelId={product.facebook_pixel_id} />
        )}
        <LandingThankYou
          orderId={orderSuccess.orderId}
          total={orderSuccess.total}
          productName={product.name}
          brandColor={brandColor}
        />
      </>
    );
  }

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("fr-FR").format(p) + " FCFA";

  return (
    <>
      {product.facebook_pixel_id && (
        <FacebookPixel pixelId={product.facebook_pixel_id} />
      )}

      <div className="min-h-screen bg-gray-50">
        {product.landing_html ? (
          <LandingWithCustomHtml product={product} brandColor={brandColor} />
        ) : (
          <DefaultLandingHero product={product} brandColor={brandColor} formatPrice={formatPrice} />
        )}

        {/* Order form — only shown for default template (no custom HTML) */}
        {!product.landing_html && (
          <div className="py-12 px-4" id="order-form">
            <LandingOrderForm
              productId={product.id}
              productName={product.name}
              price={Number(product.price)}
              brandColor={brandColor}
              onOrderSuccess={handleOrderSuccess}
            />
          </div>
        )}
      </div>
    </>
  );
}

/** Renders the iframe with custom HTML + injected order form */
function LandingWithCustomHtml({
  product,
  brandColor,
}: {
  product: LandingProduct;
  brandColor: string;
}) {
  const webhookUrl = (() => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    if (projectId) return `https://${projectId}.supabase.co/functions/v1/webhook-orders`;
    // Fallback: use supabase client URL
    const url = (supabase as any).supabaseUrl || "";
    return `${url}/functions/v1/webhook-orders`;
  })();

  const injectedForm = buildInjectedFormHtml({
    productId: product.id,
    productName: product.name,
    price: Number(product.price),
    brandColor,
    webhookUrl,
  });

  const srcDoc = useMemo(() => {
    let html = product.landing_html || "";

    // Inject form before </body> or at the end
    const bodyCloseIdx = html.toLowerCase().lastIndexOf("</body>");
    if (bodyCloseIdx !== -1) {
      html = html.slice(0, bodyCloseIdx) + injectedForm + html.slice(bodyCloseIdx);
    } else {
      html += injectedForm;
    }
    return html;
  }, [product.landing_html, injectedForm]);

  return (
    <iframe
      srcDoc={srcDoc}
      title={product.name}
      className="w-full border-none"
      style={{ minHeight: "100vh" }}
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      onLoad={(e) => {
        try {
          const iframe = e.currentTarget;
          const height = iframe.contentDocument?.documentElement?.scrollHeight;
          if (height) iframe.style.height = height + "px";
        } catch {}
      }}
    />
  );
}

/** Default hero section when no custom HTML */
function DefaultLandingHero({
  product,
  brandColor,
  formatPrice,
}: {
  product: LandingProduct;
  brandColor: string;
  formatPrice: (p: number) => string;
}) {
  return (
    <div className="relative">
      <div
        className="relative py-16 sm:py-24 px-4"
        style={{
          background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)`,
        }}
      >
        <div className="max-w-4xl mx-auto text-center text-white">
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-48 h-48 sm:w-64 sm:h-64 object-cover rounded-2xl mx-auto mb-8 shadow-2xl"
            />
          )}
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">
            {product.landing_headline || product.name}
          </h1>
          {product.landing_description && (
            <p className="text-lg sm:text-xl opacity-90 max-w-2xl mx-auto mb-6">
              {product.landing_description}
            </p>
          )}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3">
            <ShoppingCart className="w-5 h-5" />
            <span className="text-2xl font-bold">
              {formatPrice(Number(product.price))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
