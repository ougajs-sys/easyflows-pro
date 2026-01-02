import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, Package, CreditCard, Phone, CheckCheck, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const notificationIcons = {
  new_order: Package,
  status_change: Package,
  payment: CreditCard,
  follow_up: Phone,
};

const notificationColors = {
  new_order: 'text-blue-500 bg-blue-500/10',
  status_change: 'text-orange-500 bg-orange-500/10',
  payment: 'text-green-500 bg-green-500/10',
  follow_up: 'text-purple-500 bg-purple-500/10',
};

export default function Notifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Bell className="h-8 w-8" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-sm">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              Suivez les nouvelles commandes et mises à jour en temps réel
            </p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Tout marquer comme lu
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="outline" onClick={clearNotifications}>
                <Trash2 className="h-4 w-4 mr-2" />
                Effacer tout
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {Object.entries(notificationColors).map(([type, color]) => {
            const count = notifications.filter(n => n.type === type).length;
            const Icon = notificationIcons[type as keyof typeof notificationIcons];
            const labels = {
              new_order: 'Nouvelles commandes',
              status_change: 'Changements de statut',
              payment: 'Paiements',
              follow_up: 'Relances',
            };

            return (
              <Card key={type}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {labels[type as keyof typeof labels]}
                  </CardTitle>
                  <div className={cn('p-2 rounded-lg', color.split(' ')[1])}>
                    <Icon className={cn('h-4 w-4', color.split(' ')[0])} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des notifications</CardTitle>
            <CardDescription>
              Les 50 dernières notifications sont conservées
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune notification pour le moment</p>
                <p className="text-sm">Les notifications apparaîtront ici en temps réel</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {notifications.map((notification) => {
                    const Icon = notificationIcons[notification.type];
                    const color = notificationColors[notification.type];

                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          'flex items-start gap-4 p-4 rounded-lg border transition-colors cursor-pointer',
                          notification.read
                            ? 'bg-background'
                            : 'bg-primary/5 border-primary/20'
                        )}
                        onClick={() => !notification.read && markAsRead(notification.id)}
                      >
                        <div className={cn('p-2 rounded-lg shrink-0', color.split(' ')[1])}>
                          <Icon className={cn('h-5 w-5', color.split(' ')[0])} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{notification.title}</h4>
                            {!notification.read && (
                              <Badge variant="default" className="text-xs">
                                Nouveau
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
