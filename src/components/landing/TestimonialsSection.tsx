import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Lucía Méndez",
    role: "Estilista · Buenos Aires",
    quote:
      "Desde que uso NubeService dejé de perder turnos por WhatsApp. Mis clientes reservan solos y yo me enfoco en lo que amo hacer.",
    stars: 5,
  },
  {
    name: "Martín Ríos",
    role: "Kinesiólogo · Córdoba",
    quote:
      "El recordatorio automático redujo mis no-shows un 70%. Es como tener una secretaria que nunca descansa.",
    stars: 5,
  },
  {
    name: "Camila Torres",
    role: "Nutricionista · Rosario",
    quote:
      "Cobrar anticipos cambió todo. Ahora mis pacientes confirman de verdad y yo tengo previsibilidad de ingresos.",
    stars: 5,
  },
  {
    name: "Diego Herrera",
    role: "Barbero · Mendoza",
    quote:
      "En 3 meses dupliqué mis turnos. El dashboard me muestra exactamente qué servicios rinden más.",
    stars: 5,
  },
];

const TestimonialsSection = () => (
  <section id="testimonials" className="py-24" style={{ background: "var(--gradient-warm)" }}>
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <span className="text-primary font-semibold text-sm uppercase tracking-wider">
          Casos de Éxito
        </span>
        <h2 className="text-3xl sm:text-4xl font-display font-bold mt-3 mb-4 text-foreground">
          Profesionales que ya automatizaron su negocio
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Más de 500 profesionales confían en NubeService para gestionar sus turnos y cobros.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="glass-card p-6 flex flex-col"
          >
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: t.stars }).map((_, idx) => (
                <Star
                  key={idx}
                  className="w-4 h-4 fill-primary text-primary"
                />
              ))}
            </div>
            <p className="text-sm text-foreground leading-relaxed flex-1 mb-5">
              "{t.quote}"
            </p>
            <div>
              <p className="font-display font-semibold text-sm text-foreground">
                {t.name}
              </p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
