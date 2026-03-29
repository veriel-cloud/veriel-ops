import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setStoredToken } from "../lib/api";

export function Login() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/system/status", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        setError("Token inválido");
        setLoading(false);
        return;
      }

      setStoredToken(token);
      navigate("/");
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="w-full max-w-sm">
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-8">
          <h1 className="text-xl font-bold text-[var(--color-text)] mb-1">veriel-ops</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">Introduce tu API token para acceder</p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="token" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              API Token
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Pega tu token aquí"
              autoFocus
              required
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]/40 focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />

            {error && <p className="mt-2 text-xs text-[var(--color-error)]">{error}</p>}

            <button
              type="submit"
              disabled={loading || !token.trim()}
              className="mt-4 w-full py-2 px-4 text-sm font-medium rounded-lg bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? "Verificando..." : "Acceder"}
            </button>
          </form>

          <p className="mt-4 text-xs text-[var(--color-text-secondary)]/60 text-center">
            Genera un token con: bun server/scripts/generate-token.ts
          </p>
        </div>
      </div>
    </div>
  );
}
