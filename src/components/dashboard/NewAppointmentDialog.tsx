import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { pushToGoogleCalendar } from "@/lib/google-calendar-sync";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type ClientOption = { id: string; full_name: string };
type ServiceOption = { id: string; name: string; duration_minutes: number; price: number };

interface NewAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  onCreated: () => void;
}

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

const NewAppointmentDialog = ({ open, onOpenChange, profileId, onCreated }: NewAppointmentDialogProps) => {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [clientId, setClientId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const timeSlots = generateTimeSlots();

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      setLoadingData(true);
      const [cRes, sRes] = await Promise.all([
        supabase.from("clients").select("id, full_name").eq("profile_id", profileId).order("full_name"),
        supabase.from("services").select("id, name, duration_minutes, price").eq("profile_id", profileId).eq("is_active", true).order("name"),
      ]);
      setClients(cRes.data || []);
      setServices(sRes.data || []);
      setLoadingData(false);
    };
    fetchData();
    // Reset form
    setClientId("");
    setServiceId("");
    setDate(undefined);
    setTime("");
    setNotes("");
  }, [open, profileId]);

  const handleSave = async () => {
    if (!clientId) { toast.error("Selecciona un cliente"); return; }
    if (!serviceId) { toast.error("Selecciona un servicio"); return; }
    if (!date) { toast.error("Selecciona una fecha"); return; }
    if (!time) { toast.error("Selecciona un horario"); return; }

    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const [h, m] = time.split(":").map(Number);
    const startsAt = new Date(date);
    startsAt.setHours(h, m, 0, 0);

    const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60 * 1000);

    setSaving(true);
    const { error } = await supabase.from("appointments").insert({
      profile_id: profileId,
      client_id: clientId,
      service_id: serviceId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      notes: notes.trim() || null,
      status: "confirmed",
    });

    if (error) {
      toast.error("Error al crear la cita");
      console.error(error);
      setSaving(false);
      return;
    }

    toast.success("Cita creada exitosamente");
    setSaving(false);
    onOpenChange(false);
    onCreated();
  };

  const selectedService = services.find(s => s.id === serviceId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Nueva Cita</DialogTitle>
        </DialogHeader>

        {loadingData ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Client */}
            <div>
              <Label>Cliente *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No hay clientes registrados</div>
                  ) : (
                    clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Service */}
            <div>
              <Label>Servicio *</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un servicio" />
                </SelectTrigger>
                <SelectContent>
                  {services.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No hay servicios activos</div>
                  ) : (
                    services.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {s.duration_minutes}min · ${s.price}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedService && (
                <p className="text-xs text-muted-foreground mt-1">
                  Duración: {selectedService.duration_minutes} min
                </p>
              )}
            </div>

            {/* Date */}
            <div>
              <Label>Fecha *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: es }) : "Selecciona una fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time */}
            <div>
              <Label>Hora *</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un horario" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Indicaciones especiales..."
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear Cita"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NewAppointmentDialog;
