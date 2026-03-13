import { Calendar, Users, DollarSign, TrendingUp, Clock, CheckCircle2, XCircle, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";

const kpis = [
  { label: "Citas Este Mes", value: "47", change: "+12%", icon: Calendar, up: true },
  { label: "Ingresos del Mes", value: "$235.000", change: "+8%", icon: DollarSign, up: true },
  { label: "Clientes Activos", value: "89", change: "+5", icon: Users, up: true },
  { label: "Tasa de Asistencia", value: "94%", change: "+2%", icon: CheckCircle2, up: true },
];

const recentBookings = [
  { name: "María López", service: "Corte + Color", time: "10:00", status: "confirmed" },
  { name: "Carlos Ruiz", service: "Consulta Nutrición", time: "11:30", status: "confirmed" },
  { name: "Ana Torres", service: "Masaje Relajante", time: "14:00", status: "pending" },
  { name: "Luis Méndez", service: "Corte Caballero", time: "15:30", status: "cancelled" },
];

const statusStyles: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmado", className: "bg-primary/10 text-primary" },
  pending: { label: "Pendiente", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelado", className: "bg-destructive/10 text-destructive" },
};

const Dashboard = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="pt-24 pb-12 px-4 container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Bienvenido de vuelta. Acá tenés un resumen de tu negocio.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{k.label}</span>
              <k.icon className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{k.value}</p>
            <span className="text-xs text-primary font-medium">{k.change} vs. mes anterior</span>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-display font-semibold text-lg mb-4 text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Citas de Hoy
          </h3>
          <div className="space-y-3">
            {recentBookings.map((b) => {
              const st = statusStyles[b.status];
              return (
                <div key={b.name + b.time} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-foreground text-sm">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.service} — {b.time}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.className}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-display font-semibold text-lg mb-4 text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> KPIs Clave
          </h3>
          <div className="space-y-4">
            {[
              { label: "Tasa de No-Show", value: "6%", target: "< 10%", good: true },
              { label: "Servicios más popular", value: "Corte + Color", target: "32 reservas" },
              { label: "Ingreso promedio/cliente", value: "$2.640", target: "+15% trimestre" },
              { label: "Clientes recurrentes", value: "68%", target: "> 60%", good: true },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{m.label}</p>
                  <p className="text-xs text-muted-foreground">Meta: {m.target}</p>
                </div>
                <span className="font-display font-bold text-foreground">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  </div>
);

export default Dashboard;
