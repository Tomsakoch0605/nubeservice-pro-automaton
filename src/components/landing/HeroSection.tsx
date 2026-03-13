import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-illustration.png";

const checks = [
  "Agenda automática 24/7",
  "Confirmación y recordatorios por WhatsApp",
  "Cobro de anticipos integrado",
];

const HeroSection = () => (
  <section className="relative pt-32 pb-20 overflow-hidden" style={{ background: "var(--gradient-warm)" }}>
    <div className="container mx-auto px-4">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
            🚀 La revolución para profesionales independientes
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6 text-foreground">
            Tu negocio de servicios,{" "}
            <span className="gradient-text">100% automatizado</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
            Agenda, cobra, confirma y fideliza clientes sin necesitar secretaria.
            Integrado con Tienda Nube para que vendas tus servicios como productos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Button variant="hero" size="xl" asChild>
              <Link to="/onboarding">
                Configurar mi Negocio
                <ArrowRight className="w-5 h-5 ml-1" />
              </Link>
            </Button>
            <Button variant="heroOutline" size="xl" asChild>
              <a href="#how-it-works">Ver Demo</a>
            </Button>
          </div>
          <div className="space-y-2">
            {checks.map((c) => (
              <div key={c} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                {c}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="hidden lg:flex justify-center"
        >
          <img
            src={heroImg}
            alt="Nube Service Now — gestión automatizada de servicios"
            className="w-full max-w-md animate-float"
          />
        </motion.div>
      </div>
    </div>
  </section>
);

export default HeroSection;
