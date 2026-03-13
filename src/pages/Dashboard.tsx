import { Calendar, Users, DollarSign, Clock, CheckCircle2, BarChart3, Loader2, ArrowRight, Plus, Pencil, CalendarDays, Package, Share2, Copy } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import AiAssistant from "@/components/dashboard/AiAssistant";
import NewAppointmentDialog from "@/components/dashboard/NewAppointmentDialog";
import EditAppointmentDialog, { type AppointmentDetail } from "@/components/dashboard/EditAppointmentDialog";
import NotificationsBell from "@/components/dashboard/NotificationsBell";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type KpiData = {
  appointmentsThisMonth: number;
  revenueThisMonth: number;
  activeClients: number;
  attendanceRate: number;
};

type TodayAppointment = {
  id: string;
  clientName: string;
  serviceName: string;
  time: string;
  status: string;
  notes: string | null;
};

type ExtraKpi = {
  noShowRate: number;
  popularService: string;
  popularServiceCount: number;
  avgRevenuePerClient: number;
  recurringRate: number;
};

const statusStyles: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmado", className: "bg-primary/10 text-primary" },
  pending: { label: "Pendiente", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelado", className: "bg-destructive/10 text-destructive" },
  completed: { label: "Completado", className: "bg-primary/10 text-primary" },
  no_show: { label: "No asistió", className: "bg-destructive/10 text-destructive" },
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [kpis, setKpis] = useState<KpiData>({ appointmentsThisMonth: 0, revenueThisMonth: 0, activeClients: 0, attendanceRate: 0 });
  const [todayAppts, setTodayAppts] = useState<TodayAppointment[]>([]);
  const [extra, setExtra] = useState<ExtraKpi>({ noShowRate: 0, popularService: "-", popularServiceCount: 0, avgRevenuePerClient: 0, recurringRate: 0 });
  const [newApptOpen, setNewApptOpen] = useState(false);
  const [editApptOpen, setEditApptOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<AppointmentDetail | null>(null);
  const navigate = useNavigate();

  const loadData = useCallback(async (pid: string) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const [apptRes, paymentsRes, clientsRes, todayRes] = await Promise.all([
      supabase.from("appointments").select("id, status, service_id").eq("profile_id", pid).gte("starts_at", startOfMonth).lte("starts_at", endOfMonth),
      supabase.from("payments").select("amount, status").eq("profile_id", pid).gte("created_at", startOfMonth).lte("created_at", endOfMonth),
      supabase.from("clients").select("id, total_visits, total_spent").eq("profile_id", pid),
      supabase.from("appointments").select("id, status, starts_at, notes, clients(full_name), services(name)").eq("profile_id", pid).gte("starts_at", todayStart).lte("starts_at", todayEnd).order("starts_at"),
    ]);

    const appts = apptRes.data || [];
    const completedPayments = (paymentsRes.data || []).filter(p => p.status === "completed");
    const clients = clientsRes.data || [];
    const todayData = todayRes.data || [];

    const completed = appts.filter(a => a.status === "completed").length;
    const noShow = appts.filter(a => a.status === "no_show").length;
    const finishedAppts = completed + noShow;
    const attendanceRate = finishedAppts > 0 ? Math.round((completed / finishedAppts) * 100) : 100;
    const noShowRate = finishedAppts > 0 ? Math.round((noShow / finishedAppts) * 100) : 0;

    const revenue = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const activeClients = clients.filter(c => (c.total_visits ?? 0) > 0).length;

    setKpis({ appointmentsThisMonth: appts.length, revenueThisMonth: revenue, activeClients, attendanceRate });

    setTodayAppts(todayData.map((a: any) => ({
      id: a.id,
      clientName: a.clients?.full_name || "Sin cliente",
      serviceName: a.services?.name || "Sin servicio",
      time: new Date(a.starts_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      status: a.status,
      notes: a.notes,
    })));

    const serviceCounts: Record<string, number> = {};
    appts.forEach(a => { serviceCounts[a.service_id] = (serviceCounts[a.service_id] || 0) + 1; });
    const topServiceId = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0];

    let popularName = "-";
    let popularCount = 0;
    if (topServiceId) {
      const { data: svc } = await supabase.from("services").select("name").eq("id", topServiceId[0]).maybeSingle();
      popularName = svc?.name || "-";
      popularCount = topServiceId[1];
    }

    const totalSpent = clients.reduce((s, c) => s + Number(c.total_spent ?? 0), 0);
    const avgRevenue = activeClients > 0 ? totalSpent / activeClients : 0;
    const recurring = clients.filter(c => (c.total_visits ?? 0) > 1).length;
    const recurringRate = clients.length > 0 ? Math.round((recurring / clients.length) * 100) : 0;

    setExtra({ noShowRate, popularService: popularName, popularServiceCount: popularCount, avgRevenuePerClient: avgRevenue, recurringRate });
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, onboarding_completed, slug")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!profile) { navigate("/auth"); return; }
      if (!profile.onboarding_completed) { navigate("/onboarding"); return; }

      setProfileId(profile.id);
      setProfileSlug(profile.slug);
      await loadData(profile.id);
      setLoading(false);
    };
    init();
  }, [navigate, loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const kpiCards = [
    { label: "Citas Este Mes", value: String(kpis.appointmentsThisMonth), icon: Calendar },
    { label: "Ingresos del Mes", value: formatCurrency(kpis.revenueThisMonth), icon: DollarSign },
    { label: "Clientes Activos", value: String(kpis.activeClients), icon: Users },
    { label: "Tasa de Asistencia", value: `${kpis.attendanceRate}%`, icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12 px-4 container mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Bienvenido de vuelta. Acá tenés un resumen de tu negocio.</p>
            {profileSlug && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">Link de reservas:</span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded">{window.location.origin}/reservar/{profileSlug}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/reservar/${profileSlug}`);
                    toast.success("Link copiado al portapapeles");
                  }}
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Link to="/clients" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <Users className="w-4 h-4" /> Clientes
            </Link>
            <Link to="/calendar" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <CalendarDays className="w-4 h-4" /> Calendario
            </Link>
            <Link to="/services" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <Package className="w-4 h-4" /> Servicios
            </Link>
            {profileId && <NotificationsBell profileId={profileId} />}
            <Button onClick={() => setNewApptOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Nueva Cita
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpiCards.map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{k.label}</span>
                <k.icon className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{k.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold text-lg mb-4 text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Citas de Hoy
            </h3>
            {todayAppts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay citas programadas para hoy.</p>
            ) : (
              <div className="space-y-3">
                {todayAppts.map((b) => {
                  const st = statusStyles[b.status] || statusStyles.pending;
                  return (
                    <div
                      key={b.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/80 cursor-pointer transition-colors"
                      onClick={() => { setSelectedAppt(b); setEditApptOpen(true); }}
                    >
                      <div>
                        <p className="font-medium text-foreground text-sm">{b.clientName}</p>
                        <p className="text-xs text-muted-foreground">{b.serviceName} — {b.time}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.className}`}>{st.label}</span>
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass-card p-6">
            <h3 className="font-display font-semibold text-lg mb-4 text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> KPIs Clave
            </h3>
            <div className="space-y-4">
              {[
                { label: "Tasa de No-Show", value: `${extra.noShowRate}%`, target: "< 10%" },
                { label: "Servicio más popular", value: extra.popularService, target: `${extra.popularServiceCount} reservas` },
                { label: "Ingreso promedio/cliente", value: formatCurrency(extra.avgRevenuePerClient), target: "" },
                { label: "Clientes recurrentes", value: `${extra.recurringRate}%`, target: "> 60%" },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.label}</p>
                    {m.target && <p className="text-xs text-muted-foreground">Meta: {m.target}</p>}
                  </div>
                  <span className="font-display font-bold text-foreground">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      {profileId && (
        <NewAppointmentDialog
          open={newApptOpen}
          onOpenChange={setNewApptOpen}
          profileId={profileId}
          onCreated={() => loadData(profileId)}
        />
      )}
      <EditAppointmentDialog
        open={editApptOpen}
        onOpenChange={setEditApptOpen}
        appointment={selectedAppt}
        onUpdated={() => profileId && loadData(profileId)}
      />
      <AiAssistant />
    </div>
  );
};

export default Dashboard;
