import { useState, useEffect, useRef } from "react";
import { ShoppingCart, Star, Truck, Shield, Leaf, HeartPulse, ShieldCheck, Moon, Zap, CheckCircle, Clock, MessageCircle } from "lucide-react";
import { getProductData } from "@/data/healthProducts";
import { OrderModal } from "./OrderModal";

interface PremiumProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  slug: string;
  image_url: string | null;
  landing_headline: string | null;
  landing_description: string | null;
  brand_color: string | null;
}

interface PremiumHealthLandingProps {
  product: PremiumProduct;
  onOrderSuccess: (orderId: string, total: number) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  "heart-pulse": <HeartPulse className="w-6 h-6" />,
  "shield-check": <ShieldCheck className="w-6 h-6" />,
  "moon": <Moon className="w-6 h-6" />,
  "zap": <Zap className="w-6 h-6" />,
  "check-circle": <CheckCircle className="w-6 h-6" />,
  "clock": <Clock className="w-6 h-6" />,
  "truck": <Truck className="w-6 h-6" />,
  "shield": <Shield className="w-6 h-6" />,
  "leaf": <Leaf className="w-6 h-6" />,
};

export default function PremiumHealthLanding({ product, onOrderSuccess }: PremiumHealthLandingProps) {
  const [showSticky, setShowSticky] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const brandColor = product.brand_color || "#059669";
  const data = getProductData(product.slug);
  const oldPrice = Math.round(product.price * 1.5);

  const formatPrice = (p: number) => new Intl.NumberFormat("fr-FR").format(p) + " FCFA";

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Urgency Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center py-2 px-4 text-sm font-semibold animate-pulse">
        ⚡ Stock limité — Plus que {product.stock} unités disponibles !
      </div>

      {/* Hero */}
      <section
        className="pt-14 pb-10 px-4 sm:pt-16 sm:pb-14 md:pt-20 md:pb-16"
        style={{ background: `linear-gradient(135deg, ${brandColor}, #0f172a)` }}
      >
        <div className="max-w-4xl mx-auto text-center text-white">
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64 object-cover rounded-[2rem] mx-auto mb-6 shadow-2xl"
            />
          )}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 leading-tight">
            {product.landing_headline || product.name}
          </h1>
          {product.landing_description && (
            <p className="text-base sm:text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-6 leading-relaxed">
              {product.landing_description}
            </p>
          )}
          <div className="inline-flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-full px-6 py-3 mb-6">
            <span className="text-lg line-through opacity-60">{formatPrice(oldPrice)}</span>
            <span className="bg-yellow-400 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full">PROMO</span>
            <span className="text-2xl sm:text-3xl font-black">{formatPrice(product.price)}</span>
          </div>
          <div>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 bg-white font-bold px-8 py-4 rounded-xl text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all active:scale-95 min-h-[52px]"
              style={{ color: brandColor }}
            >
              <ShoppingCart className="w-5 h-5" />
              Commander maintenant
            </button>
          </div>
        </div>
      </section>

      {/* Benefits */}
      {data.benefits.length > 0 && (
        <SectionAnimated>
          <section className="py-10 px-4 sm:py-14 bg-gray-50">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-8">
                Pourquoi choisir {product.name} ?
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {data.benefits.map((b, i) => (
                  <div key={i} className="bg-white rounded-[1.5rem] p-5 shadow-xl border border-gray-100 text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-white" style={{ backgroundColor: brandColor }}>
                      {ICON_MAP[b.icon] || <CheckCircle className="w-6 h-6" />}
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-gray-900 mb-1">{b.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{b.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </SectionAnimated>
      )}

      {/* Testimonials */}
      {data.testimonials.length > 0 && (
        <SectionAnimated>
          <section className="py-10 px-4 sm:py-14">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-8">
                Ce que disent nos clients
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {data.testimonials.map((t, i) => (
                  <div key={i} className="bg-gradient-to-b from-gray-50 to-white rounded-[1.5rem] p-5 shadow-lg border border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: brandColor }}>
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                        <p className="text-xs text-gray-500">{t.city}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 mb-2">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">"{t.text}"</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </SectionAnimated>
      )}

      {/* Guarantees */}
      {data.guarantees && data.guarantees.length > 0 && (
        <SectionAnimated>
          <section className="py-10 px-4 sm:py-14 bg-gray-50">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {data.guarantees.map((g, i) => (
                  <div key={i} className="bg-white rounded-[1.5rem] p-4 sm:p-5 shadow-lg text-center border border-gray-100">
                    <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${brandColor}15`, color: brandColor }}>
                      {ICON_MAP[g.icon] || <CheckCircle className="w-6 h-6" />}
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm text-gray-900 mb-1">{g.title}</h3>
                    <p className="text-[11px] sm:text-xs text-gray-500">{g.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </SectionAnimated>
      )}

      {/* Final CTA */}
      <SectionAnimated>
        <section className="py-12 px-4 sm:py-16 text-center" style={{ background: `linear-gradient(135deg, ${brandColor}, #0f172a)` }}>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
            Ne manquez pas cette offre !
          </h2>
          <p className="text-white/80 text-sm sm:text-base mb-6">
            Commandez maintenant et bénéficiez de la livraison gratuite
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-white font-bold px-8 py-4 rounded-xl text-base shadow-xl hover:shadow-2xl transition-all active:scale-95"
            style={{ color: brandColor }}
          >
            <ShoppingCart className="w-5 h-5" />
            Commander — {formatPrice(product.price)}
          </button>
        </section>
      </SectionAnimated>

      {/* Bottom padding for sticky bar */}
      <div className="h-20" />

      {/* Sticky Bottom Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-2xl transition-transform duration-300 ${showSticky ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs text-gray-500 font-medium">{product.name}</p>
            <p className="text-lg font-black" style={{ color: brandColor }}>{formatPrice(product.price)}</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-lg active:scale-95 transition-all"
            style={{ backgroundColor: brandColor }}
          >
            <ShoppingCart className="w-4 h-4" />
            Commander
          </button>
        </div>
      </div>

      {/* WhatsApp Button */}
      <a
        href={`https://wa.me/${data.whatsappNumber}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 right-4 z-30 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-xl animate-pulse hover:scale-110 transition-transform"
        aria-label="WhatsApp"
      >
        <MessageCircle className="w-7 h-7 text-white" />
      </a>

      {/* Order Modal */}
      <OrderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        productId={product.id}
        productName={product.name}
        price={product.price}
        brandColor={brandColor}
        onOrderSuccess={onOrderSuccess}
      />
    </div>
  );
}

/** Wrapper for fade-in on scroll */
function SectionAnimated({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
    >
      {children}
    </div>
  );
}
