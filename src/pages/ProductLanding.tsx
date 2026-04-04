import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FacebookPixel, usePixelTrack } from "@/components/landing/FacebookPixel";
import { LandingThankYou } from "@/components/landing/LandingThankYou";
import { buildInjectedFormHtml } from "@/components/landing/buildInjectedFormHtml";
import PremiumHealthLanding from "@/components/landing/PremiumHealthLanding";
import { Loader2 } from "lucide-react";

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

      {product.landing_html ? (
        <LandingWithCustomHtml product={product} brandColor={brandColor} />
      ) : (
        <PremiumHealthLanding
          product={product}
          onOrderSuccess={handleOrderSuccess}
        />
      )}
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
  // Hide parent scroll to avoid double scrollbar
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

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

    // Inject smooth scroll styles for iOS
    const scrollStyles = `<style>html,body{overflow-y:auto;-webkit-overflow-scrolling:touch;margin:0;padding:0;}</style>`;
    const headClose = html.toLowerCase().indexOf("</head>");
    if (headClose !== -1) {
      html = html.slice(0, headClose) + scrollStyles + html.slice(headClose);
    } else {
      html = scrollStyles + html;
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

  return (
    <iframe
      srcDoc={srcDoc}
      title={product.name}
      className="w-full border-none block"
      style={{ width: "100%", height: "100vh", border: "none", display: "block", margin: 0, padding: 0 }}
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
    />
  );
}

