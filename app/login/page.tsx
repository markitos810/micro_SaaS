"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function login() {
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg("Email o contraseña incorrectos.");
      return;
    }

    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="bg-neutral-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <h1 className="text-3xl font-bold mb-2">ClinicFlow AI</h1>
        <p className="text-white/60 mb-8">
          Accede al panel privado de tu clínica.
        </p>

        <div className="space-y-4">
          <input
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none"
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {errorMsg && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-200 p-3 rounded-xl text-sm">
              {errorMsg}
            </div>
          )}

          <button
            onClick={login}
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-neutral-200 transition disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}