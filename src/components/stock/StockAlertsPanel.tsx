import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Bell, BellOff, Package, Truck, CheckCircle, Settings } from 'lucide-react';
import { useStockAlerts } from '@/hooks/useStockAlerts';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function StockAlertsPanel() {
  const { alerts, thresholds, isLoading, acknowledgeAlert, updateThreshold, criticalCount, warningCount } = useStockAlerts();
  const [selectedThreshold, setSelectedThreshold] = useState<{
    productId: string;
    locationType: 'warehouse' | 'delivery_person';
    warning: number;
    critical: number;
  } | null>(null);

  const warehouseAlerts = alerts.filter(a => a.alert_type === 'warehouse');
  const deliveryAlerts = alerts.filter(a => a.alert_type === 'delivery_person');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-destructive text-destructive-foreground';
      case 'warning':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleThresholdSave = () => {
    if (selectedThreshold) {
      updateThreshold.mutate({
        productId: selectedThreshold.productId,
        locationType: selectedThreshold.locationType,
        warningThreshold: selectedThreshold.warning,
        criticalThreshold: selectedThreshold.critical,
      });
      setSelectedThreshold(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-24 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertes de Stock
            </CardTitle>
            <CardDescription>
              Surveillance des niveaux de stock critiques
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {criticalCount} critique{criticalCount > 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                {warningCount} avertissement{warningCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="warehouse" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="warehouse" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Bureau ({warehouseAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="delivery" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Livreurs ({deliveryAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Seuils
            </TabsTrigger>
          </TabsList>

          <TabsContent value="warehouse">
            <ScrollArea className="h-[400px]">
              {warehouseAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BellOff className="h-12 w-12 mb-4 opacity-50" />
                  <p>Aucune alerte pour le bureau</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {warehouseAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border ${
                        alert.severity === 'critical' 
                          ? 'border-destructive/50 bg-destructive/5' 
                          : 'border-warning/50 bg-warning/5'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                            alert.severity === 'critical' ? 'text-destructive' : 'text-warning'
                          }`} />
                          <div>
                            <h4 className="font-medium">{alert.product?.name || 'Produit inconnu'}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Stock actuel: <span className="font-semibold text-foreground">{alert.current_quantity}</span>
                              {' '} (seuil: {alert.threshold})
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: fr })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity === 'critical' ? 'Critique' : 'Attention'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlert.mutate(alert.id)}
                            disabled={acknowledgeAlert.isPending}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="delivery">
            <ScrollArea className="h-[400px]">
              {deliveryAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BellOff className="h-12 w-12 mb-4 opacity-50" />
                  <p>Aucune alerte pour les livreurs</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveryAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border ${
                        alert.severity === 'critical' 
                          ? 'border-destructive/50 bg-destructive/5' 
                          : 'border-warning/50 bg-warning/5'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Truck className={`h-5 w-5 mt-0.5 ${
                            alert.severity === 'critical' ? 'text-destructive' : 'text-warning'
                          }`} />
                          <div>
                            <h4 className="font-medium">{alert.product?.name || 'Produit inconnu'}</h4>
                            <p className="text-sm text-muted-foreground">
                              Zone: {alert.delivery_person?.zone || 'Non définie'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Stock actuel: <span className="font-semibold text-foreground">{alert.current_quantity}</span>
                              {' '} (seuil: {alert.threshold})
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: fr })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity === 'critical' ? 'Critique' : 'Attention'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlert.mutate(alert.id)}
                            disabled={acknowledgeAlert.isPending}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settings">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Configurez les seuils d'alerte pour chaque produit. Les alertes seront déclenchées automatiquement.
                </p>
                
                {thresholds.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun seuil configuré
                  </p>
                ) : (
                  <div className="space-y-2">
                    {thresholds.map((threshold) => (
                      <div
                        key={threshold.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {threshold.location_type === 'warehouse' ? (
                            <Package className="h-4 w-4 text-primary" />
                          ) : (
                            <Truck className="h-4 w-4 text-success" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{threshold.product?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {threshold.location_type === 'warehouse' ? 'Bureau' : 'Livreur'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Avertissement</p>
                            <p className="font-medium text-warning">{threshold.warning_threshold}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Critique</p>
                            <p className="font-medium text-destructive">{threshold.critical_threshold}</p>
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedThreshold({
                                  productId: threshold.product_id,
                                  locationType: threshold.location_type,
                                  warning: threshold.warning_threshold,
                                  critical: threshold.critical_threshold,
                                })}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Modifier les seuils</DialogTitle>
                                <DialogDescription>
                                  Définissez les seuils d'alerte pour {threshold.product?.name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Seuil d'avertissement</Label>
                                  <Input
                                    type="number"
                                    value={selectedThreshold?.warning || threshold.warning_threshold}
                                    onChange={(e) => setSelectedThreshold(prev => prev ? {
                                      ...prev,
                                      warning: parseInt(e.target.value) || 0,
                                    } : null)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Seuil critique</Label>
                                  <Input
                                    type="number"
                                    value={selectedThreshold?.critical || threshold.critical_threshold}
                                    onChange={(e) => setSelectedThreshold(prev => prev ? {
                                      ...prev,
                                      critical: parseInt(e.target.value) || 0,
                                    } : null)}
                                  />
                                </div>
                                <Button
                                  onClick={handleThresholdSave}
                                  disabled={updateThreshold.isPending}
                                  className="w-full"
                                >
                                  Enregistrer
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
