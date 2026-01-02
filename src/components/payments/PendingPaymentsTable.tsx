import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CreditCard, Phone, AlertCircle } from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PendingPaymentsTableProps {
  onAddPayment: () => void;
}

export function PendingPaymentsTable({ onAddPayment }: PendingPaymentsTableProps) {
  const { pendingOrders, pendingOrdersLoading } = usePayments();

  if (pendingOrdersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commandes avec montant dû</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Commandes avec montant dû ({pendingOrders.length})
        </CardTitle>
        <CardDescription>
          Liste des commandes ayant un solde restant à payer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commande</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payé</TableHead>
                <TableHead>Reste dû</TableHead>
                <TableHead>Progression</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <CreditCard className="h-8 w-8 text-green-500" />
                      <span>Aucun montant dû - Tous les paiements sont à jour !</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pendingOrders.map((order) => {
                  const total = Number(order.total_amount);
                  const paid = Number(order.amount_paid);
                  const due = Number(order.amount_due || 0);
                  const progressPercent = total > 0 ? (paid / total) * 100 : 0;

                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.order_number}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), 'dd MMM yyyy', { locale: fr })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.client?.full_name || '-'}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {order.client?.phone || '-'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {total.toLocaleString()} DH
                      </TableCell>
                      <TableCell className="text-green-600">
                        {paid.toLocaleString()} DH
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          {due.toLocaleString()} DH
                        </Badge>
                      </TableCell>
                      <TableCell className="w-32">
                        <div className="space-y-1">
                          <Progress value={progressPercent} className="h-2" />
                          <span className="text-xs text-muted-foreground">
                            {progressPercent.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={onAddPayment}>
                          <CreditCard className="h-4 w-4 mr-1" />
                          Payer
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
