import { useEffect, useState, useCallback } from "react";
import { DollarSign, Plus, Search, Loader2, Filter, TrendingUp, CreditCard, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "@/components/landing/Navbar";
import AiAssistant from "@/components/dashboard/AiAssistant";
import MonthlyRevenueChart from "@/components/dashboard/MonthlyRevenueChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type Payment = {
  id: string;
  amount: number;
  status: string;
  payment_type: string;
  payment_method: string | null;
  external_reference: string | null;
  created_at: string;
  client_name: string;
  service_name: string;
  appointment_date: string;
};

type Appointment = {
  id: string;
  client_name: string;
  service_name: string;
  service_price: number;
  starts_at: string;
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  completed: { label: "Completado", variant: "default" },
  pending: { label: "Pendiente", variant: "secondary" },
  refunded: { label: "Reembolsado", variant: "outline" },
  failed: { label: "Fallido", variant: "destructive" },
};

const typeLabels: Record<string, string> = {
  full: "Pago total",
  deposit: "Anticipo",
  remaining: "Saldo",
};

const Payments = () => {
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // New payment form
  const [selectedAppt, setSelectedAppt] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("full");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [externalRef, setExternalRef] = useState("");

  // Summary
  const [summary, setSummary] = useState({ total: 0, completed: 0, pending: 0, count: 0 });

  const navigate = useNavigate();

  const fetchPayments = useCallback(async (pid: string) => {
    const { data, error } = await supabase
      .from("payments")
      .select("*, appointments(starts_at, clients(full_name), services(name))")
      .eq("profile_id", pid)
      .order("created_at", { ascending: false });

    if (error) { toast.error("Error al cargar pagos"); return; }

    const mapped: Payment[] = (data || []).map((p: any) => ({
      id: p.id,
      amount: Number(p.amount),
      status: p.status,
      payment_type: p.payment_type,
      payment_method: p.payment_method,
      external_reference: p.external_reference,
      created_at: p.created_at,
      client_name: p.appointments?.clients?.full_name || "—",
      service_name: p.appointments?.services?.name || "—",
      appointment_date: p.appointments?.starts_at || "",
    }));

    setPayments(mapped);

    const completedTotal = mapped.filter(p => p.status === "completed").reduce((s, p) => s + p.amount, 0);
    const pendingTotal = mapped.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);
    setSummary({
      total: completedTotal + pendingTotal,
      completed: completedTotal,
      pending: pendingTotal,
      count: mapped.length,
    });
  }, []);

  const fetchAppointments = useCallback(async (pid: string) => {
    const { data } = await supabase
      .from("appointments")
      .select("id, starts_at, clients(full_name), services(name, price)")
      .eq("profile_id", pid)
      .in("status", ["confirmed", "completed"])
      .order("starts_at", { ascending: false })
      .limit(50);

    setAppointments(
      (data || []).map((a: any) => ({
        id: a.id,
        client_name: a.clients?.full_name || "—",
        service_name: a.services?.name || "—",
        service_price: Number(a.services?.price || 0),
        starts_at: a.starts_at,
      }))
    );
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, onboarding_completed")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!profile || !profile.onboarding_completed) { navigate("/onboarding"); return; }
      setProfileId(profile.id);
      await Promise.all([fetchPayments(profile.id), fetchAppointments(profile.id)]);
      setLoading(false);
    };
    load();
  }, [navigate, fetchPayments, fetchAppointments]);

  const openNew = () => {
    setSelectedAppt("");
    setAmount("");
    setPaymentType("full");
    setPaymentMethod("");
    setExternalRef("");
    setDialogOpen(true);
  };

  const handleSelectAppt = (apptId: string) => {
    setSelectedAppt(apptId);
    const appt = appointments.find(a => a.id === apptId);
    if (appt) setAmount(String(appt.service_price));
  };

  const handleSave = async () => {
    if (!selectedAppt) { toast.error("Selecciona una cita"); return; }
    if (!amount || Number(amount) <= 0) { toast.error("Ingresa un monto válido"); return; }
    if (!profileId) return;
    setSaving(true);

    const appt = appointments.find(a => a.id === selectedAppt);
    if (!appt) { toast.error("Cita no encontrada"); setSaving(false); return; }

    // Get client_id from appointment
    const { data: apptData } = await supabase
      .from("appointments")
      .select("client_id")
      .eq("id", selectedAppt)
      .maybeSingle();

    if (!apptData) { toast.error("Error al obtener datos de la cita"); setSaving(false); return; }

    const { error } = await supabase.from("payments").insert({
      profile_id: profileId,
      appointment_id: selectedAppt,
      client_id: apptData.client_id,
      amount: Number(amount),
      payment_type: paymentType as any,
      payment_method: paymentMethod.trim() || null,
      external_reference: externalRef.trim() || null,
      status: "completed",
    });

    if (error) { toast.error("Error al registrar el pago"); setSaving(false); return; }

    // Update client total_spent
    await supabase.rpc
    // Simple approach: re-fetch
    toast.success("Pago registrado exitosamente");
    setDialogOpen(false);
    setSaving(false);
    await fetchPayments(profileId);
  };

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = p.client_name.toLowerCase().includes(q) || p.service_name.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const summaryCards = [
    { label: "Total Cobrado", value: formatCurrency(summary.completed), icon: TrendingUp, color: "text-primary" },
    { label: "Pendiente de Cobro", value: formatCurrency(summary.pending), icon: CreditCard, color: "text-muted-foreground" },
    { label: "Total Operaciones", value: String(summary.count), icon: DollarSign, color: "text-primary" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12 px-4 container mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Pagos</h1>
            <p className="text-muted-foreground">Registra cobros y consulta tu historial de ingresos.</p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> Registrar Pago
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {summaryCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{card.label}</span>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{card.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Monthly Revenue Chart */}
        <MonthlyRevenueChart payments={payments} />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente o servicio..."
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="completed">Completado</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="refunded">Reembolsado</SelectItem>
              <SelectItem value="failed">Fallido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payments Table */}
        {filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <p className="text-muted-foreground">
              {search || statusFilter !== "all"
                ? "No se encontraron pagos con esos filtros."
                : "Todavía no hay pagos registrados."}
            </p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filtered.map((p, i) => {
                    const st = statusConfig[p.status] || statusConfig.pending;
                    return (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <TableCell className="text-sm">
                          {new Date(p.created_at).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="font-medium">{p.client_name}</TableCell>
                        <TableCell>{p.service_name}</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {typeLabels[p.payment_type] || p.payment_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.payment_method || "—"}
                        </TableCell>
                        <TableCell className="text-right font-display font-semibold">
                          {formatCurrency(p.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* New Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Registrar Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Cita *</Label>
              <Select value={selectedAppt} onValueChange={handleSelectAppt}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una cita" />
                </SelectTrigger>
                <SelectContent>
                  {appointments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.client_name} — {a.service_name} ({new Date(a.starts_at).toLocaleDateString("es-MX")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Monto *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Tipo de pago</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Pago total</SelectItem>
                  <SelectItem value="deposit">Anticipo</SelectItem>
                  <SelectItem value="remaining">Saldo restante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="method">Método de pago</Label>
              <Input
                id="method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="Efectivo, transferencia, tarjeta..."
              />
            </div>
            <div>
              <Label htmlFor="ref">Referencia externa</Label>
              <Input
                id="ref"
                value={externalRef}
                onChange={(e) => setExternalRef(e.target.value)}
                placeholder="Nro de comprobante, ID de transacción..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Registrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AiAssistant />
    </div>
  );
};

export default Payments;
