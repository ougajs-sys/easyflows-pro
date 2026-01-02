import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Banknote, Smartphone, Building2, Calendar } from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';
import { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type PaymentStatus = Database['public']['Enums']['payment_status'];
type PaymentMethod = Database['public']['Enums']['payment_method'];

interface PaymentsTableProps {
  searchQuery: string;
  statusFilter: PaymentStatus | 'all';
  methodFilter: PaymentMethod | 'all';
}

const statusLabels: Record<PaymentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'outline' },
  completed: { label: 'Complété', variant: 'default' },
  failed: { label: 'Échoué', variant: 'destructive' },
  refunded: { label: 'Remboursé', variant: 'secondary' },
};

const methodLabels: Record<PaymentMethod, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  cash: { label: 'Espèces', icon: Banknote },
  mobile_money: { label: 'Mobile Money', icon: Smartphone },
  card: { label: 'Carte', icon: CreditCard },
  transfer: { label: 'Virement', icon: Building2 },
};

export function PaymentsTable({ searchQuery, statusFilter, methodFilter }: PaymentsTableProps) {
  const { payments, isLoading } = usePayments();

  const filteredPayments = payments.filter((payment) => {
    const clientName = payment.order?.client?.full_name || '';
    const orderNumber = payment.order?.order_number || '';
    const reference = payment.reference || '';
    
    const matchesSearch =
      clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reference.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || payment.method === methodFilter;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historique des paiements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des paiements ({filteredPayments.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Commande</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Référence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun paiement trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => {
                  const MethodIcon = methodLabels[payment.method].icon;
                  return (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(payment.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {payment.order?.order_number || '-'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.order?.client?.full_name || '-'}</div>
                          <div className="text-xs text-muted-foreground">
                            {payment.order?.client?.phone || ''}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        {Number(payment.amount).toLocaleString()} DH
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MethodIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{methodLabels[payment.method].label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusLabels[payment.status].variant}>
                          {statusLabels[payment.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {payment.reference || '-'}
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
