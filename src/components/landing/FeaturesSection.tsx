import { Calendar, MessageSquare, CreditCard, BarChart3, Bot, Users } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Calendar,
    title: "Agenda Inteligente",
    desc: "Disponibilidad en tiempo real. Tus clientes reservan solos, sin llamadas ni mensajes.",
  },
  {
    icon: Bot,
    title: "Asistente IA",
    desc: "Un bot que responde, sugiere horarios, cobra señas y confirma turnos automáticamente.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp & Email",
    desc: "Recordatorios automáticos 24h y 1h antes. Reduce el no-show hasta un 80%.",
  },
  {
    icon: CreditCard,
    title: "Pagos Integrados",
    desc: "Cobra señas o el servicio completo con Mercado Pago, transferencia o tarjeta.",
  },
  {
    icon: Users,
    title: "CRM de Clientes",
    desc: "Historial completo de cada cliente: citas, pagos, preferencias y notas.",
  },
  {
    icon: BarChart3,
    title: "Dashboard & KPIs",
    desc: "Métricas en tiempo real: ingresos, tasa de asistencia, servicios más pedidos.",
  },
];

const FeaturesSection = () => (
  <section id="features" className="py-24 bg-background">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <span className="text-primary font-semibold text-sm uppercase tracking-wider">Funcionalidades</span>
        <h2 className="text-3xl sm:text-4xl font-display font-bold mt-3 mb-4 text-foreground">
          Todo lo que necesitás para crecer
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Desde la primera consulta hasta la fidelización, cada paso está automatizado.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="glass-card p-6 hover:shadow-lg transition-shadow duration-300 group"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <f.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2 text-foreground">{f.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
