// Training content data for caller modules

export const techniquesAppelSteps = [
  {
    title: "🎯 Avant l'appel",
    content: (
      <div className="space-y-3 text-sm">
        <p className="font-medium text-base">Prépare-toi en 30 secondes :</p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">1.</span>
            <span><strong>Ouvre la fiche client</strong> - Regarde son nom, sa ville</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">2.</span>
            <span><strong>Lis l'historique</strong> - A-t-il déjà commandé ? Quoi ?</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">3.</span>
            <span><strong>Prépare 2-3 produits</strong> - Ceux qui pourraient l'intéresser</span>
          </li>
        </ul>
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mt-4">
          <p className="text-primary font-medium">💡 Astuce</p>
          <p className="text-muted-foreground">Un appelant préparé = 2x plus de ventes</p>
        </div>
      </div>
    ),
  },
  {
    title: "📞 Pendant l'appel",
    content: (
      <div className="space-y-3 text-sm">
        <p className="font-medium text-base">La structure gagnante :</p>
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-card border">
            <p className="font-medium text-success">1. Salutation (5 sec)</p>
            <p className="text-muted-foreground italic">"Bonjour [Prénom], c'est [Ton nom] de [Entreprise] !"</p>
          </div>
          <div className="p-3 rounded-lg bg-card border">
            <p className="font-medium text-success">2. Vérification (10 sec)</p>
            <p className="text-muted-foreground italic">"Vous avez 2 minutes ? J'ai quelque chose d'intéressant."</p>
          </div>
          <div className="p-3 rounded-lg bg-card border">
            <p className="font-medium text-success">3. Découverte (30 sec)</p>
            <p className="text-muted-foreground italic">"Qu'est-ce qui est important pour vous ?"</p>
          </div>
          <div className="p-3 rounded-lg bg-card border">
            <p className="font-medium text-success">4. Proposition (20 sec)</p>
            <p className="text-muted-foreground italic">"J'ai exactement ce qu'il vous faut..."</p>
          </div>
          <div className="p-3 rounded-lg bg-card border">
            <p className="font-medium text-success">5. Confirmation (15 sec)</p>
            <p className="text-muted-foreground italic">"On vous l'envoie à [adresse], c'est bien ça ?"</p>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
          <p className="font-medium text-warning">⚡ Règle d'or</p>
          <p className="text-muted-foreground">Écoute 60% du temps, parle 40%</p>
        </div>
      </div>
    ),
  },
  {
    title: "✅ Après l'appel",
    content: (
      <div className="space-y-3 text-sm">
        <p className="font-medium text-base">Ne perds rien, note tout :</p>
        <ul className="space-y-3">
          <li className="p-3 rounded-lg bg-card border flex items-start gap-3">
            <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">1</span>
            <div>
              <p className="font-medium">Enregistre immédiatement</p>
              <p className="text-muted-foreground text-xs">La commande dans le système, pas sur un papier</p>
            </div>
          </li>
          <li className="p-3 rounded-lg bg-card border flex items-start gap-3">
            <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">2</span>
            <div>
              <p className="font-medium">Note les infos importantes</p>
              <p className="text-muted-foreground text-xs">Préférences, remarques, détails de livraison</p>
            </div>
          </li>
          <li className="p-3 rounded-lg bg-card border flex items-start gap-3">
            <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">3</span>
            <div>
              <p className="font-medium">Programme un suivi si besoin</p>
              <p className="text-muted-foreground text-xs">Client hésitant ? Rappelle-le dans 2 jours</p>
            </div>
          </li>
        </ul>
        <div className="p-3 rounded-lg bg-success/10 border border-success/20 mt-4">
          <p className="text-success font-medium">🎯 Objectif</p>
          <p className="text-muted-foreground">Passer au client suivant en moins de 30 secondes</p>
        </div>
      </div>
    ),
  },
];

export const scriptsVenteSteps = [
  {
    title: "📝 Script Nouveau Client",
    content: (
      <div className="space-y-3 text-sm">
        <div className="p-4 rounded-lg bg-card border space-y-3">
          <p className="font-medium text-primary">Ouverture :</p>
          <p className="italic text-muted-foreground">
            "Bonjour ! Je m'appelle [Prénom] de [Entreprise]. On m'a dit que vous cherchez [type de produit]. C'est bien ça ?"
          </p>
          
          <p className="font-medium text-primary">Découverte :</p>
          <p className="italic text-muted-foreground">
            "Qu'est-ce qui est le plus important pour vous ? La qualité ? Le prix ? La livraison rapide ?"
          </p>
          
          <p className="font-medium text-primary">Proposition :</p>
          <p className="italic text-muted-foreground">
            "Parfait ! J'ai exactement ce qu'il vous faut. Notre [produit] est [avantage principal]. En plus, la livraison est gratuite aujourd'hui."
          </p>
          
          <p className="font-medium text-primary">Closing :</p>
          <p className="italic text-muted-foreground">
            "On vous l'envoie ?"
          </p>
        </div>
        <div className="p-3 rounded-lg bg-primary/10">
          <p className="text-xs text-muted-foreground">💡 Adapte le script à ta personnalité, mais garde la structure</p>
        </div>
      </div>
    ),
  },
  {
    title: "🔄 Script Client Existant",
    content: (
      <div className="space-y-3 text-sm">
        <div className="p-4 rounded-lg bg-card border space-y-3">
          <p className="font-medium text-primary">Reconnexion :</p>
          <p className="italic text-muted-foreground">
            "Bonjour [Prénom] ! C'est [Ton nom] de [Entreprise]. Comment ça va depuis votre dernière commande ?"
          </p>
          
          <p className="font-medium text-primary">Personnalisation :</p>
          <p className="italic text-muted-foreground">
            "J'ai pensé à vous parce qu'on a [nouvelle offre]. Vu que vous aimez [référence au passé], ça pourrait vous intéresser."
          </p>
          
          <p className="font-medium text-primary">Fidélisation :</p>
          <p className="italic text-muted-foreground">
            "Et comme vous êtes un client fidèle, je vous fais [avantage spécial]."
          </p>
          
          <p className="font-medium text-primary">Closing :</p>
          <p className="italic text-muted-foreground">
            "Je vous en mets combien cette fois ?"
          </p>
        </div>
        <div className="p-3 rounded-lg bg-success/10">
          <p className="text-xs text-muted-foreground">🎯 Un client existant = 5x plus facile à convertir</p>
        </div>
      </div>
    ),
  },
  {
    title: "🔥 Script Relance Abandon",
    content: (
      <div className="space-y-3 text-sm">
        <div className="p-4 rounded-lg bg-card border space-y-3">
          <p className="font-medium text-primary">Accroche :</p>
          <p className="italic text-muted-foreground">
            "Bonjour [Prénom], c'est [Ton nom] de [Entreprise]. J'ai vu que vous n'avez pas finalisé votre commande."
          </p>
          
          <p className="font-medium text-primary">Empathie :</p>
          <p className="italic text-muted-foreground">
            "Il y a eu un problème ? Je peux vous aider ?"
          </p>
          
          <p className="font-medium text-primary">Résolution :</p>
          <p className="italic text-muted-foreground">
            [Écouter et répondre aux objections]
            "Je comprends. Et si je vous propose [solution] ?"
          </p>
          
          <p className="font-medium text-primary">Closing :</p>
          <p className="italic text-muted-foreground">
            "Super, on la valide maintenant ?"
          </p>
        </div>
        <div className="p-3 rounded-lg bg-warning/10">
          <p className="text-xs text-muted-foreground">⚡ Appelle dans les 24h après l'abandon pour maximiser les chances</p>
        </div>
      </div>
    ),
  },
];

export const gestionObjectionsSteps = [
  {
    title: "💰 \"C'est trop cher\"",
    content: (
      <div className="space-y-4 text-sm">
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="font-medium text-destructive">❌ Ne jamais dire :</p>
          <p className="text-muted-foreground italic">"Je peux vous faire une remise"</p>
        </div>
        
        <div className="p-4 rounded-lg bg-success/10 border border-success/20">
          <p className="font-medium text-success mb-2">✅ Réponse gagnante :</p>
          <p className="italic">
            "Je comprends que le budget soit important. Mais laissez-moi vous expliquer pourquoi ce prix en vaut la peine :"
          </p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>• <strong>Qualité</strong> - Ça dure plus longtemps</li>
            <li>• <strong>Service</strong> - Livraison gratuite + SAV</li>
            <li>• <strong>Garantie</strong> - Satisfait ou remboursé</li>
          </ul>
          <p className="italic mt-2">
            "En fait, c'est un investissement qui vous fait économiser à long terme."
          </p>
        </div>
        
        <div className="p-3 rounded-lg bg-primary/10">
          <p className="text-xs">💡 Focus sur la VALEUR, pas le prix</p>
        </div>
      </div>
    ),
  },
  {
    title: "🤔 \"Je vais réfléchir\"",
    content: (
      <div className="space-y-4 text-sm">
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="font-medium text-destructive">❌ Ne jamais dire :</p>
          <p className="text-muted-foreground italic">"D'accord, rappelez-moi quand vous êtes prêt"</p>
        </div>
        
        <div className="p-4 rounded-lg bg-success/10 border border-success/20">
          <p className="font-medium text-success mb-2">✅ Réponse gagnante :</p>
          <p className="italic">
            "Bien sûr, c'est normal de réfléchir. Qu'est-ce qui vous fait hésiter exactement ?"
          </p>
          <p className="text-muted-foreground mt-2">[Écouter la vraie objection]</p>
          <p className="italic mt-2">
            "Je comprends. Et si je vous dis que cette offre est valable seulement aujourd'hui ?"
          </p>
        </div>
        
        <div className="p-3 rounded-lg bg-warning/10">
          <p className="text-xs">⚡ Crée l'urgence avec bienveillance, pas avec pression</p>
        </div>
      </div>
    ),
  },
  {
    title: "⏰ \"Je n'ai pas le temps\"",
    content: (
      <div className="space-y-4 text-sm">
        <div className="p-4 rounded-lg bg-success/10 border border-success/20">
          <p className="font-medium text-success mb-2">✅ Réponse gagnante :</p>
          <p className="italic">
            "Je comprends, vous êtes occupé. Ça prendra 30 secondes max."
          </p>
          <div className="mt-3 p-3 rounded bg-card border">
            <p className="font-medium text-primary mb-1">Pitch 30 secondes :</p>
            <p className="text-muted-foreground italic">
              "[Produit] + [Avantage principal] + [Prix] + Livraison demain. On fait ça ?"
            </p>
          </div>
        </div>
        
        <div className="p-3 rounded-lg bg-primary/10">
          <p className="text-xs">💡 Si vraiment pas le temps : "Je vous rappelle à quelle heure demain ?"</p>
        </div>
      </div>
    ),
  },
  {
    title: "🚫 \"Pas intéressé\"",
    content: (
      <div className="space-y-4 text-sm">
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="font-medium text-destructive">❌ Ne jamais dire :</p>
          <p className="text-muted-foreground italic">"D'accord, au revoir"</p>
        </div>
        
        <div className="p-4 rounded-lg bg-success/10 border border-success/20">
          <p className="font-medium text-success mb-2">✅ Réponse gagnante :</p>
          <p className="italic">
            "D'accord, je respecte ça. Juste par curiosité, qu'est-ce qui pourrait vous intéresser ?"
          </p>
          <p className="text-muted-foreground mt-2">[Écouter attentivement]</p>
          <p className="italic mt-2">
            "Ah intéressant ! Justement, on a aussi [autre produit/service]..."
          </p>
        </div>
        
        <div className="p-3 rounded-lg bg-primary/10">
          <p className="text-xs">💡 Une question ouverte peut transformer un "non" en opportunité</p>
        </div>
      </div>
    ),
  },
];

export const plateformeSteps = [
  {
    title: "📦 Créer une commande",
    content: (
      <div className="space-y-3 text-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</span>
            <span>Menu → <strong>Commandes</strong></span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</span>
            <span>Cliquer <strong>Nouvelle commande</strong></span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</span>
            <span>Remplir : Client + Produits + Quantités + Adresse</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</span>
            <span>Cliquer <strong>Enregistrer</strong></span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "👤 Ajouter un client",
    content: (
      <div className="space-y-3 text-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</span>
            <span>Menu → <strong>Clients</strong></span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</span>
            <span>Cliquer <strong>Nouveau client</strong></span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</span>
            <span>Obligatoire : <strong>Nom + Téléphone + Adresse</strong></span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</span>
            <span>Cliquer <strong>Créer</strong></span>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-warning/10">
          <p className="text-xs">⚠️ Vérifie toujours le numéro de téléphone (fais répéter)</p>
        </div>
      </div>
    ),
  },
  {
    title: "📊 Voir mes statistiques",
    content: (
      <div className="space-y-3 text-sm">
        <p className="font-medium">Sur ton tableau de bord, tu vois :</p>
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-card border">
            <p className="font-medium text-success">Commandes du jour</p>
            <p className="text-xs text-muted-foreground">Combien tu as confirmé aujourd'hui</p>
          </div>
          <div className="p-3 rounded-lg bg-card border">
            <p className="font-medium text-primary">Taux de confirmation</p>
            <p className="text-xs text-muted-foreground">% de commandes confirmées vs appelées</p>
          </div>
          <div className="p-3 rounded-lg bg-card border">
            <p className="font-medium text-warning">Objectifs</p>
            <p className="text-xs text-muted-foreground">Ta progression vers l'objectif quotidien</p>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-primary/10">
          <p className="text-xs">💡 Consulte tes stats chaque heure pour rester motivé</p>
        </div>
      </div>
    ),
  },
  {
    title: "📅 Programmer un suivi",
    content: (
      <div className="space-y-3 text-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</span>
            <span>Ouvrir la fiche client</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</span>
            <span>Cliquer <strong>Ajouter suivi</strong></span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</span>
            <span>Choisir <strong>date et heure</strong></span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</span>
            <span>Écrire la <strong>raison du rappel</strong></span>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-success/10">
          <p className="text-xs">🎯 Tu recevras une notification au moment du suivi</p>
        </div>
      </div>
    ),
  },
  {
    title: "💬 Discuter avec superviseur",
    content: (
      <div className="space-y-3 text-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</span>
            <span>Bouton chat <strong>en bas à droite</strong> 💬</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</span>
            <span>Sélectionner ton <strong>superviseur</strong></span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</span>
            <span>Écrire ton <strong>message</strong></span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</span>
            <span>Attendre la <strong>réponse</strong></span>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-warning/10">
          <p className="text-xs">⚡ Utilise le chat pour les urgences, pas pour discuter</p>
        </div>
      </div>
    ),
  },
];

export const confirmationChecklist = [
  {
    title: "✅ Vérifications obligatoires",
    items: [
      { id: "check-1", label: "Nom complet du client correct ?" },
      { id: "check-2", label: "Numéro de téléphone vérifié (faire répéter) ?" },
      { id: "check-3", label: "Adresse complète (rue, quartier, point de repère) ?" },
      { id: "check-4", label: "Produits et quantités confirmés ?" },
      { id: "check-5", label: "Prix total annoncé au client ?" },
      { id: "check-6", label: "Mode de paiement convenu ?" },
    ],
  },
  {
    title: "⚠️ Si problème",
    type: "info" as const,
    items: [
      { id: "info-1", label: "Client change d'avis → Demander pourquoi, proposer alternative" },
      { id: "info-2", label: "Adresse floue → Demander un point de repère connu" },
      { id: "info-3", label: "Client agressif → Rester calme, transférer au superviseur" },
      { id: "info-4", label: "Demande spéciale → Noter dans les remarques" },
    ],
  },
  {
    title: "📝 Après confirmation",
    type: "info" as const,
    items: [
      { id: "after-1", label: "Dire : \"Votre commande est enregistrée !\"" },
      { id: "after-2", label: "Donner le délai de livraison estimé" },
      { id: "after-3", label: "Remercier le client" },
      { id: "after-4", label: "Enregistrer immédiatement dans le système" },
    ],
  },
];

export const quizQuestions = [
  {
    question: "Quel pourcentage du temps devez-vous passer à ÉCOUTER pendant un appel ?",
    options: ["30%", "50%", "60%", "80%"],
    correctIndex: 2,
    explanation: "La règle d'or : 60% écoute, 40% parole. Écouter plus permet de mieux comprendre les besoins du client.",
  },
  {
    question: "Que faire quand un client dit \"C'est trop cher\" ?",
    options: [
      "Baisser le prix immédiatement",
      "Expliquer la valeur du produit",
      "Raccrocher poliment",
      "Insister sans argument",
    ],
    correctIndex: 1,
    explanation: "Toujours mettre en avant la VALEUR : qualité, service, garantie. Ne jamais baisser le prix en premier.",
  },
  {
    question: "Quelle est la PREMIÈRE chose à faire avant d'appeler un client ?",
    options: [
      "Vérifier la météo",
      "Consulter la fiche et l'historique du client",
      "Regarder les promotions du jour",
      "Prendre un café",
    ],
    correctIndex: 1,
    explanation: "Toujours connaître ton client ! Sa fiche et son historique te donnent les infos pour personnaliser l'appel.",
  },
  {
    question: "Comment réagir si un client devient agressif ?",
    options: [
      "Lui répondre sur le même ton",
      "Raccrocher immédiatement",
      "Rester calme et transférer au superviseur",
      "Lui faire une remise pour le calmer",
    ],
    correctIndex: 2,
    explanation: "Garde ton calme, ne prends pas personnellement, et escalade au superviseur qui a l'expérience pour gérer.",
  },
];
