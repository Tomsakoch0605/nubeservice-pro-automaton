import { useEffect, useState, useCallback } from "react";
import { Users, Plus, Search, Loader2, Pencil, X, Phone, Mail, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "@/components/landing/Navbar";
import AiAssistant from "@/components/dashboard/AiAssistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Client = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  total_visits: number | null;
  total_spent: number | null;
  last_visit_at: string | null;
  created_at: string;
};

type ClientForm = {
  full_name: string;
  phone: string;
  email: string;
  notes: string;
};

const emptyForm: ClientForm = { full_name: "", phone: "", email: "", notes: "" };

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

const Clients = () => {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const fetchClients = useCallback(async (pid: string) => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("profile_id", pid)
      .order("created_at", { ascending: false });
    if (error) { toast.error("Error al cargar clientes"); return; }
    setClients(data || []);
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, onboarding_completed")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!profile || !profile.onboarding_completed) { navigate("/onboarding"); return; }
      setProfileId(profile.id);
      await fetchClients(profile.id);
      setLoading(false);
    };
    load();
  }, [navigate, fetchClients]);

  const openNew = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditingClient(c);
    setForm({
      full_name: c.full_name,
      phone: c.phone || "",
      email: c.email || "",
      notes: c.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error("El nombre es obligatorio"); return; }
    if (!profileId) return;
    setSaving(true);

    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
      profile_id: profileId,
    };

    if (editingClient) {
      const { error } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", editingClient.id);
      if (error) { toast.error("Error al actualizar cliente"); setSaving(false); return; }
      toast.success("Cliente actualizado");
    } else {
      const { error } = await supabase.from("clients").insert(payload);
      if (error) { toast.error("Error al crear cliente"); setSaving(false); return; }
      toast.success("Cliente creado");
    }

    setDialogOpen(false);
    setSaving(false);
    await fetchClients(profileId);
  };

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  });

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">Gestiona tu cartera de clientes.</p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono o email..."
            className="pl-10"
          />
        </div>

        {/* Client list */}
        {filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <p className="text-muted-foreground">
              {search ? "No se encontraron clientes con esa búsqueda." : "Todavía no tenés clientes. ¡Agregá el primero!"}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            <AnimatePresence>
              {filtered.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-card p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openEdit(c)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-display font-bold text-primary">
                        {c.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{c.full_name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {c.phone && (
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>
                        )}
                        {c.email && (
                          <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{c.email}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">{c.total_visits ?? 0} visitas</p>
                      <p className="text-sm font-display font-semibold text-foreground">{formatCurrency(Number(c.total_spent ?? 0))}</p>
                    </div>
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="full_name">Nombre completo *</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Juan Pérez"
              />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+54 11 1234-5678"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="cliente@email.com"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Preferencias, alergias, etc."
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingClient ? "Guardar" : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AiAssistant />
    </div>
  );
};

export default Clients;
