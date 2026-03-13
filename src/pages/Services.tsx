import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Plus, Pencil, Loader2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Service = Tables<"services">;

const Services = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");

  const loadServices = useCallback(async (pid: string) => {
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("profile_id", pid)
      .order("name");
    setServices(data || []);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, onboarding_completed")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!profile || !profile.onboarding_completed) { navigate("/auth"); return; }
      setProfileId(profile.id);
      await loadServices(profile.id);
      setLoading(false);
    };
    init();
  }, [navigate, loadServices]);

  const openNew = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setPrice("");
    setDuration("60");
    setDialogOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setName(s.name);
    setDescription(s.description || "");
    setPrice(String(s.price));
    setDuration(String(s.duration_minutes));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!profileId || !name.trim()) return;
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: Number(price) || 0,
      duration_minutes: Number(duration) || 60,
      profile_id: profileId,
    };

    if (editing) {
      const { error } = await supabase.from("services").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Servicio actualizado" });
    } else {
      const { error } = await supabase.from("services").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Servicio creado" });
    }
    setDialogOpen(false);
    await loadServices(profileId);
  };

  const toggleActive = async (s: Service) => {
    if (!profileId) return;
    const { error } = await supabase.from("services").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: s.is_active ? "Servicio desactivado" : "Servicio activado" });
    await loadServices(profileId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12 px-4 container mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Servicios</h1>
            <p className="text-muted-foreground">Gestiona tu catálogo de servicios.</p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> Nuevo Servicio
          </Button>
        </div>

        {services.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">Sin servicios todavía</p>
            <p className="text-muted-foreground mb-6">Agrega tu primer servicio para empezar a gestionar tu negocio.</p>
            <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Agregar Servicio</Button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden sm:table-cell">Descripción</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {services.map((s) => (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground max-w-[200px] truncate">
                        {s.description || "—"}
                      </TableCell>
                      <TableCell>${Number(s.price).toLocaleString("es-MX")}</TableCell>
                      <TableCell>{s.duration_minutes} min</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={!!s.is_active} onCheckedChange={() => toggleActive(s)} />
                          <Badge variant={s.is_active ? "default" : "secondary"}>
                            {s.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </motion.div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
            <DialogDescription>
              {editing ? "Modifica los datos del servicio." : "Completa los datos para crear un servicio."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">Nombre *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Corte de pelo" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Descripción</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción opcional" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Precio ($)</label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" min="0" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Duración (min)</label>
                <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="60" min="5" step="5" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>{editing ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Services;
