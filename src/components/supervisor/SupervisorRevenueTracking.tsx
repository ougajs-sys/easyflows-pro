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
import { usePendingDeposits, useRealtimePendingDeposits } from "@/hooks/usePendingDeposits";
import { PendingDepositsPanel } from "./PendingDepositsPanel";
import { formatCurrency } from "@/lib/formatCurrency";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  Download,
  Loader2,
  Filter,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function SupervisorRevenueTracking() {
  const [statusFilter, setStatusFilter] = useState<'collected' | 'deposited' | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [callerFilter, setCallerFilter] = useState<string | undefined>(undefined);

  const { allRevenues, isLoading, allDeposits, revenueByCallers, statsLoading } = useSupervisorRevenues({
    status: statusFilter,
    startDate,
    endDate,
    callerId: callerFilter,
  });

  const { pendingCount, totalPendingAmount } = usePendingDeposits();
  
  // Enable real-time updates
  useRealtimePendingDeposits();

  // Calculate totals
  const totalCollected = allRevenues
    .filter(r => r.status === 'collected')
    .reduce((sum, r) => sum + Number(r.amount), 0);
  
  const totalDeposited = allRevenues
    .filter(r => r.status === 'deposited')
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const totalRevenue = totalCollected + totalDeposited;

  // Calculate confirmed deposits (Caisse) - only confirmed status
  const totalConfirmedDeposits = allDeposits
    .filter(d => d.status === 'confirmed')
    .reduce((sum, d) => sum + Number(d.total_amount), 0);

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

      {/* Pending Deposits Panel - Most Important! */}
      <PendingDepositsPanel />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total Recettes</p>
                <p className="text-lg md:text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Encaissé</p>
                <p className="text-lg md:text-2xl font-bold text-emerald-600">{formatCurrency(totalCollected)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 rounded-lg bg-sky-500/10">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Versé</p>
                <p className="text-lg md:text-2xl font-bold text-sky-600">{formatCurrency(totalDeposited)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Recettes Confirmées (Caisse)</p>
                <p className="text-lg md:text-2xl font-bold text-green-600">
                  {formatCurrency(totalConfirmedDeposits)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={pendingCount > 0 ? "border-amber-500/30 bg-amber-500/5" : ""}>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">En attente</p>
                <p className="text-lg md:text-2xl font-bold text-amber-600">
                  {formatCurrency(totalPendingAmount)}
                </p>
                {pendingCount > 0 && (
                  <p className="text-xs text-amber-600">{pendingCount} versement{pendingCount > 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Appelants</p>
                <p className="text-lg md:text-2xl font-bold">{revenueByCallers.length}</p>
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
            <>
              {/* Vue Mobile: Cartes */}
              <div className="block md:hidden space-y-3">
                {revenueByCallers.map((caller) => (
                  <Card key={caller.callerId} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium">{caller.profile?.full_name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{caller.profile?.phone || ''}</p>
                      </div>
                      <Badge variant="secondary">
                        {caller.collectedCount + caller.depositedCount} paiements
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Encaissé</p>
                        <p className="font-medium text-sm text-emerald-600">
                          {formatCurrency(caller.totalCollected)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Versé</p>
                        <p className="font-medium text-sm text-sky-600">
                          {formatCurrency(caller.totalDeposited)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">À verser</p>
                        <p className="font-medium text-sm text-amber-600">
                          {formatCurrency(caller.totalToDeposit)}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Vue Desktop: Tableau */}
              <div className="hidden md:block overflow-x-auto">
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
                          <span className="font-medium text-emerald-600">
                            {formatCurrency(caller.totalCollected)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium text-sky-600">
                            {formatCurrency(caller.totalDeposited)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium text-amber-600">
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
              </div>
            </>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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

          {/* Revenue Details */}
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
              <>
                {/* Vue Mobile: Cartes */}
                <div className="block md:hidden p-3 space-y-3">
                  {allRevenues.slice(0, 20).map((revenue) => (
                    <Card key={revenue.id} className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(revenue.collected_at), 'dd/MM/yy HH:mm', { locale: fr })}
                          </p>
                          <p className="font-medium text-sm">{revenue.order?.order_number || 'N/A'}</p>
                        </div>
                        <Badge variant={revenue.status === 'collected' ? 'default' : 'secondary'} className="text-xs">
                          {revenue.status === 'collected' ? 'Encaissé' : 'Versé'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Appelant</p>
                          <p className="font-medium truncate">{revenue.collected_by_profile?.full_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Client</p>
                          <p className="font-medium truncate">{revenue.order?.client?.full_name || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2 pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                          {revenue.payment_method === 'cash' && 'Espèces'}
                          {revenue.payment_method === 'mobile_money' && 'Mobile Money'}
                          {revenue.payment_method === 'card' && 'Carte'}
                          {revenue.payment_method === 'transfer' && 'Virement'}
                          {!revenue.payment_method && 'N/A'}
                        </span>
                        <span className="font-bold text-primary">
                          {formatCurrency(Number(revenue.amount))}
                        </span>
                      </div>
                    </Card>
                  ))}
                  {allRevenues.length > 20 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      Et {allRevenues.length - 20} autres recettes...
                    </p>
                  )}
                </div>

                {/* Vue Desktop: Tableau */}
                <div className="hidden md:block overflow-x-auto">
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
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(revenue.collected_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">{revenue.collected_by_profile?.full_name || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">{revenue.collected_by_profile?.phone || ''}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-medium whitespace-nowrap">
                            {revenue.order?.order_number || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{revenue.order?.client?.full_name || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">{revenue.order?.client?.phone || ''}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {revenue.payment_method === 'cash' && 'Espèces'}
                            {revenue.payment_method === 'mobile_money' && 'Mobile Money'}
                            {revenue.payment_method === 'card' && 'Carte'}
                            {revenue.payment_method === 'transfer' && 'Virement'}
                          </TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap">
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
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
