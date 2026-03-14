import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Starter",
    price: "0",
    desc: "Ideal para empezar a organizar tu agenda.",
    features: [
      "Hasta 30 citas/mes",
      "Agenda online básica",
      "1 servicio activo",
      "Recordatorios por email",
    ],
    cta: "Comenzar Gratis",
    highlighted: false,
  },
  {
    name: "Profesional",
    price: "399",
    desc: "Para profesionales que quieren crecer sin límites.",
    features: [
      "Citas ilimitadas",
      "Servicios ilimitados",
      "WhatsApp + Email reminders",
      "Pagos integrados",
      "CRM de clientes",
      "Asistente IA",
    ],
    cta: "Elegir Profesional",
    highlighted: true,
    badge: "Más popular",
  },
  {
    name: "Equipo",
    price: "9.990",
    desc: "Para equipos y estudios con múltiples profesionales.",
    features: [
      "Todo del plan Profesional",
      "Hasta 5 profesionales",
      "Dashboard avanzado & KPIs",
      "Soporte prioritario",
      "Personalización de marca",
    ],
    cta: "Elegir Equipo",
    highlighted: false,
  },
];

const PricingSection = () => (
  <section id="pricing" className="py-24 bg-background">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <span className="text-primary font-semibold text-sm uppercase tracking-wider">
          Precios
        </span>
        <h2 className="text-3xl sm:text-4xl font-display font-bold mt-3 mb-4 text-foreground">
          Planes simples, sin sorpresas
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Elegí el plan que mejor se adapte a tu negocio. Podés cambiar en cualquier momento.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className={`relative rounded-2xl p-8 flex flex-col ${
              plan.highlighted
                ? "bg-accent text-accent-foreground ring-2 ring-primary shadow-lg scale-[1.03]"
                : "glass-card"
            }`}
          >
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold font-display">
                {plan.badge}
              </span>
            )}

            <h3 className="font-display font-bold text-xl mb-1">{plan.name}</h3>
            <p
              className={`text-sm mb-6 ${
                plan.highlighted ? "text-accent-foreground/70" : "text-muted-foreground"
              }`}
            >
              {plan.desc}
            </p>

            <div className="mb-6">
              <span className="text-4xl font-display font-bold">
                ${plan.price}
              </span>
              <span
                className={`text-sm ml-1 ${
                  plan.highlighted ? "text-accent-foreground/60" : "text-muted-foreground"
                }`}
              >
                /mes
              </span>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      plan.highlighted ? "text-primary-foreground" : "text-primary"
                    }`}
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Button
              variant={plan.highlighted ? "hero" : "heroOutline"}
              size="lg"
              className="w-full"
              asChild
            >
              <Link to="/auth">{plan.cta}</Link>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default PricingSection;
