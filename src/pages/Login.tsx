import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Eye, EyeOff, Shield, Lock, User } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Navigate to dashboard (actual auth will be implemented with backend)
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 glow">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">
              <span className="text-gradient">Pipeline</span>
              <br />
              Gestion Automatique
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              Plateforme intelligente pour gérer tout le cycle de commande avec sécurité, automatisations et retargeting.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            {[
              "14 modules intégrés",
              "IA de distribution intelligente",
              "Synchronisation UTB automatique",
              "Campagnes SMS/WhatsApp",
            ].map((feature, index) => (
              <div
                key={feature}
                className="flex items-center gap-3 text-foreground/80"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Shield className="w-3 h-3 text-primary" />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center glow">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <span className="font-bold text-2xl text-gradient">Pipeline</span>
          </div>

          <div className="glass rounded-2xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Connexion</h2>
              <p className="text-muted-foreground">
                Accédez à votre espace de gestion
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">
                  Identifiant
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Entrez votre identifiant"
                    className="w-full h-12 pl-11 pr-4 rounded-lg bg-secondary border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 pl-11 pr-12 rounded-lg bg-secondary border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border bg-secondary accent-primary"
                  />
                  <span className="text-muted-foreground">Se souvenir de moi</span>
                </label>
                <button type="button" className="text-primary hover:underline">
                  Mot de passe oublié?
                </button>
              </div>

              {/* Submit Button */}
              <Button type="submit" variant="glow" size="lg" className="w-full">
                Se connecter
              </Button>
            </form>

            {/* Role Selection */}
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground text-center mb-4">
                Sélectionnez votre rôle pour une démo
              </p>
              <div className="grid grid-cols-2 gap-2">
                {["Appelant", "Livreur", "Superviseur", "Admin"].map((role) => (
                  <Button
                    key={role}
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/dashboard")}
                    className="text-xs"
                  >
                    {role}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            © 2025 Pipeline Gestion Automatique. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  );
}
