import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Package, CreditCard, Phone } from 'lucide-react';

const notificationIcons = {
  new_order: Package,
  status_change: Package,
  payment: CreditCard,
  follow_up: Phone,
};

const notificationColors = {
  new_order: 'text-blue-500',
  status_change: 'text-orange-500',
  payment: 'text-green-500',
  follow_up: 'text-purple-500',
};

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const recentNotifications = notifications.slice(0, 5);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</Badge>
            )}
          </div>
        </div>
        
        {recentNotifications.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            Aucune notification
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="divide-y">
              {recentNotifications.map((notification) => {
                const Icon = notificationIcons[notification.type];
                const color = notificationColors[notification.type];

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-3 hover:bg-muted/50 cursor-pointer transition-colors',
                      !notification.read && 'bg-primary/5'
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
        
        <div className="p-2 border-t">
          <Link to="/notifications">
            <Button variant="ghost" className="w-full text-sm">
              Voir toutes les notifications
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
