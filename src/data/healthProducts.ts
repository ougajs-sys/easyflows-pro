export interface ProductLandingData {
  benefits: { icon: string; title: string; description: string }[];
  testimonials: { name: string; city: string; text: string; rating: number }[];
  whatsappNumber: string;
  guarantees?: { icon: string; title: string; description: string }[];
}

export const CI_CITIES = [
  "Abidjan - Cocody",
  "Abidjan - Yopougon",
  "Abidjan - Marcory",
  "Abidjan - Plateau",
  "Abidjan - Riviera",
  "Abidjan - Treichville",
  "Abidjan - Abobo",
  "Abidjan - Adjamé",
  "Abidjan - Koumassi",
  "Abidjan - Port-Bouët",
  "Abidjan - Bingerville",
  "Abidjan - Songon",
  "Bouaké",
  "Yamoussoukro",
  "San-Pédro",
  "Korhogo",
  "Daloa",
  "Man",
  "Gagnoa",
  "Divo",
  "Abengourou",
  "Autre",
] as const;

const defaultGuarantees = [
  { icon: "truck", title: "Livraison Gratuite", description: "Partout en Côte d'Ivoire" },
  { icon: "shield", title: "Paiement à la Livraison", description: "Payez à la réception" },
  { icon: "leaf", title: "100% Naturel", description: "Produits certifiés" },
];

export const healthProductDefaults: Record<string, ProductLandingData> = {
  "lb10": {
    benefits: [
      { icon: "heart-pulse", title: "Santé Prostatique", description: "Soulage les troubles urinaires liés à la prostate" },
      { icon: "shield-check", title: "Protection Naturelle", description: "Formule à base de plantes médicinales africaines" },
      { icon: "moon", title: "Nuits Paisibles", description: "Réduction des réveils nocturnes fréquents" },
      { icon: "zap", title: "Vitalité Retrouvée", description: "Boost d'énergie et de bien-être au quotidien" },
      { icon: "check-circle", title: "Sans Effets Secondaires", description: "Composition 100% naturelle et sans danger" },
      { icon: "clock", title: "Résultats Rapides", description: "Amélioration visible dès les premières semaines" },
    ],
    testimonials: [
      { name: "Kouamé A.", city: "Abidjan", text: "Après 2 semaines d'utilisation, mes problèmes de prostate ont considérablement diminué. Je recommande vivement !", rating: 5 },
      { name: "Traoré M.", city: "Bouaké", text: "Produit excellent ! Je ne me lève plus 5 fois la nuit. Ma vie a changé grâce au LB10+.", rating: 5 },
      { name: "Bamba S.", city: "Yamoussoukro", text: "J'étais sceptique au début mais les résultats sont là. Merci pour ce produit naturel et efficace.", rating: 4 },
    ],
    whatsappNumber: "2250700000000",
    guarantees: defaultGuarantees,
  },
  "product-2": {
    benefits: [],
    testimonials: [],
    whatsappNumber: "2250700000000",
    guarantees: defaultGuarantees,
  },
  "product-3": {
    benefits: [],
    testimonials: [],
    whatsappNumber: "2250700000000",
    guarantees: defaultGuarantees,
  },
};

export function getProductData(slug: string): ProductLandingData {
  const key = Object.keys(healthProductDefaults).find(k => slug.toLowerCase().includes(k));
  if (key) return healthProductDefaults[key];
  
  return {
    benefits: [
      { icon: "check-circle", title: "Qualité Premium", description: "Produit sélectionné avec soin" },
      { icon: "truck", title: "Livraison Rapide", description: "Livré directement chez vous" },
      { icon: "shield-check", title: "Satisfaction Garantie", description: "Résultats prouvés par nos clients" },
    ],
    testimonials: [
      { name: "Client Vérifié", city: "Abidjan", text: "Excellent produit, je recommande à 100% !", rating: 5 },
      { name: "Client Vérifié", city: "Bouaké", text: "Très satisfait de mon achat. Livraison rapide.", rating: 4 },
      { name: "Client Vérifié", city: "Daloa", text: "Bon rapport qualité-prix. Je recommande.", rating: 5 },
    ],
    whatsappNumber: "2250700000000",
    guarantees: defaultGuarantees,
  };
}
