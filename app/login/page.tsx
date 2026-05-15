"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const ok = await login(email, password);
    setSubmitting(false);
    if (!ok) {
      setError("Credenciales no válidas. Verifica el correo y la contraseña.");
      return;
    }
    router.replace("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Gestión integral
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Sistema de Salarios</h1>
          <p className="mt-2 text-sm text-slate-400">Inicia sesión para continuar</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              name="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
            />

            <Input
              label="Contraseña"
              type="password"
              name="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Verificando…" : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
            <p className="mb-2 font-semibold text-slate-700">Credenciales de prueba</p>
            <p>
              <span className="font-medium">Administrador:</span> admin@empresa.com / admin123
            </p>
            <p>
              <span className="font-medium">Encargado:</span> encargado@empresa.com / encargado123
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Prototipo Fase 1 · Datos en localStorage
        </p>
      </div>
    </div>
  );
}
