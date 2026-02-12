import React, { Component, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell } from 'lucide-react';
import { PushNotificationSettings } from './PushNotificationSettings';

interface ErrorBoundaryState {
  hasError: boolean;
}

class PushNotificationErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('PushNotificationSettings error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications Push
            </CardTitle>
            <CardDescription>
              Les paramètres de notifications ne sont pas disponibles pour le moment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Veuillez réessayer ultérieurement ou rafraîchir la page.
            </p>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export function PushNotificationSettingsWrapper() {
  return (
    <PushNotificationErrorBoundary>
      <PushNotificationSettings />
    </PushNotificationErrorBoundary>
  );
}
