import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { TrendingDown, CalendarDays, PieChart as PieIcon } from "lucide-react";

type Props = { profileId: string };

const DAYS_ORDER = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAY_MAP: Record<number, string> = { 1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes", 6: "Sábado", 0: "Domingo" };

const STATUS_COLORS: Record<string, string> = {
  confirmed: "hsl(var(--primary))",
  completed: "hsl(142 71% 45%)",
  cancelled: "hsl(0 84% 60%)",
  no_show: "hsl(38 92% 50%)",
  pending: "hsl(var(--muted-foreground))",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmado",
  completed: "Completado",
  cancelled: "Cancelado",
  no_show: "No asistió",
  pending: "Pendiente",
};

const AdvancedStats = ({ profileId }: Props) => {
  const [dayData, setDayData] = useState<{ day: string; count: number }[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [cancellationRate, setCancellationRate] = useState(0);
  const [totalAppts, setTotalAppts] = useState(0);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("appointments")
      .select("starts_at, status")
      .eq("profile_id", profileId);

    if (!data || data.length === 0) return;

    setTotalAppts(data.length);

    // Appointments by day of week
    const dayCounts: Record<string, number> = {};
    DAYS_ORDER.forEach(d => (dayCounts[d] = 0));
    data.forEach(a => {
      const jsDay = new Date(a.starts_at).getDay();
      const dayName = DAY_MAP[jsDay];
      if (dayName) dayCounts[dayName]++;
    });
    setDayData(DAYS_ORDER.map(d => ({ day: d.slice(0, 3), count: dayCounts[d] })));

    // Status distribution
    const statusCounts: Record<string, number> = {};
    data.forEach(a => {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    });
    setStatusData(
      Object.entries(statusCounts)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({
          name: STATUS_LABELS[k] || k,
          value: v,
          color: STATUS_COLORS[k] || "hsl(var(--muted-foreground))",
        }))
    );

    // Cancellation rate
    const cancelledOrNoShow = data.filter(a => a.status === "cancelled" || a.status === "no_show").length;
    setCancellationRate(data.length > 0 ? Math.round((cancelledOrNoShow / data.length) * 100) : 0);
  }, [profileId]);

  useEffect(() => { load(); }, [load]);

  if (totalAppts === 0) return null;

  return (
    <div className="grid lg:grid-cols-2 gap-6 mt-6">
      {/* Appointments by Day of Week */}
      <div className="glass-card p-6">
        <h3 className="font-display font-semibold text-lg mb-1 text-foreground flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" /> Citas por Día de la Semana
        </h3>
        <p className="text-xs text-muted-foreground mb-4">Distribución histórica de todas tus citas</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayData} barSize={32}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 13,
                }}
                formatter={(value: number) => [`${value} citas`, "Total"]}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {dayData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.count === Math.max(...dayData.map(d => d.count)) && entry.count > 0
                      ? "hsl(var(--primary))"
                      : "hsl(var(--primary) / 0.4)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Distribution + Cancellation Rate */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-primary" /> Estado de Citas
          </h3>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10">
            <TrendingDown className="w-3.5 h-3.5 text-destructive" />
            <span className="text-xs font-semibold text-destructive">{cancellationRate}% cancelación</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Incluye cancelaciones y no-shows • {totalAppts} citas totales</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                stroke="none"
              >
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 13,
                }}
                formatter={(value: number, name: string) => [`${value} citas`, name]}
              />
              <Legend
                verticalAlign="middle"
                align="right"
                layout="vertical"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span style={{ color: "hsl(var(--foreground))", fontSize: 12 }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdvancedStats;
