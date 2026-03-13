import { useEffect, useState, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalIcon, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import AiAssistant from "@/components/dashboard/AiAssistant";
import NewAppointmentDialog from "@/components/dashboard/NewAppointmentDialog";
import EditAppointmentDialog, { type AppointmentDetail } from "@/components/dashboard/EditAppointmentDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CalendarAppt = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  clientName: string;
  serviceName: string;
};

type ViewMode = "week" | "month";

const DAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const statusDot: Record<string, string> = {
  confirmed: "bg-primary",
  pending: "bg-amber-400",
  completed: "bg-emerald-500",
  cancelled: "bg-destructive/60",
  no_show: "bg-destructive",
};

const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const CalendarView = () => {
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<CalendarAppt[]>([]);
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [newApptOpen, setNewApptOpen] = useState(false);
  const [editApptOpen, setEditApptOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<AppointmentDetail | null>(null);
  const navigate = useNavigate();

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (view === "week") {
      const start = getMonday(currentDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { rangeStart: start, rangeEnd: end };
    }
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
    return { rangeStart: start, rangeEnd: end };
  }, [currentDate, view]);

  const fetchAppointments = useCallback(async (pid: string, start: Date, end: Date) => {
    const { data, error } = await supabase
      .from("appointments")
      .select("id, starts_at, ends_at, status, notes, clients(full_name), services(name)")
      .eq("profile_id", pid)
      .gte("starts_at", start.toISOString())
      .lte("starts_at", end.toISOString())
      .order("starts_at");

    if (error) { console.error(error); return; }
    setAppointments((data || []).map((a: any) => ({
      id: a.id,
      starts_at: a.starts_at,
      ends_at: a.ends_at,
      status: a.status,
      notes: a.notes,
      clientName: a.clients?.full_name || "Sin cliente",
      serviceName: a.services?.name || "Sin servicio",
    })));
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
      if (!profile || !profile.onboarding_completed) { navigate("/onboarding"); return; }
      setProfileId(profile.id);
      setLoading(false);
    };
    init();
  }, [navigate]);

  useEffect(() => {
    if (profileId) fetchAppointments(profileId, rangeStart, rangeEnd);
  }, [profileId, rangeStart, rangeEnd, fetchAppointments]);

  const navigate_ = (dir: -1 | 1) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (view === "week") d.setDate(d.getDate() + dir * 7);
      else d.setMonth(d.getMonth() + dir);
      return d;
    });
  };

  const goToday = () => setCurrentDate(new Date());

  const handleApptClick = (a: CalendarAppt) => {
    setSelectedAppt({
      id: a.id,
      clientName: a.clientName,
      serviceName: a.serviceName,
      time: new Date(a.starts_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
      status: a.status,
      notes: a.notes,
    });
    setEditApptOpen(true);
  };

  const onUpdated = () => {
    if (profileId) fetchAppointments(profileId, rangeStart, rangeEnd);
  };

  const title = useMemo(() => {
    if (view === "week") {
      const mon = getMonday(currentDate);
      const sun = new Date(mon);
      sun.setDate(sun.getDate() + 6);
      const fmt = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
      return `${fmt(mon)} — ${fmt(sun)}, ${sun.getFullYear()}`;
    }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [currentDate, view]);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Calendario</h1>
            <p className="text-muted-foreground">Visualizá todas tus citas.</p>
          </div>
          <Button onClick={() => setNewApptOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nueva Cita
          </Button>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate_(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>Hoy</Button>
            <Button variant="outline" size="icon" onClick={() => navigate_(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="ml-2 font-display font-semibold text-foreground">{title}</span>
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["week", "month"] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium transition-colors",
                  view === v ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {v === "week" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${view}-${rangeStart.toISOString()}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {view === "week" ? (
              <WeekView appointments={appointments} currentDate={currentDate} onApptClick={handleApptClick} />
            ) : (
              <MonthView appointments={appointments} currentDate={currentDate} onApptClick={handleApptClick} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {profileId && (
        <NewAppointmentDialog
          open={newApptOpen}
          onOpenChange={setNewApptOpen}
          profileId={profileId}
          onCreated={onUpdated}
        />
      )}
      <EditAppointmentDialog
        open={editApptOpen}
        onOpenChange={setEditApptOpen}
        appointment={selectedAppt}
        onUpdated={onUpdated}
      />
      <AiAssistant />
    </div>
  );
};

/* ─── Week View ─── */
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 – 20:00

const WeekView = ({ appointments, currentDate, onApptClick }: {
  appointments: CalendarAppt[];
  currentDate: Date;
  onApptClick: (a: CalendarAppt) => void;
}) => {
  const monday = getMonday(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
  const today = new Date();

  return (
    <div className="glass-card overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
        <div className="p-2" />
        {days.map((d, i) => (
          <div
            key={i}
            className={cn(
              "p-2 text-center border-l border-border",
              isSameDay(d, today) && "bg-primary/5"
            )}
          >
            <p className="text-xs text-muted-foreground">{DAYS_SHORT[i]}</p>
            <p className={cn(
              "text-lg font-display font-bold",
              isSameDay(d, today) ? "text-primary" : "text-foreground"
            )}>{d.getDate()}</p>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="max-h-[480px] overflow-y-auto">
        {HOURS.map(hour => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] min-h-[52px] border-b border-border/50">
            <div className="p-1 text-xs text-muted-foreground text-right pr-2 pt-1">
              {String(hour).padStart(2, "0")}:00
            </div>
            {days.map((day, di) => {
              const dayAppts = appointments.filter(a => {
                const s = new Date(a.starts_at);
                return isSameDay(s, day) && s.getHours() === hour;
              });
              return (
                <div
                  key={di}
                  className={cn(
                    "border-l border-border/50 p-0.5 relative",
                    isSameDay(day, today) && "bg-primary/[0.02]"
                  )}
                >
                  {dayAppts.map(a => (
                    <button
                      key={a.id}
                      onClick={() => onApptClick(a)}
                      className={cn(
                        "w-full text-left px-1.5 py-1 rounded text-[11px] leading-tight mb-0.5 truncate transition-colors",
                        a.status === "cancelled"
                          ? "bg-destructive/10 text-destructive line-through"
                          : "bg-primary/10 text-foreground hover:bg-primary/20"
                      )}
                    >
                      <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1", statusDot[a.status] || "bg-muted-foreground")} />
                      {new Date(a.starts_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} {a.clientName.split(" ")[0]}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Month View ─── */
const MonthView = ({ appointments, currentDate, onApptClick }: {
  appointments: CalendarAppt[];
  currentDate: Date;
  onApptClick: (a: CalendarAppt) => void;
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday-based offset
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const totalCells = startOffset + lastDay.getDate();
  const rows = Math.ceil(totalCells / 7);
  const cells: (Date | null)[] = [];

  for (let i = 0; i < rows * 7; i++) {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) {
      cells.push(null);
    } else {
      cells.push(new Date(year, month, dayNum));
    }
  }

  const today = new Date();

  return (
    <div className="glass-card overflow-hidden">
      {/* Headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS_SHORT.map(d => (
          <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          if (!cell) {
            return <div key={i} className="min-h-[80px] border-b border-r border-border/30 bg-muted/20" />;
          }
          const dayAppts = appointments.filter(a => isSameDay(new Date(a.starts_at), cell));
          const isToday = isSameDay(cell, today);

          return (
            <div
              key={i}
              className={cn(
                "min-h-[80px] border-b border-r border-border/30 p-1",
                isToday && "bg-primary/5"
              )}
            >
              <p className={cn(
                "text-xs font-medium mb-1",
                isToday ? "text-primary font-bold" : "text-foreground"
              )}>
                {cell.getDate()}
              </p>
              <div className="space-y-0.5">
                {dayAppts.slice(0, 3).map(a => (
                  <button
                    key={a.id}
                    onClick={() => onApptClick(a)}
                    className={cn(
                      "w-full text-left px-1 py-0.5 rounded text-[10px] leading-tight truncate transition-colors",
                      a.status === "cancelled"
                        ? "bg-destructive/10 text-destructive line-through"
                        : "bg-primary/10 text-foreground hover:bg-primary/20"
                    )}
                  >
                    <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-0.5", statusDot[a.status] || "bg-muted-foreground")} />
                    {new Date(a.starts_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} {a.clientName.split(" ")[0]}
                  </button>
                ))}
                {dayAppts.length > 3 && (
                  <p className="text-[10px] text-muted-foreground pl-1">+{dayAppts.length - 3} más</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
