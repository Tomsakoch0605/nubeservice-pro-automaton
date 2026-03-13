import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

type Payment = {
  amount: number;
  status: string;
  created_at: string;
};

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const chartConfig = {
  completed: { label: "Cobrado", color: "hsl(var(--primary))" },
  pending: { label: "Pendiente", color: "hsl(var(--muted-foreground))" },
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

export default function MonthlyRevenueChart({ payments }: { payments: Payment[] }) {
  const data = useMemo(() => {
    const now = new Date();
    const months: { month: string; completed: number; pending: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ month: MONTH_LABELS[d.getMonth()], completed: 0, pending: 0 });

      for (const p of payments) {
        const pDate = new Date(p.created_at);
        const pKey = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, "0")}`;
        if (pKey === key) {
          if (p.status === "completed") months[months.length - 1].completed += p.amount;
          else if (p.status === "pending") months[months.length - 1].pending += p.amount;
        }
      }
    }
    return months;
  }, [payments]);

  const hasData = data.some((d) => d.completed > 0 || d.pending > 0);

  return (
    <div className="glass-card p-5 mb-8">
      <h3 className="font-display font-semibold text-foreground mb-4">Ingresos Mensuales</h3>
      {!hasData ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No hay datos de ingresos en los últimos 6 meses.
        </p>
      ) : (
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" className="text-xs fill-muted-foreground" tickLine={false} axisLine={false} />
            <YAxis className="text-xs fill-muted-foreground" tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v)} width={80} />
            <Tooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Bar dataKey="completed" fill="var(--color-completed)" radius={[4, 4, 0, 0]} name="Cobrado" />
            <Bar dataKey="pending" fill="var(--color-pending)" radius={[4, 4, 0, 0]} name="Pendiente" />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}
