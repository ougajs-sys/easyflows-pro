import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useRoleRequests } from '@/hooks/useRoleRequests';
import { 
  Camera, 
  Save, 
  Loader2, 
  User, 
  Phone, 
  Mail, 
  Shield, 
  Crown, 
  Truck, 
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const profileSchema = z.object({
  full_name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const roleConfig: Record<AppRole, { label: string; icon: React.ReactNode; color: string }> = {
  administrateur: { label: 'Administrateur', icon: <Crown className="h-4 w-4" />, color: 'text-red-500' },
  superviseur: { label: 'Superviseur', icon: <Shield className="h-4 w-4" />, color: 'text-blue-500' },
  livreur: { label: 'Livreur', icon: <Truck className="h-4 w-4" />, color: 'text-green-500' },
  appelant: { label: 'Appelant', icon: <Phone className="h-4 w-4" />, color: 'text-amber-500' },
};

export function UserProfile() {
  const { user, role } = useAuth();
  const { profile, isLoading, updateProfile, uploadAvatar } = useProfile();
  const { myRequests, hasPendingRequest, createRequest } = useRoleRequests();
  const { toast } = useToast();
  
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [requestReason, setRequestReason] = useState('');

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
    },
    values: {
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile.mutateAsync(data);
      toast({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été enregistrées.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le profil.',
        variant: 'destructive',
      });
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'La taille maximale est de 2 Mo.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await uploadAvatar.mutateAsync(file);
      toast({
        title: 'Photo mise à jour',
        description: 'Votre photo de profil a été changée.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Impossible d'uploader la photo.",
        variant: 'destructive',
      });
    }
  };

  const handleRoleRequest = async () => {
    if (!selectedRole) return;

    try {
      await createRequest.mutateAsync({ 
        requestedRole: selectedRole as AppRole, 
        reason: requestReason || undefined 
      });
      toast({
        title: 'Demande envoyée',
        description: 'Votre demande de changement de rôle a été soumise pour validation.',
      });
      setSelectedRole('');
      setRequestReason('');
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de soumettre la demande.',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const currentRoleInfo = role ? roleConfig[role] : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mon Profil</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles et vos préférences
        </p>
      </div>

      {/* Profile Card */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informations personnelles
          </CardTitle>
          <CardDescription>
            Modifiez vos informations de profil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer hover:bg-primary/80 transition-colors">
                <Camera className="h-4 w-4 text-primary-foreground" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={uploadAvatar.isPending}
                />
              </label>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{profile?.full_name || 'Utilisateur'}</h3>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="text-sm">{user?.email}</span>
              </div>
              {currentRoleInfo && (
                <Badge className="mt-2" variant="secondary">
                  <span className={currentRoleInfo.color}>{currentRoleInfo.icon}</span>
                  <span className="ml-1">{currentRoleInfo.label}</span>
                </Badge>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nom complet</Label>
                <Input
                  id="full_name"
                  {...form.register('full_name')}
                  placeholder="Votre nom complet"
                />
                {form.formState.errors.full_name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.full_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  {...form.register('phone')}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={updateProfile.isPending}
              className="gap-2"
            >
              {updateProfile.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer les modifications
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Role Request Card */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Demande de rôle
          </CardTitle>
          <CardDescription>
            Demandez à changer votre fonction sur la plateforme. Un administrateur validera votre demande.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasPendingRequest ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
              <Clock className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium">Demande en cours</p>
                <p className="text-sm text-muted-foreground">
                  Vous avez déjà une demande en attente de validation.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Rôle souhaité</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {role !== 'livreur' && (
                      <SelectItem value="livreur">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-green-500" />
                          Livreur
                        </div>
                      </SelectItem>
                    )}
                    {role !== 'appelant' && (
                      <SelectItem value="appelant">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-amber-500" />
                          Appelant
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Note: Le rôle Superviseur ne peut être attribué que par un administrateur.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motif (optionnel)</Label>
                <Textarea
                  id="reason"
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Expliquez pourquoi vous souhaitez ce rôle..."
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleRoleRequest}
                disabled={!selectedRole || createRequest.isPending}
                className="gap-2"
              >
                {createRequest.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                Soumettre la demande
              </Button>
            </>
          )}

          {/* Request History */}
          {myRequests.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="font-medium text-sm">Historique des demandes</h4>
              <div className="space-y-2">
                {myRequests.slice(0, 5).map((request) => {
                  const roleInfo = roleConfig[request.requested_role];
                  return (
                    <div 
                      key={request.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className={roleInfo.color}>{roleInfo.icon}</span>
                        <span className="text-sm">{roleInfo.label}</span>
                      </div>
                      <Badge 
                        variant={
                          request.status === 'approved' ? 'default' : 
                          request.status === 'rejected' ? 'destructive' : 
                          'secondary'
                        }
                        className="gap-1"
                      >
                        {request.status === 'approved' && <CheckCircle2 className="h-3 w-3" />}
                        {request.status === 'rejected' && <XCircle className="h-3 w-3" />}
                        {request.status === 'pending' && <Clock className="h-3 w-3" />}
                        {request.status === 'approved' ? 'Approuvée' : 
                         request.status === 'rejected' ? 'Refusée' : 'En attente'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
