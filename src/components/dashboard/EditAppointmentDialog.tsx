import { useState } from "react";
import { Loader2, XCircle, CheckCircle, AlertTriangle, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type AppointmentDetail = {
  id: string;
  clientName: string;
  serviceName: string;
  time: string;
  status: string;
  notes?: string | null;
};

interface EditAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentDetail | null;
  onUpdated: () => void;
}

const statusOptions = [
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "completed", label: "Completado" },
  { value: "no_show", label: "No asistió" },
];

const EditAppointmentDialog = ({ open, onOpenChange, appointment, onUpdated }: EditAppointmentDialogProps) => {
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Sync state when appointment changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && appointment) {
      setStatus(appointment.status);
      setNotes(appointment.notes || "");
    }
    onOpenChange(isOpen);
  };

  if (!appointment) return null;

  const isCancelled = appointment.status === "cancelled";

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("appointments")
      .update({ status: status as any, notes: notes.trim() || null })
      .eq("id", appointment.id);

    if (error) {
      toast.error("Error al actualizar la cita");
      setSaving(false);
      return;
    }
    toast.success("Cita actualizada");
    setSaving(false);
    onOpenChange(false);
    onUpdated();
  };

  const handleCancel = async () => {
    setCancelling(true);
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" as any })
      .eq("id", appointment.id);

    if (error) {
      toast.error("Error al cancelar la cita");
      setCancelling(false);
      return;
    }
    toast.success("Cita cancelada");
    setCancelling(false);
    setCancelConfirmOpen(false);
    onOpenChange(false);
    onUpdated();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Detalle de Cita</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Read-only info */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <p className="text-sm font-medium text-foreground">{appointment.clientName}</p>
              <p className="text-xs text-muted-foreground">{appointment.serviceName} — {appointment.time}</p>
            </div>

            {/* Status */}
            <div>
              <Label>Estado</Label>
              <Select value={status} onValueChange={setStatus} disabled={isCancelled}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <Label>Notas</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas sobre la cita..."
                rows={2}
                disabled={isCancelled}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {!isCancelled && (
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => setCancelConfirmOpen(true)}
                >
                  <XCircle className="w-4 h-4" /> Cancelar Cita
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              {!isCancelled && (
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Guardar</>}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Cancelar cita
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres cancelar la cita de <strong>{appointment.clientName}</strong> a las <strong>{appointment.time}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelling}
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sí, cancelar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditAppointmentDialog;
