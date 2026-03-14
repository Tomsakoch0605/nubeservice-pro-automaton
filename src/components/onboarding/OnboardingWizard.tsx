import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Check, Calendar, Clock, CreditCard, Loader2, ShieldCheck, AlertTriangle, Sparkles } from "lucide-react";
import CedulaVerification from "@/components/shared/CedulaVerification";
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
  cedulaProfesional: string;
  rfc: string;
};

const serviceTypes = [
  { label: "Peluquería / Barbería", emoji: "💇" },
  { label: "Estética / Spa", emoji: "💆" },
  { label: "Odontología", emoji: "🦷" },
  { label: "Psicología", emoji: "🧠" },
  { label: "Nutrición", emoji: "🥗" },
  { label: "Personal Trainer", emoji: "💪" },
  { label: "Consultoría", emoji: "📋" },
  { label: "Clases Particulares", emoji: "📚" },
  { label: "Otro", emoji: "✨" },
];

const professionalServiceTypes = [
  "Odontología", "Psicología", "Nutrición", "Consultoría",
];

const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const payments = ["Mercado Pago", "Transferencia Bancaria", "Efectivo", "Tarjeta (Stripe)"];

const initial: FormData = {
  businessName: "", ownerName: "", phone: "",
  serviceType: "", customService: "", serviceDuration: "60", servicePrice: "",
  location: "", workDays: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
  startTime: "09:00", endTime: "18:00",
  paymentMethods: [], requiresDeposit: false, depositPercent: "30",
  cedulaProfesional: "", rfc: "",
};

const StepIndicator = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center gap-3 mb-8 justify-center">
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
          <div className={`hidden sm:block w-12 h-0.5 transition-colors ${i < current ? "bg-primary" : "bg-border"}`} />
        )}
      </div>
    ))}
  </div>
);

const allSteps = [
  { key: "welcome", icon: Sparkles, title: "¡Bienvenido! 👋", sub: "Vamos a configurar tu negocio en minutos" },
  { key: "business", icon: Calendar, title: "Tu Negocio", sub: "Cuéntanos un poco más sobre ti" },
  { key: "credentials", icon: ShieldCheck, title: "Datos Profesionales", sub: "Tu cédula y datos fiscales (opcional)" },
  { key: "schedule", icon: Clock, title: "Agenda y Horarios", sub: "Configura tu disponibilidad" },
  { key: "payments", icon: CreditCard, title: "Pagos", sub: "Elige cómo cobrar" },
];

const OnboardingWizard = () => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(initial);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const isProfessional = professionalServiceTypes.includes(data.serviceType);

  const steps = useMemo(
    () => isProfessional ? allSteps : allSteps.filter((s) => s.key !== "credentials"),
    [isProfessional]
  );

  const totalSteps = steps.length;

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

  // If service type changes and step is out of bounds, adjust
  useEffect(() => {
    if (step >= totalSteps) {
      setStep(totalSteps - 1);
    }
  }, [totalSteps, step]);

  const update = (field: keyof FormData, value: any) => setData((p) => ({ ...p, [field]: value }));

  const toggleArray = (field: "workDays" | "paymentMethods", val: string) => {
    setData((p) => ({
      ...p,
      [field]: p[field].includes(val) ? p[field].filter((v) => v !== val) : [...p[field], val],
    }));
  };

  const next = () => step < totalSteps - 1 && setStep(step + 1);
  const prev = () => step > 0 && setStep(step - 1);

  const currentStepKey = steps[step]?.key;

  const validateRFC = (rfc: string): boolean => {
    if (!rfc.trim()) return true; // Opcional
    const cleaned = rfc.trim().toUpperCase();
    
    // Persona moral: 12 caracteres (3 letras + 6 dígitos + 3 alfanuméricos)
    const moralPattern = /^[A-Z&Ñ]{3}\d{6}[A-Z0-9]{3}$/;
    // Persona física: 13 caracteres (4 letras + 6 dígitos + 3 alfanuméricos)
    const fisicaPattern = /^[A-Z&Ñ]{4}\d{6}[A-Z0-9]{3}$/;
    
    return moralPattern.test(cleaned) || fisicaPattern.test(cleaned);
  };

  const canAdvance = () => {
    if (currentStepKey === "welcome") {
      return data.serviceType !== "" && (data.serviceType !== "Otro" || data.customService.trim() !== "");
    }
    if (currentStepKey === "credentials") {
      return validateRFC(data.rfc);
    }
    return true;
  };

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
      let slug = baseSlug || `negocio-${Date.now()}`;

      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("slug", slug)
        .neq("id", profile.id)
        .maybeSingle();
      if (existing) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }

      const updatePayload: Record<string, any> = {
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
        cedula_profesional: data.cedulaProfesional.trim() || null,
        rfc: data.rfc.trim() || null,
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .update(updatePayload)
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

      toast.success("🎉 ¡Tu negocio está listo! Bienvenido a NubeService");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast.error(error.message || "Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  const Icon = steps[step].icon;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--gradient-warm)" }}>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <span className="font-display text-2xl font-bold text-foreground">Nube<span className="text-primary">Service</span></span>
        </div>

        <StepIndicator current={step} total={totalSteps} />

        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-foreground">{steps[step].title}</h2>
              <p className="text-sm text-muted-foreground">{steps[step].sub}</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepKey}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStepKey === "welcome" && (
                <div className="space-y-6">
                  <div className="text-center py-2">
                    <p className="text-muted-foreground leading-relaxed">
                      ¡Qué gusto tenerte aquí! 🎉 Antes de empezar, cuéntanos:
                    </p>
                    <h3 className="font-display font-bold text-lg text-foreground mt-3">
                      ¿Qué servicio vas a ofrecer?
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {serviceTypes.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => update("serviceType", s.label)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] ${
                          data.serviceType === s.label
                            ? "bg-primary/10 border-primary shadow-md"
                            : "bg-background border-border hover:border-primary/40"
                        }`}
                      >
                        <span className="text-2xl">{s.emoji}</span>
                        <span className={`text-sm font-medium text-center leading-tight ${
                          data.serviceType === s.label ? "text-primary" : "text-foreground"
                        }`}>
                          {s.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  {data.serviceType === "Otro" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="overflow-hidden"
                    >
                      <Label>Cuéntanos, ¿qué servicio ofreces?</Label>
                      <Input placeholder="Ej: Coaching empresarial, Fotografía, etc." value={data.customService} onChange={(e) => update("customService", e.target.value)} />
                    </motion.div>
                  )}
                  {isProfessional && data.serviceType && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20"
                    >
                      <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Servicio profesional detectado</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Como {data.serviceType.toLowerCase()} es un servicio que requiere título, en el siguiente paso podrás agregar tu Cédula Profesional y RFC de forma opcional.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {currentStepKey === "business" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    ¡Genial! Ya casi estamos. Ahora necesitamos algunos datos de tu negocio 📝
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><Label>Nombre del Negocio</Label><Input placeholder="Ej: Estética María" value={data.businessName} onChange={(e) => update("businessName", e.target.value)} /></div>
                    <div><Label>Tu Nombre</Label><Input placeholder="María García" value={data.ownerName} onChange={(e) => update("ownerName", e.target.value)} /></div>
                  </div>
                  <div>
                    <Label>WhatsApp</Label><Input placeholder="+52 55 1234-5678" value={data.phone} onChange={(e) => update("phone", e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-1">Tus clientes recibirán recordatorios a este número</p>
                  </div>
                  <div><Label>Ubicación / Dirección</Label><Input placeholder="Av. Reforma 1234, CDMX" value={data.location} onChange={(e) => update("location", e.target.value)} /></div>
                </div>
              )}

              {currentStepKey === "credentials" && (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground">
                    Como ofreces un servicio profesional, puedes agregar tus datos para generar más confianza con tus clientes. Ambos campos son opcionales.
                  </p>
                  <div>
                    <Label>Cédula Profesional <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                    <Input
                      placeholder="Ej: 12345678"
                      value={data.cedulaProfesional}
                      onChange={(e) => update("cedulaProfesional", e.target.value)}
                      maxLength={20}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Si la agregas, será visible en tu perfil público para dar confianza a tus clientes.
                    </p>
                    {data.cedulaProfesional.trim() && (
                      <div className="mt-2">
                        <CedulaVerification cedula={data.cedulaProfesional} />
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border pt-5">
                    <Label>RFC <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                    <Input
                      placeholder="Ej: XAXX010101000"
                      value={data.rfc}
                      onChange={(e) => update("rfc", e.target.value.toUpperCase())}
                      maxLength={13}
                    />
                    {!data.rfc.trim() && (
                      <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-xs text-destructive">
                          Sin RFC no podrás emitir facturas a tus clientes. Podrás agregarlo después en la configuración de tu negocio.
                        </p>
                      </div>
                    )}
                    {data.rfc.trim() && validateRFC(data.rfc) && (
                      <p className="text-xs text-primary mt-1 flex items-center gap-1">
                        <Check className="w-3 h-3" /> ¡Listo! RFC válido - Podrás emitir facturas.
                      </p>
                    )}
                    {data.rfc.trim() && !validateRFC(data.rfc) && (
                      <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-xs text-destructive">
                          El RFC debe tener 12 caracteres (persona moral) o 13 caracteres (persona física). Ej: XAXX010101000
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStepKey === "schedule" && (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground">
                    Configura los horarios en los que tus clientes podrán agendar citas contigo 📅
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><Label>Duración de la cita (min)</Label><Input type="number" value={data.serviceDuration} onChange={(e) => update("serviceDuration", e.target.value)} /></div>
                    <div><Label>Precio del Servicio ($MXN)</Label><Input type="number" placeholder="500" value={data.servicePrice} onChange={(e) => update("servicePrice", e.target.value)} /></div>
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
                    <div><Label>Hora de inicio</Label><Input type="time" value={data.startTime} onChange={(e) => update("startTime", e.target.value)} /></div>
                    <div><Label>Hora de cierre</Label><Input type="time" value={data.endTime} onChange={(e) => update("endTime", e.target.value)} /></div>
                  </div>
                </div>
              )}

              {currentStepKey === "payments" && (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground">
                    ¡Último paso! Elige cómo quieres recibir los pagos de tus clientes 💰
                  </p>
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
            {step < totalSteps - 1 ? (
              <Button variant="hero" onClick={next} disabled={!canAdvance()}>
                {currentStepKey === "welcome" ? "¡Empecemos!" : "Siguiente"} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button variant="hero" onClick={finish} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Guardando...</> : <>🚀 Finalizar Configuración</>}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
