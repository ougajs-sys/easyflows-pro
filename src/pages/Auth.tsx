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

  // Handle pending role creation after email confirmation
  useEffect(() => {
    const handlePendingRole = async () => {
      if (user && !role) {
        const pendingRoleStr = localStorage.getItem('pendingRole');
        if (pendingRoleStr) {
          try {
            const pendingRole = JSON.parse(pendingRoleStr);
            if (pendingRole.userId === user.id) {
              console.log('Creating pending role for user:', user.id);
              
              // Create the role
              const roleToCreate = pendingRole.role === 'livreur' ? 'appelant' : pendingRole.role;
              const { error: roleError } = await supabase
                .from('user_roles')
                .insert({
                  user_id: user.id,
                  role: roleToCreate as AppRole,
                });
              
              if (roleError) {
                console.error('Error creating pending role:', roleError);
                toast({
                  title: 'Erreur',
                  description: 'Erreur lors de la création du rôle. Contactez un administrateur.',
                  variant: 'destructive',
                });
              } else {
                // If the original request was for livreur, create the role request
                if (pendingRole.role === 'livreur') {
                  await supabase.from('role_requests').insert({
                    user_id: user.id,
                    requested_role: 'livreur' as AppRole,
                    reason: 'Demandé lors de l\'inscription',
                  });
                }
              }
              
              // Clear pending role from localStorage
              localStorage.removeItem('pendingRole');
              localStorage.removeItem('pendingRoleRequest');
            }
          } catch (err) {
            console.error('Error processing pending role:', err);
          }
        }
      }
    };
    
    handlePendingRole();
  }, [user, role, toast]);

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
      // After successful login, check if the selected role matches the user's actual role
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.session.user.id)
          .single();

        if (userRole && userRole.role !== selectedLoginRole) {
          const roleLabels: Record<AppRole, string> = {
            'appelant': 'Appelant',
            'livreur': 'Livreur',
            'superviseur': 'Superviseur',
            'administrateur': 'Administrateur'
          };
          
          toast({
            title: 'Accès refusé',
            description: `Vous êtes ${roleLabels[userRole.role]}, pas ${roleLabels[selectedLoginRole]}. Vous allez être redirigé vers votre espace.`,
            variant: 'destructive',
          });
          setIsLoading(false);
          // Redirect to their actual role space
          navigate(getRedirectPathForRole(userRole.role));
          return;
        }
      }
      
      toast({
        title: 'Connexion réussie',
        description: 'Redirection vers votre espace...',
      });
      // Redirect to selected role space
      navigate(getRedirectPathForRole(selectedLoginRole));
      setIsLoading(false);
    }
  };

  const onSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    
    try {
      // Use Supabase directly with auto-confirm enabled
      const { data: signupData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            full_name: data.fullName,
          },
        },
      });
      
      if (error) {
        let message = 'Une erreur est survenue';
        if (error.message.includes('User already registered')) {
          message = 'Cet email est déjà utilisé. Essayez de vous connecter.';
        } else if (error.message.includes('Password')) {
          message = 'Le mot de passe doit contenir au moins 6 caractères';
        } else if (error.message.includes('rate limit')) {
          message = 'Trop de tentatives. Veuillez réessayer dans quelques minutes.';
        } else {
          message = error.message;
        }
        toast({
          title: "Erreur d'inscription",
          description: message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Check if user was created and session exists (auto-confirm case)
      if (signupData?.user && signupData?.session) {
        // User is auto-confirmed, assign a default role
        console.log('Creating user role for:', signupData.user.id, 'with role:', selectedRole);
        
        if (selectedRole === 'livreur') {
          // For livreur: create role request and assign 'appelant' as temporary role
          // Business logic: Livreur role requires admin approval, so we assign 'appelant'
          // temporarily to allow immediate access while the request is pending
          try {
            // Insert temporary 'appelant' role
            const { error: roleError } = await supabase
              .from('user_roles')
              .insert({
                user_id: signupData.user.id,
                role: 'appelant' as AppRole,
              });
            
            if (roleError) {
              console.error('Error creating user role:', roleError);
              toast({
                title: 'Avertissement',
                description: 'Le rôle par défaut n\'a pas pu être créé. Contactez un administrateur si vous ne pouvez pas accéder au système.',
                variant: 'destructive',
              });
            }

            // Create role request for livreur
            const { error: requestError } = await supabase
              .from('role_requests')
              .insert({
                user_id: signupData.user.id,
                requested_role: 'livreur' as AppRole,
                reason: 'Demandé lors de l\'inscription',
              });
            
            if (requestError) {
              console.error('Error creating role request:', requestError);
              toast({
                title: 'Avertissement',
                description: 'La demande de rôle Livreur n\'a pas pu être enregistrée. Veuillez contacter un administrateur.',
                variant: 'destructive',
              });
            }

            toast({
              title: 'Inscription réussie !',
              description: 'Votre compte a été créé avec un accès Appelant. Votre demande de rôle Livreur sera examinée par un administrateur.',
              duration: 5000,
            });
          } catch (err) {
            console.error('Unexpected error during role creation:', err);
            toast({
              title: 'Avertissement',
              description: 'Une erreur est survenue lors de la création du rôle. Contactez un administrateur.',
              variant: 'destructive',
            });
          }
        } else {
          // For appelant: directly create the role
          try {
            const { error: roleError } = await supabase
              .from('user_roles')
              .insert({
                user_id: signupData.user.id,
                role: 'appelant' as AppRole,
              });
            
            if (roleError) {
              console.error('Error creating user role:', roleError);
              toast({
                title: 'Erreur',
                description: 'Le rôle n\'a pas pu être créé. Veuillez contacter un administrateur ou vérifier les permissions. Erreur: ' + roleError.message,
                variant: 'destructive',
                duration: 10000,
              });
            } else {
              toast({
                title: 'Inscription réussie !',
                description: 'Votre compte a été créé. Redirection en cours...',
              });
            }
          } catch (err) {
            console.error('Unexpected error during role creation:', err);
            toast({
              title: 'Erreur',
              description: 'Une erreur inattendue est survenue. Veuillez réessayer ou contacter un administrateur.',
              variant: 'destructive',
            });
          }
        }
        
        // Redirect to dashboard after a short delay
        setTimeout(() => navigate('/dashboard'), 1500);
      } else if (signupData?.user && !signupData?.session) {
        // Email confirmation required - store the selected role for later
        localStorage.setItem('pendingRole', JSON.stringify({
          userId: signupData.user.id,
          role: selectedRole,
        }));

        if (selectedRole === 'livreur') {
          // Store role request for later (after email confirmation)
          localStorage.setItem('pendingRoleRequest', JSON.stringify({
            userId: signupData.user.id,
            role: 'livreur',
          }));
        }

        toast({
          title: 'Inscription réussie !',
          description: 'Un email de confirmation vous a été envoyé. Vérifiez votre boîte de réception (et spam).',
          duration: 10000,
        });
      }
    } catch (err) {
      console.error('Signup error:', err);
      toast({
        title: "Erreur d'inscription",
        description: 'Une erreur inattendue est survenue. Veuillez réessayer.',
        variant: 'destructive',
      });
    }
    
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
