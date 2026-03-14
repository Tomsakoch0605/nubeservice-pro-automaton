import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, Loader2, Copy, ShieldCheck, AlertTriangle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

type SettingsData = {
  businessName: string;
  slug: string;
  ownerName: string;
  phone: string;
  location: string;
  workDays: string[];
  startTime: string;
  endTime: string;
  cedulaProfesional: string;
  rfc: string;
};

type Props = {
  profileId: string;
};

const SettingsSection = ({ profileId }: Props) => {
  const [data, setData] = useState<SettingsData>({
    businessName: "", slug: "", ownerName: "", phone: "", location: "",
    workDays: [], startTime: "09:00", endTime: "18:00",
    cedulaProfesional: "", rfc: "",
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("business_name, slug, owner_name, phone, location, work_days, start_time, end_time")
        .eq("id", profileId)
        .maybeSingle();
      if (p) {
        setData({
          businessName: p.business_name || "",
          slug: p.slug || "",
          ownerName: p.owner_name || "",
          phone: p.phone || "",
          location: p.location || "",
          workDays: (p.work_days as string[]) || [],
          startTime: p.start_time?.slice(0, 5) || "09:00",
          endTime: p.end_time?.slice(0, 5) || "18:00",
        });
      }
      setLoaded(true);
    };
    load();
  }, [profileId]);

  const toggleDay = (day: string) => {
    setData(prev => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter(d => d !== day)
        : [...prev.workDays, day],
    }));
  };

  const handleSave = async () => {
    if (!data.businessName.trim()) {
      toast.error("El nombre del negocio es obligatorio");
      return;
    }
    if (!data.slug.trim()) {
      toast.error("El slug es obligatorio para las reservas públicas");
      return;
    }

    const cleanSlug = data.slug
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-|-$/g, "");

    if (!cleanSlug) {
      toast.error("El slug no es válido");
      return;
    }

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("slug", cleanSlug)
        .neq("id", profileId)
        .maybeSingle();
      if (existing) {
        toast.error("Ese slug ya está en uso, elige otro");
        setSaving(false);
        return;
      }
    } catch {}

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          business_name: data.businessName.trim(),
          slug: cleanSlug,
          owner_name: data.ownerName.trim(),
          phone: data.phone.trim() || null,
          location: data.location.trim() || null,
          work_days: data.workDays,
          start_time: data.startTime,
          end_time: data.endTime,
        })
        .eq("id", profileId);

      if (error) throw error;
      setData(prev => ({ ...prev, slug: cleanSlug }));
      toast.success("Configuración guardada");
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  const bookingUrl = `${window.location.origin}/reservar/${data.slug}`;

  return (
    <div className="glass-card p-6">
      <h3 className="font-display font-semibold text-lg mb-4 text-foreground flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" /> Configuración del Negocio
      </h3>

      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Nombre del Negocio</Label>
            <Input value={data.businessName} onChange={e => setData(p => ({ ...p, businessName: e.target.value }))} placeholder="Ej: Estética Laura" />
          </div>
          <div>
            <Label>Tu Nombre</Label>
            <Input value={data.ownerName} onChange={e => setData(p => ({ ...p, ownerName: e.target.value }))} placeholder="Laura García" />
          </div>
        </div>

        <div>
          <Label>Slug (URL de reservas)</Label>
          <div className="flex gap-2 items-center">
            <Input value={data.slug} onChange={e => setData(p => ({ ...p, slug: e.target.value }))} placeholder="mi-negocio" className="flex-1" />
            {data.slug && (
              <button
                onClick={() => { navigator.clipboard.writeText(bookingUrl); toast.success("Link copiado"); }}
                className="text-primary hover:text-primary/80 transition-colors shrink-0"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
          </div>
          {data.slug && (
            <p className="text-xs text-muted-foreground mt-1">
              {bookingUrl}
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>WhatsApp</Label>
            <Input value={data.phone} onChange={e => setData(p => ({ ...p, phone: e.target.value }))} placeholder="+54 11 1234-5678" />
          </div>
          <div>
            <Label>Ubicación</Label>
            <Input value={data.location} onChange={e => setData(p => ({ ...p, location: e.target.value }))} placeholder="Av. Corrientes 1234" />
          </div>
        </div>

        <div>
          <Label>Días de Trabajo</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {days.map(d => (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                  data.workDays.includes(d)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Hora Inicio</Label>
            <Input type="time" value={data.startTime} onChange={e => setData(p => ({ ...p, startTime: e.target.value }))} />
          </div>
          <div>
            <Label>Hora Fin</Label>
            <Input type="time" value={data.endTime} onChange={e => setData(p => ({ ...p, endTime: e.target.value }))} />
          </div>
        </div>

        <div className="pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsSection;
