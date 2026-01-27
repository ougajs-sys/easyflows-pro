import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSupervisorRevenues } from "@/hooks/useSupervisorRevenues";
import { formatCurrency } from "@/lib/formatCurrency";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  Download,
  Loader2,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function SupervisorRevenueTracking() {
  const [statusFilter, setStatusFilter] = useState<'collected' | 'deposited' | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [callerFilter, setCallerFilter] = useState<string | undefined>(undefined);

  const { allRevenues, isLoading, revenueByCallers, statsLoading } = useSupervisorRevenues({
    status: statusFilter,
    startDate,
    endDate,
    callerId: callerFilter,
  });

  // Calculate totals
  const totalCollected = allRevenues
    .filter(r => r.status === 'collected')
    .reduce((sum, r) => sum + Number(r.amount), 0);
  
  const totalDeposited = allRevenues
    .filter(r => r.status === 'deposited')
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const totalRevenue = totalCollected + totalDeposited;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-gradient">Suivi des</span> Recettes
        </h1>
        <p className="text-muted-foreground">
          Visualisez les recettes encaissées et versées par chaque appelant
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Recettes</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Encaissé</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCollected)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Versé</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalDeposited)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Appelants</p>
                <p className="text-2xl font-bold">{revenueByCallers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Callers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recettes par Appelant
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : revenueByCallers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune recette trouvée
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Appelant</TableHead>
                  <TableHead className="text-right">Encaissé</TableHead>
                  <TableHead className="text-right">Versé</TableHead>
                  <TableHead className="text-right">À Verser</TableHead>
                  <TableHead className="text-right">Paiements</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueByCallers.map((caller) => (
                  <TableRow key={caller.callerId}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{caller.profile?.full_name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{caller.profile?.phone || ''}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium text-green-600">
                        {formatCurrency(caller.totalCollected)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium text-blue-600">
                        {formatCurrency(caller.totalDeposited)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium text-orange-600">
                        {formatCurrency(caller.totalToDeposit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        {caller.collectedCount + caller.depositedCount}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres et Détails
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={statusFilter || 'all'}
              onValueChange={(value) => setStatusFilter(value === 'all' ? undefined : value as 'collected' | 'deposited')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="collected">Encaissé</SelectItem>
                <SelectItem value="deposited">Versé</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="Date début"
              onChange={(e) => {
                if (e.target.value) {
                  const date = new Date(e.target.value + 'T00:00:00');
                  setStartDate(date);
                } else {
                  setStartDate(undefined);
                }
              }}
            />

            <Input
              type="date"
              placeholder="Date fin"
              onChange={(e) => {
                if (e.target.value) {
                  const date = new Date(e.target.value + 'T23:59:59');
                  setEndDate(date);
                } else {
                  setEndDate(undefined);
                }
              }}
            />

            <Button variant="outline" onClick={() => {
              setStatusFilter(undefined);
              setStartDate(undefined);
              setEndDate(undefined);
              setCallerFilter(undefined);
            }}>
              Réinitialiser
            </Button>
          </div>

          {/* Revenue Details Table */}
          <div className="border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : allRevenues.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucune recette trouvée
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Appelant</TableHead>
                    <TableHead>Commande</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allRevenues.map((revenue) => (
                    <TableRow key={revenue.id}>
                      <TableCell className="text-sm">
                        {format(new Date(revenue.collected_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{revenue.collected_by_profile?.full_name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{revenue.collected_by_profile?.phone || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {revenue.order?.order_number || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{revenue.order?.client?.full_name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{revenue.order?.client?.phone || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {revenue.payment_method === 'cash' && 'Espèces'}
                        {revenue.payment_method === 'mobile_money' && 'Mobile Money'}
                        {revenue.payment_method === 'card' && 'Carte'}
                        {revenue.payment_method === 'transfer' && 'Virement'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(revenue.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={revenue.status === 'collected' ? 'default' : 'secondary'}>
                          {revenue.status === 'collected' ? 'Encaissé' : 'Versé'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
