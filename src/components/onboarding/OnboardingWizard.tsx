import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Check, Calendar, Clock, CreditCard, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type FormData = {
  businessName: string;
  ownerName: string;
  phone: string;
  serviceType: string;
  customService: string;
  serviceDuration: string;
  servicePrice: string;
  location: string;
  workDays: string[];
  startTime: string;
  endTime: string;
  paymentMethods: string[];
  requiresDeposit: boolean;
  depositPercent: string;
};

const serviceTypes = [
  "Peluquería / Barbería", "Estética / Spa", "Odontología", "Psicología",
  "Nutrición", "Personal Trainer", "Consultoría", "Clases Particulares", "Otro",
];

const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const payments = ["Mercado Pago", "Transferencia Bancaria", "Efectivo", "Tarjeta (Stripe)"];

const initial: FormData = {
  businessName: "", ownerName: "", phone: "",
  serviceType: "", customService: "", serviceDuration: "60", servicePrice: "",
  location: "", workDays: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
  startTime: "09:00", endTime: "18:00",
  paymentMethods: [], requiresDeposit: false, depositPercent: "30",
};

const StepIndicator = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center gap-3 mb-8">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className="flex items-center gap-2">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-display font-bold transition-all duration-300 ${
          i < current ? "bg-primary text-primary-foreground" :
          i === current ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
          "bg-muted text-muted-foreground"
        }`}>
          {i < current ? <Check className="w-5 h-5" /> : i + 1}
        </div>
        {i < total - 1 && (
          <div className={`hidden sm:block w-16 h-0.5 transition-colors ${i < current ? "bg-primary" : "bg-border"}`} />
        )}
      </div>
    ))}
  </div>
);

const stepTitles = [
  { icon: Calendar, title: "Tu Negocio", sub: "Cuéntanos sobre tu actividad" },
  { icon: Clock, title: "Agenda y Horarios", sub: "Configura tu disponibilidad" },
  { icon: CreditCard, title: "Pagos", sub: "Elige cómo cobrar" },
];

const OnboardingWizard = () => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(initial);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Necesitas iniciar sesión primero");
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const update = (field: keyof FormData, value: any) => setData((p) => ({ ...p, [field]: value }));

  const toggleArray = (field: "workDays" | "paymentMethods", val: string) => {
    setData((p) => ({
      ...p,
      [field]: p[field].includes(val) ? p[field].filter((v) => v !== val) : [...p[field], val],
    }));
  };

  const next = () => step < 2 && setStep(step + 1);
  const prev = () => step > 0 && setStep(step - 1);

  const finish = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa");

      const { data: profile, error: profileFetchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (profileFetchError) throw profileFetchError;

      const serviceLabel = data.serviceType === "Otro" ? data.customService : data.serviceType;

      const baseSlug = data.businessName
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const slug = baseSlug || `negocio-${Date.now()}`;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          business_name: data.businessName,
          owner_name: data.ownerName,
          phone: data.phone,
          service_type: serviceLabel,
          location: data.location,
          work_days: data.workDays,
          start_time: data.startTime,
          end_time: data.endTime,
          payment_methods: data.paymentMethods,
          requires_deposit: data.requiresDeposit,
          deposit_percent: data.requiresDeposit ? parseInt(data.depositPercent) : null,
          onboarding_completed: true,
          slug,
        })
        .eq("id", profile.id);

      if (profileError) throw profileError;

      if (serviceLabel && data.servicePrice) {
        const { error: serviceError } = await supabase
          .from("services")
          .insert({
            profile_id: profile.id,
            name: serviceLabel,
            duration_minutes: parseInt(data.serviceDuration) || 60,
            price: parseFloat(data.servicePrice) || 0,
          });

        if (serviceError) throw serviceError;
      }

      toast.success("¡Configuración guardada exitosamente!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast.error(error.message || "Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  const Icon = stepTitles[step].icon;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--gradient-warm)" }}>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <span className="font-display text-2xl font-bold text-foreground">Nube<span className="text-primary">Service</span></span>
        </div>

        <StepIndicator current={step} total={3} />

        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-foreground">{stepTitles[step].title}</h2>
              <p className="text-sm text-muted-foreground">{stepTitles[step].sub}</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {step === 0 && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><Label>Nombre del Negocio</Label><Input placeholder="Ej: Estética María" value={data.businessName} onChange={(e) => update("businessName", e.target.value)} /></div>
                    <div><Label>Tu Nombre</Label><Input placeholder="María García" value={data.ownerName} onChange={(e) => update("ownerName", e.target.value)} /></div>
                  </div>
                  <div>
                    <Label>WhatsApp</Label><Input placeholder="+52 55 1234-5678" value={data.phone} onChange={(e) => update("phone", e.target.value)} />
                  </div>
                  <div>
                    <Label>Tipo de Servicio</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {serviceTypes.map((s) => (
                        <button key={s} onClick={() => update("serviceType", s)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-all ${data.serviceType === s ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  {data.serviceType === "Otro" && (
                    <div><Label>Especifica tu servicio</Label><Input placeholder="Ej: Consultoría IT" value={data.customService} onChange={(e) => update("customService", e.target.value)} /></div>
                  )}
                  <div><Label>Ubicación / Dirección</Label><Input placeholder="Av. Reforma 1234, CDMX" value={data.location} onChange={(e) => update("location", e.target.value)} /></div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><Label>Duración del Turno (min)</Label><Input type="number" value={data.serviceDuration} onChange={(e) => update("serviceDuration", e.target.value)} /></div>
                    <div><Label>Precio del Servicio ($)</Label><Input type="number" placeholder="500" value={data.servicePrice} onChange={(e) => update("servicePrice", e.target.value)} /></div>
                  </div>
                  <div>
                    <Label>Días de Trabajo</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {days.map((d) => (
                        <button key={d} onClick={() => toggleArray("workDays", d)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-all ${data.workDays.includes(d) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><Label>Hora Inicio</Label><Input type="time" value={data.startTime} onChange={(e) => update("startTime", e.target.value)} /></div>
                    <div><Label>Hora Fin</Label><Input type="time" value={data.endTime} onChange={(e) => update("endTime", e.target.value)} /></div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <Label>Métodos de Pago Aceptados</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {payments.map((p) => (
                        <button key={p} onClick={() => toggleArray("paymentMethods", p)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-all ${data.paymentMethods.includes(p) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="glass-card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">¿Requieres anticipo para confirmar?</p>
                        <p className="text-sm text-muted-foreground">Cobra un porcentaje al momento de reservar</p>
                      </div>
                      <button onClick={() => update("requiresDeposit", !data.requiresDeposit)}
                        className={`w-12 h-7 rounded-full transition-colors relative ${data.requiresDeposit ? "bg-primary" : "bg-muted"}`}>
                        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-card shadow transition-transform ${data.requiresDeposit ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                    {data.requiresDeposit && (
                      <div className="mt-3"><Label>Porcentaje de Anticipo (%)</Label><Input type="number" value={data.depositPercent} onChange={(e) => update("depositPercent", e.target.value)} /></div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button variant="ghost" onClick={prev} disabled={step === 0}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            {step < 2 ? (
              <Button variant="hero" onClick={next}>
                Siguiente <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button variant="hero" onClick={finish} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Guardando...</> : <>Finalizar Configuración <Check className="w-4 h-4 ml-1" /></>}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
