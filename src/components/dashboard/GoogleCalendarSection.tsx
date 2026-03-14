import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Loader2, Check, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = { profileId: string };

const GoogleCalendarSection = ({ profileId }: Props) => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    const { data } = await supabase
      .from("calendar_integrations" as any)
      .select("is_active, last_synced_at")
      .eq("profile_id", profileId)
      .eq("provider", "google")
      .maybeSingle();

    if (data) {
      setConnected((data as any).is_active);
      setLastSynced((data as any).last_synced_at);
    } else {
      setConnected(false);
    }
  }, [profileId]);

  useEffect(() => {
    checkConnection();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "google-calendar-connected" && event.data.success) {
        setConnected(true);
        toast.success("¡Google Calendar conectado!");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [checkConnection]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-connect");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "google-calendar-auth", "width=600,height=700,popup=yes");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al conectar");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("google-calendar-disconnect");
      if (error) throw error;
      setConnected(false);
      setLastSynced(null);
      toast.success("Google Calendar desconectado");
    } catch (err: any) {
      toast.error(err.message || "Error al desconectar");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: { action: "pull" },
      });
      if (error) throw error;
      setLastSynced(new Date().toISOString());
      toast.success(`Se sincronizaron ${data?.events?.length || 0} eventos`);
    } catch (err: any) {
      toast.error(err.message || "Error al sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  if (connected === null) return null;

  return (
    <div className="border-t border-border pt-4 mt-4">
      <h4 className="font-display font-semibold text-sm mb-3 text-foreground flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" /> Google Calendar
      </h4>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {connected ? (
          <>
            <div className="flex items-center gap-2 text-sm text-primary">
              <Check className="w-4 h-4" />
              <span>Conectado</span>
            </div>
            {lastSynced && (
              <span className="text-xs text-muted-foreground">
                Última sync: {new Date(lastSynced).toLocaleString("es-MX")}
              </span>
            )}
            <div className="flex gap-2 sm:ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="gap-1.5"
              >
                {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Sincronizar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={loading}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                Desconectar
              </Button>
            </div>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleConnect}
            disabled={loading}
            className="gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Conectar Google Calendar
          </Button>
        )}
      </div>
    </div>
  );
};

export default GoogleCalendarSection;
