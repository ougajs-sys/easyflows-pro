import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Shield, Users, Truck, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

// Helper function to get redirect path based on role
const getRedirectPathForRole = (role: AppRole | null): string => {
  switch (role) {
    case 'livreur':
      return '/delivery';
    case 'superviseur':
      return '/supervisor';
    case 'administrateur':
    case 'appelant':
    default:
      return '/dashboard';
  }
};


const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z.string(),
  requestedRole: z.enum(['appelant', 'livreur']).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

const roles = [
  { id: 'appelant', label: 'Appelant', icon: Phone, color: 'text-primary', bgColor: 'bg-primary/10', borderColor: 'border-primary', description: 'Gestion des appels clients' },
  { id: 'livreur', label: 'Livreur', icon: Truck, color: 'text-success', bgColor: 'bg-success/10', borderColor: 'border-success', description: 'Livraison des commandes' },
  { id: 'superviseur', label: 'Superviseur', icon: Users, color: 'text-warning', bgColor: 'bg-warning/10', borderColor: 'border-warning', description: 'Supervision des équipes' },
  { id: 'administrateur', label: 'Administrateur', icon: Shield, color: 'text-destructive', bgColor: 'bg-destructive/10', borderColor: 'border-destructive', description: 'Gestion complète' },
];

const signupRoles = [
  { id: 'appelant', label: 'Appelant (Téléconseiller)', icon: Phone, description: 'Gestion des appels et suivi clients' },
  { id: 'livreur', label: 'Livreur', icon: Truck, description: 'Livraison des commandes' },
];

export default function Auth() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'appelant' | 'livreur'>('appelant');
  const [selectedLoginRole, setSelectedLoginRole] = useState<AppRole>('appelant');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, signIn, signUp } = useAuth();

  useEffect(() => {
    if (user && role) {
      const redirectPath = getRedirectPathForRole(role);
      navigate(redirectPath);
    }
  }, [user, role, navigate]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      requestedRole: 'appelant',
    },
  });

  const onLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    
    if (error) {
      let message = 'Une erreur est survenue';
      if (error.message.includes('Invalid login credentials')) {
        message = 'Email ou mot de passe incorrect';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Veuillez confirmer votre email avant de vous connecter';
      }
      toast({
        title: 'Erreur de connexion',
        description: message,
        variant: 'destructive',
      });
      setIsLoading(false);
    } else {
      toast({
        title: 'Connexion réussie',
        description: 'Redirection vers votre espace...',
      });
      // Redirect based on selected role if user's actual role matches, otherwise redirect by actual role
      // The useEffect will handle actual role-based redirection
    }
  };

  const onSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.fullName);
    
    if (error) {
      let message = 'Une erreur est survenue';
      if (error.message.includes('User already registered')) {
        message = 'Cet email est déjà utilisé';
      } else if (error.message.includes('Password')) {
        message = 'Le mot de passe ne respecte pas les critères de sécurité';
      }
      toast({
        title: "Erreur d'inscription",
        description: message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // If user requested a role different from the default (appelant), create a role request
    if (selectedRole === 'livreur') {
      // We need to wait a bit for the user to be created
      setTimeout(async () => {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.user) {
          await supabase.from('role_requests').insert({
            user_id: session.session.user.id,
            requested_role: 'livreur' as AppRole,
            reason: 'Demandé lors de l\'inscription',
          });
        }
      }, 1000);
    }

    toast({
      title: 'Inscription réussie',
      description: selectedRole === 'livreur' 
        ? 'Votre compte a été créé. Votre demande pour devenir livreur est en attente de validation.'
        : 'Vérifiez votre email pour confirmer votre compte.',
    });
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{ background: 'var(--gradient-primary)' }}
        />
        <div className="absolute inset-0 bg-background/40" />
        <div 
          className="absolute inset-0"
          style={{ background: 'var(--gradient-glow)' }}
        />
        
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
          <div className="mb-8">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              GESTION
              <span className="text-gradient block">AUTOMATIQUE</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-md">
              Système complet de gestion des commandes, livraisons et paiements avec suivi en temps réel.
            </p>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Sélectionnez votre espace
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {roles.map((roleItem) => (
                <button
                  key={roleItem.id}
                  onClick={() => setSelectedLoginRole(roleItem.id as AppRole)}
                  className={`glass rounded-lg p-4 flex items-center gap-3 transition-all duration-200 text-left ${
                    selectedLoginRole === roleItem.id 
                      ? `ring-2 ${roleItem.borderColor} ${roleItem.bgColor}` 
                      : 'hover:bg-card/50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${roleItem.bgColor} ${roleItem.color}`}>
                    <roleItem.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground block">{roleItem.label}</span>
                    <span className="text-xs text-muted-foreground">{roleItem.description}</span>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Cliquez sur votre rôle puis connectez-vous
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md glass border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="lg:hidden mb-4">
              <h1 className="text-2xl font-bold">
                GESTION <span className="text-gradient">AUTOMATIQUE</span>
              </h1>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Bienvenue</CardTitle>
            <CardDescription className="text-muted-foreground">
              Connectez-vous ou créez un compte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Inscription</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  {/* Mobile Role Selection */}
                  <div className="lg:hidden space-y-2">
                    <Label>Votre espace</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {roles.map((roleItem) => (
                        <button
                          key={roleItem.id}
                          type="button"
                          onClick={() => setSelectedLoginRole(roleItem.id as AppRole)}
                          className={`rounded-lg p-3 flex items-center gap-2 transition-all duration-200 border ${
                            selectedLoginRole === roleItem.id 
                              ? `${roleItem.borderColor} ${roleItem.bgColor}` 
                              : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          <roleItem.icon className={`w-4 h-4 ${roleItem.color}`} />
                          <span className="text-xs font-medium text-foreground">{roleItem.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="votre@email.com"
                      {...loginForm.register('email')}
                      className="bg-input border-border"
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...loginForm.register('password')}
                        className="bg-input border-border pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Selected role indicator */}
                  <div className="hidden lg:flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                    {(() => {
                      const currentRole = roles.find(r => r.id === selectedLoginRole);
                      if (!currentRole) return null;
                      return (
                        <>
                          <currentRole.icon className={`w-4 h-4 ${currentRole.color}`} />
                          <span className="text-sm text-muted-foreground">
                            Connexion vers : <span className="font-medium text-foreground">{currentRole.label}</span>
                          </span>
                        </>
                      );
                    })()}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    variant="glow"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connexion...
                      </>
                    ) : (
                      'Se connecter'
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup">
                <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nom complet</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Jean Dupont"
                      {...signupForm.register('fullName')}
                      className="bg-input border-border"
                    />
                    {signupForm.formState.errors.fullName && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="votre@email.com"
                      {...signupForm.register('email')}
                      className="bg-input border-border"
                    />
                    {signupForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Role Selection */}
                  <div className="space-y-2">
                    <Label>Fonction souhaitée</Label>
                    <Select 
                      value={selectedRole} 
                      onValueChange={(v) => setSelectedRole(v as 'appelant' | 'livreur')}
                    >
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Sélectionnez votre fonction" />
                      </SelectTrigger>
                      <SelectContent>
                        {signupRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            <div className="flex items-center gap-2">
                              <role.icon className="h-4 w-4" />
                              <div className="flex flex-col">
                                <span>{role.label}</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {selectedRole === 'livreur' 
                        ? '⏳ Le rôle Livreur nécessite une validation par un administrateur.'
                        : '✅ Accès immédiat avec le rôle Appelant.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...signupForm.register('password')}
                        className="bg-input border-border pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {signupForm.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirmer le mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="signup-confirm"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...signupForm.register('confirmPassword')}
                        className="bg-input border-border pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {signupForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    variant="glow"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Inscription...
                      </>
                    ) : (
                      "S'inscrire"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
