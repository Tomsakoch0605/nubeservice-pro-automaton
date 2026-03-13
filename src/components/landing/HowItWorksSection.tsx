import { motion } from "framer-motion";
import { Settings, Zap, TrendingUp } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: Settings,
    title: "Configurá tu perfil",
    desc: "Tipo de servicio, duración, precios, métodos de pago y horarios disponibles.",
  },
  {
    num: "02",
    icon: Zap,
    title: "Activá el asistente IA",
    desc: "Tu bot empieza a atender clientes, gestionar la agenda y cobrar automáticamente.",
  },
  {
    num: "03",
    icon: TrendingUp,
    title: "Crecé sin límites",
    desc: "Monitoreá KPIs, fidelizá clientes y escalá tu negocio sin sumar empleados.",
  },
];

const HowItWorksSection = () => (
  <section id="how-it-works" className="py-24" style={{ background: "var(--gradient-warm)" }}>
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <span className="text-primary font-semibold text-sm uppercase tracking-wider">Cómo Funciona</span>
        <h2 className="text-3xl sm:text-4xl font-display font-bold mt-3 mb-4 text-foreground">
          3 pasos para automatizar tu negocio
        </h2>
      </div>
      <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {steps.map((s, i) => (
          <motion.div
            key={s.num}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.5 }}
            className="text-center"
          >
            <div className="relative mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <s.icon className="w-8 h-8 text-primary" />
              <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center font-display">
                {s.num}
              </span>
            </div>
            <h3 className="font-display font-semibold text-xl mb-2 text-foreground">{s.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
