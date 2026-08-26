import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

const ACCESS_CODE = "SonoraSecret";

export default function AccessCode() {
  const { user, checkUserAuth, logout } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (user && user.access_verified) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (code.trim() !== ACCESS_CODE) {
      setError("Código de acesso incorreto.");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.updateMe({ access_verified: true });
      await checkUserAuth();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Não foi possível verificar o código.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={KeyRound}
      title="Código de acesso"
      subtitle="Esta app é privada. Insere o código de acesso para continuar."
      footer={
        <button onClick={() => logout(true)} className="text-primary font-medium hover:underline">
          Sair
        </button>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="access-code">Código de acesso</Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="access-code"
              type="text"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              A verificar...
            </>
          ) : (
            "Continuar"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}