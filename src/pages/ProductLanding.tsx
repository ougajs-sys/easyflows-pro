import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FacebookPixel, usePixelTrack } from "@/components/landing/FacebookPixel";
import { LandingOrderForm } from "@/components/landing/LandingOrderForm";
import { LandingThankYou } from "@/components/landing/LandingThankYou";
import { buildInjectedFormHtml } from "@/components/landing/buildInjectedFormHtml";
import { Loader2, ShoppingCart, ChevronDown } from "lucide-react";

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Produit introuvable</h1>
          <p className="text-gray-500 text-sm sm:text-base">Ce produit n'existe pas ou n'est plus disponible.</p>
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
          <>
            <DefaultLandingHero product={product} brandColor={brandColor} formatPrice={formatPrice} />
            {/* Order form */}
            <div className="py-6 sm:py-10 md:py-12 px-4" id="order-form">
              <LandingOrderForm
                productId={product.id}
                productName={product.name}
                price={Number(product.price)}
                brandColor={brandColor}
                onOrderSuccess={handleOrderSuccess}
              />
            </div>
          </>
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

    if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
      const headCloseIdx = html.toLowerCase().indexOf("</head>");
      const viewportMeta = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />';
      if (headCloseIdx !== -1) {
        html = html.slice(0, headCloseIdx) + viewportMeta + html.slice(headCloseIdx);
      } else {
        html = viewportMeta + html;
      }
    }

    const tailwindFallbackRuntime = `
<script>
(function () {
  function hasTailwindApplied() {
    try {
      var probe = document.createElement('div');
      probe.className = 'hidden';
      probe.style.position = 'absolute';
      probe.style.pointerEvents = 'none';
      document.body.appendChild(probe);
      var isHidden = window.getComputedStyle(probe).display === 'none';
      probe.remove();
      return isHidden;
    } catch (_) {
      return false;
    }
  }

  function loadTailwindFallback() {
    if (window.__tailwindFallbackLoaded) return;
    window.__tailwindFallbackLoaded = true;
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4';
    script.defer = true;
    document.head.appendChild(script);
  }

  window.addEventListener('load', function () {
    setTimeout(function () {
      if (!hasTailwindApplied()) loadTailwindFallback();
    }, 800);

    setTimeout(function () {
      if (!hasTailwindApplied()) loadTailwindFallback();
    }, 2200);
  });
})();
</script>`;

    const bodyCloseIdx = html.toLowerCase().lastIndexOf("</body>");
    const injectedContent = tailwindFallbackRuntime + injectedForm;
    if (bodyCloseIdx !== -1) {
      html = html.slice(0, bodyCloseIdx) + injectedContent + html.slice(bodyCloseIdx);
    } else {
      html += injectedContent;
    }

    return html;
  }, [product.landing_html, injectedForm]);

  const iframeRef = useCallback((iframe: HTMLIFrameElement | null) => {
    if (!iframe) return;
    const adjustHeight = () => {
      try {
        const h = iframe.contentDocument?.documentElement?.scrollHeight;
        if (h && h > 100) iframe.style.height = h + "px";
      } catch {}
    };
    iframe.addEventListener("load", () => {
      adjustHeight();
      const intervals = [500, 1500, 3000, 5000];
      intervals.forEach((ms) => setTimeout(adjustHeight, ms));
      try {
        const obs = new ResizeObserver(adjustHeight);
        if (iframe.contentDocument?.body) obs.observe(iframe.contentDocument.body);
      } catch {}
    });
  }, []);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      title={product.name}
      className="w-full border-none"
      style={{ minHeight: "100vh" }}
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
    />
  );
}

/** Default hero section when no custom HTML — mobile-first */
function DefaultLandingHero({
  product,
  brandColor,
  formatPrice,
}: {
  product: LandingProduct;
  brandColor: string;
  formatPrice: (p: number) => string;
}) {
  const scrollToForm = () => {
    document.getElementById("order-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        className="relative py-10 px-4 sm:py-16 md:py-24"
        style={{
          background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)`,
        }}
      >
        <div className="max-w-4xl mx-auto text-center text-white">
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 object-cover rounded-2xl mx-auto mb-6 sm:mb-8 shadow-2xl"
            />
          )}
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4 leading-tight">
            {product.landing_headline || product.name}
          </h1>
          {product.landing_description && (
            <p className="text-base sm:text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-4 sm:mb-6 leading-relaxed">
              {product.landing_description}
            </p>
          )}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-5 py-2.5 sm:px-6 sm:py-3 mb-6 sm:mb-8">
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xl sm:text-2xl font-bold">
              {formatPrice(Number(product.price))}
            </span>
          </div>

          {/* CTA scroll to form */}
          <div>
            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 bg-white text-gray-900 font-bold px-8 py-3.5 sm:py-4 rounded-xl text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all active:scale-95 min-h-[48px]"
              style={{ color: brandColor }}
            >
              <ShoppingCart className="w-5 h-5" />
              Commander maintenant
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
