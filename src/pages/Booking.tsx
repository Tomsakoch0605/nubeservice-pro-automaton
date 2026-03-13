import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Clock, MapPin, Loader2, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";

type Profile = {
  id: string;
  business_name: string;
  owner_name: string;
  location: string | null;
  service_type: string | null;
  start_time: string | null;
  end_time: string | null;
  work_days: string[] | null;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
};

type ExistingAppointment = {
  starts_at: string;
  ends_at: string;
};

const dayMap: Record<string, number> = {
  Domingo: 0, Lunes: 1, Martes: 2, Miércoles: 3, Jueves: 4, Viernes: 5, Sábado: 6,
};

const generateTimeSlots = (start = "08:00", end = "21:00", step = 30) => {
  const slots: string[] = [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  while (mins < endMins) {
    const h = String(Math.floor(mins / 60)).padStart(2, "0");
    const m = String(mins % 60).padStart(2, "0");
    slots.push(`${h}:${m}`);
    mins += step;
  }
  return slots;
};

const StepIndicator = ({ current }: { current: number }) => {
  const steps = ["Servicio", "Fecha y Hora", "Tus Datos"];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center text-sm font-display font-bold transition-all",
              i < current ? "bg-primary text-primary-foreground" :
              i === current ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
              "bg-muted text-muted-foreground"
            )}>
              {i < current ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
            </div>
            <span className="text-xs text-muted-foreground hidden sm:block">{label}</span>
          </div>
          {i < 2 && <div className={cn("w-10 sm:w-16 h-0.5 mb-5 sm:mb-4", i < current ? "bg-primary" : "bg-border")} />}
        </div>
      ))}
    </div>
  );
};

const Booking = () => {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Availability
  const [existingAppts, setExistingAppts] = useState<ExistingAppointment[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Form state
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientNotes, setClientNotes] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, business_name, owner_name, location, service_type, start_time, end_time, work_days")
        .eq("slug", slug)
        .maybeSingle();

      if (!prof) { setLoading(false); return; }
      setProfile(prof);

      const { data: svcs } = await supabase
        .from("services")
        .select("id, name, description, duration_minutes, price")
        .eq("profile_id", prof.id)
        .eq("is_active", true)
        .order("name");

      setServices(svcs || []);
      setLoading(false);
    };
    load();
  }, [slug]);

  const selectedService = services.find(s => s.id === serviceId);

  // Fetch existing appointments for the selected date
  const fetchAppointments = useCallback(async (selectedDate: Date) => {
    if (!profile) return;
    setLoadingSlots(true);

    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("appointments")
      .select("starts_at, ends_at")
      .eq("profile_id", profile.id)
      .in("status", ["pending", "confirmed"])
      .gte("starts_at", dayStart.toISOString())
      .lte("starts_at", dayEnd.toISOString());

    setExistingAppts((data || []).map(a => ({ starts_at: a.starts_at, ends_at: a.ends_at })));
    setExistingAppts((data || []).map(a => ({ starts_at: a.starts_at, ends_at: a.ends_at })));
    setLoadingSlots(false);
  }, [profile]);

  // Re-fetch when date changes
  useEffect(() => {
    if (date) {
      setTime(""); // reset time when date changes
      fetchAppointments(date);
    }
  }, [date, fetchAppointments]);

  const workDayNumbers = useMemo(() =>
    (profile?.work_days || []).map(d => dayMap[d]).filter(n => n !== undefined),
    [profile?.work_days]
  );

  const allTimeSlots = useMemo(() =>
    generateTimeSlots(profile?.start_time || "09:00", profile?.end_time || "18:00"),
    [profile?.start_time, profile?.end_time]
  );

  // Filter out occupied slots
  const availableSlots = useMemo(() => {
    if (!selectedService || !date) return allTimeSlots;

    const duration = selectedService.duration_minutes;

    return allTimeSlots.filter(slot => {
      const [h, m] = slot.split(":").map(Number);
      // Create slot times in the same way they'll be stored (local time -> ISO)
      const slotStart = new Date(date);
      slotStart.setHours(h, m, 0, 0);
      const slotStartMs = slotStart.getTime();
      const slotEndMs = slotStartMs + duration * 60 * 1000;

      // Check the slot doesn't exceed business hours
      const [eh, em] = (profile?.end_time || "18:00").split(":").map(Number);
      const businessEnd = new Date(date);
      businessEnd.setHours(eh, em, 0, 0);
      if (slotEndMs > businessEnd.getTime()) return false;

      // Check overlap with existing appointments (compare as timestamps)
      return !existingAppts.some(appt => {
        const apptStartMs = new Date(appt.starts_at).getTime();
        const apptEndMs = new Date(appt.ends_at).getTime();
        return slotStartMs < apptEndMs && slotEndMs > apptStartMs;
      });
    });
  }, [allTimeSlots, existingAppts, selectedService, date, profile?.end_time]);

  const isDateDisabled = (d: Date) => {
    if (d < new Date(new Date().setHours(0, 0, 0, 0))) return true;
    return !workDayNumbers.includes(d.getDay());
  };

  const canNext = () => {
    if (step === 0) return !!serviceId;
    if (step === 1) return !!date && !!time;
    if (step === 2) return clientName.trim().length > 0 && clientPhone.trim().length > 0;
    return false;
  };

  const handleSubmit = async () => {
    if (!profile || !selectedService || !date) return;
    setSaving(true);

    try {
      // Create or find client
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("phone", clientPhone.trim())
        .maybeSingle();

      let clientId: string;

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const { data: newClient, error: clientErr } = await supabase
          .from("clients")
          .insert({
            profile_id: profile.id,
            full_name: clientName.trim(),
            phone: clientPhone.trim(),
            email: clientEmail.trim() || null,
            notes: clientNotes.trim() || null,
          })
          .select("id")
          .single();

        if (clientErr) throw clientErr;
        clientId = newClient.id;
      }

      // Create appointment
      const [h, m] = time.split(":").map(Number);
      const startsAt = new Date(date);
      startsAt.setHours(h, m, 0, 0);
      const endsAt = new Date(startsAt.getTime() + selectedService.duration_minutes * 60 * 1000);

      const { error: apptErr } = await supabase.from("appointments").insert({
        profile_id: profile.id,
        client_id: clientId,
        service_id: serviceId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        notes: clientNotes.trim() || null,
        status: "confirmed",
      });

      if (apptErr) throw apptErr;

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      toast.error("Error al crear la reserva. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Página no encontrada</h1>
          <p className="text-muted-foreground">Este link de reservas no existe o fue desactivado.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--gradient-warm)" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">¡Reserva Confirmada!</h1>
          <p className="text-muted-foreground mb-4">
            Tu turno en <strong>{profile.business_name}</strong> fue agendado exitosamente.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-left space-y-1">
            <p><strong>Servicio:</strong> {selectedService?.name}</p>
            <p><strong>Fecha:</strong> {date && format(date, "EEEE d 'de' MMMM", { locale: es })}</p>
            <p><strong>Hora:</strong> {time}</p>
            {profile.location && <p><strong>Lugar:</strong> {profile.location}</p>}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--gradient-warm)" }}>
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground">{profile.business_name}</h1>
          {profile.location && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5" /> {profile.location}
            </p>
          )}
        </div>

        <StepIndicator current={step} />

        <div className="glass-card p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {/* Step 0: Service Selection */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-display font-bold text-lg text-foreground mb-4">Elige un servicio</h2>
                <div className="space-y-3">
                  {services.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay servicios disponibles.</p>
                  ) : (
                    services.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setServiceId(s.id)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border transition-all",
                          serviceId === s.id
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border bg-card hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-foreground">{s.name}</p>
                          <span className="font-display font-bold text-primary">${s.price}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.duration_minutes} min</span>
                        </div>
                        {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 1: Date & Time */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-display font-bold text-lg text-foreground mb-4">Elige fecha y hora</h2>
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={isDateDisabled}
                      locale={es}
                      className="rounded-xl border"
                    />
                  </div>
                  {date && (
                    <div>
                      <Label className="mb-2 block">Hora</Label>
                      {loadingSlots ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          <span className="ml-2 text-sm text-muted-foreground">Cargando disponibilidad...</span>
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded-lg">
                          No hay horarios disponibles para este día. Probá con otra fecha.
                        </p>
                      ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                          {availableSlots.map(t => (
                            <button
                              key={t}
                              onClick={() => setTime(t)}
                              className={cn(
                                "py-2 px-1 rounded-lg text-sm font-medium transition-all border",
                                time === t
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-card border-border text-foreground hover:border-primary/50"
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Client Details */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-display font-bold text-lg text-foreground mb-4">Tus datos</h2>
                <div className="space-y-4">
                  <div>
                    <Label>Nombre completo *</Label>
                    <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Juan Pérez" />
                  </div>
                  <div>
                    <Label>Teléfono / WhatsApp *</Label>
                    <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+54 11 1234-5678" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="juan@email.com" />
                  </div>
                  <div>
                    <Label>Notas (opcional)</Label>
                    <Textarea value={clientNotes} onChange={e => setClientNotes(e.target.value)} placeholder="Indicaciones especiales..." rows={2} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            {step < 2 ? (
              <Button variant="hero" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
                Siguiente <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button variant="hero" onClick={handleSubmit} disabled={saving || !canNext()}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Reserva"}
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Powered by <span className="font-display font-semibold">Nube<span className="text-primary">Service</span></span>
        </p>
      </div>
    </div>
  );
};

export default Booking;
