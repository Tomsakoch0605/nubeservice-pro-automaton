import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type VerificationResult = {
  verified: boolean | null;
  fallback?: boolean;
  message: string;
  holderName?: string;
  profession?: string;
  institution?: string;
  verificationUrl?: string;
};

type Props = {
  cedula: string;
};

const CedulaVerification = ({ cedula }: Props) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const verify = async () => {
    if (!cedula.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("verify-cedula", {
        body: { cedula: cedula.trim() },
      });

      if (error) {
        setResult({
          verified: null,
          fallback: true,
          message: "No se pudo verificar automáticamente.",
          verificationUrl: "https://cedulaprofesional.sep.gob.mx/",
        });
      } else {
        setResult(data as VerificationResult);
      }
    } catch {
      setResult({
        verified: null,
        fallback: true,
        message: "Error de conexión. Verifica manualmente.",
        verificationUrl: "https://cedulaprofesional.sep.gob.mx/",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={verify}
        disabled={loading || !cedula.trim()}
        className="gap-2"
      >
        {loading ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando en la SEP...</>
        ) : (
          <><ShieldCheck className="w-3.5 h-3.5" /> Verificar Cédula en la SEP</>
        )}
      </Button>

      {result && (
        <div
          className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${
            result.verified === true
              ? "bg-primary/5 border-primary/20"
              : result.verified === false
              ? "bg-destructive/5 border-destructive/20"
              : "bg-muted border-border"
          }`}
        >
          {result.verified === true && <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
          {result.verified === false && <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />}
          {result.verified === null && <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}

          <div className="flex-1 space-y-1">
            <p className={`text-xs font-medium ${
              result.verified === true ? "text-primary" :
              result.verified === false ? "text-destructive" :
              "text-muted-foreground"
            }`}>
              {result.message}
            </p>

            {result.verified === true && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                {result.holderName && <p><strong>Nombre:</strong> {result.holderName}</p>}
                {result.profession && <p><strong>Profesión:</strong> {result.profession}</p>}
                {result.institution && <p><strong>Institución:</strong> {result.institution}</p>}
              </div>
            )}

            {(result.fallback || result.verified === null) && result.verificationUrl && (
              <a
                href={result.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Verificar manualmente en la SEP <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CedulaVerification;
