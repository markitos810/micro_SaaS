"use client";

import { useEffect, useState } from "react";
import {
  MessageCircle,
  CalendarCheck,
  TrendingUp,
  Euro,
  Sparkles,
  ArrowRight,
  Phone,
  Clock,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

type Lead = {
  id: string;
  name: string | null;
  phone: string;
  treatment_interest: string | null;
  status: string | null;
  interest_level: string | null;
  notes: string | null;
};

export default function ClinicFlowDemo() {
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [messages, setMessages] = useState([
    {
      sender: "client",
      text: "Hola, quería información sobre aumento de labios",
    },
    {
      sender: "ai",
      text: "¡Hola! Claro. Trabajamos con ácido hialurónico premium. ¿Te gustaría reservar valoración gratuita?",
    },
  ]);

  const [input, setInput] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [errorLeads, setErrorLeads] = useState("");
  const [showLeadForm, setShowLeadForm] = useState(false);

  const [newLead, setNewLead] = useState({
    name: "",
    phone: "",
    treatment_interest: "",
    status: "nuevo",
    interest_level: "medio",
    notes: "",
  });

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      setCheckingAuth(false);
      await loadClinic();
      await loadLeads();
    }

    init();
  }, []);

  async function loadClinic() {
    const { data, error } = await supabase
      .from("clinics")
      .select("id")
      .maybeSingle();

    if (error) {
      console.error(error);
      setErrorLeads("No se pudo cargar la clínica del usuario.");
      return;
    }

    if (data) {
      setClinicId(data.id);
    } else {
      setErrorLeads("Este usuario no está vinculado a ninguna clínica.");
    }
  }

  async function loadLeads() {
    setLoadingLeads(true);

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setErrorLeads("No se pudieron cargar los leads desde Supabase.");
    } else {
      setLeads(data || []);
      setErrorLeads("");
    }

    setLoadingLeads(false);
  }

  const sendMessage = () => {
    if (!input.trim()) return;

    setMessages([
      ...messages,
      { sender: "client", text: input },
      {
        sender: "ai",
        text: "Perfecto ✨ Te hemos enviado opciones disponibles para esta semana.",
      },
    ]);

    setInput("");
  };

  async function createLead() {
    if (!newLead.name.trim() || !newLead.phone.trim()) {
      alert("Pon al menos nombre y teléfono.");
      return;
    }

    if (!clinicId) {
      alert("No se ha encontrado la clínica del usuario.");
      return;
    }

    const { error } = await supabase.from("leads").insert([
      {
        clinic_id: clinicId,
        name: newLead.name,
        phone: newLead.phone,
        treatment_interest: newLead.treatment_interest,
        status: newLead.status,
        interest_level: newLead.interest_level,
        notes: newLead.notes,
      },
    ]);

    if (error) {
      console.error(error);
      alert("Error al crear el lead. Revisa permisos/RLS en Supabase.");
      return;
    }

    setNewLead({
      name: "",
      phone: "",
      treatment_interest: "",
      status: "nuevo",
      interest_level: "medio",
      notes: "",
    });

    setShowLeadForm(false);
    await loadLeads();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/60">Comprobando acceso...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <button
        onClick={logout}
        className="fixed top-6 right-6 bg-white text-black px-4 py-2 rounded-xl font-semibold z-50 hover:bg-neutral-200 transition"
      >
        Cerrar sesión
      </button>

      {/* HERO */}
      <section className="px-8 py-16 border-b border-white/10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-pink-500/20 text-pink-300 px-4 py-2 rounded-full mb-6">
              <Sparkles size={18} />
              IA para Clínicas Estéticas
            </div>

            <h1 className="text-5xl font-bold leading-tight mb-6">
              Convierte WhatsApp en una máquina de reservas
            </h1>

            <p className="text-white/70 text-lg mb-8">
              Automatiza respuestas, seguimientos y captación de pacientes con
              inteligencia artificial.
            </p>

            <div className="flex gap-4">
              <button className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-neutral-200 transition">
                Solicitar Demo
              </button>

              <button className="border border-white/20 px-6 py-3 rounded-xl hover:bg-white/10 transition">
                Ver Dashboard
              </button>
            </div>
          </div>

          {/* CHAT */}
          <div className="bg-neutral-900 rounded-3xl border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <MessageCircle className="text-green-400" />
              <h2 className="font-semibold text-xl">
                Asistente WhatsApp IA
              </h2>
            </div>

            <div className="space-y-4 h-[350px] overflow-y-auto mb-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-[80%] p-4 rounded-2xl ${
                    msg.sender === "client"
                      ? "bg-white text-black ml-auto"
                      : "bg-green-500/20 text-green-100"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 outline-none"
                placeholder="Escribe un mensaje..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />

              <button
                onClick={sendMessage}
                className="bg-green-500 px-5 rounded-xl hover:bg-green-400 transition"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="px-8 py-14 border-b border-white/10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          <div className="bg-neutral-900 p-6 rounded-3xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="text-green-400" />
              <h3 className="text-xl font-semibold">Conversión</h3>
            </div>

            <p className="text-5xl font-bold">+37%</p>

            <p className="text-white/60 mt-2">
              Más reservas desde WhatsApp
            </p>
          </div>

          <div className="bg-neutral-900 p-6 rounded-3xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="text-yellow-400" />
              <h3 className="text-xl font-semibold">Tiempo Ahorrado</h3>
            </div>

            <p className="text-5xl font-bold">18h</p>

            <p className="text-white/60 mt-2">
              Menos atención manual semanal
            </p>
          </div>

          <div className="bg-neutral-900 p-6 rounded-3xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <Euro className="text-pink-400" />
              <h3 className="text-xl font-semibold">Ingresos</h3>
            </div>

            <p className="text-5xl font-bold">+4.2k€</p>

            <p className="text-white/60 mt-2">
              Incremento mensual estimado
            </p>
          </div>
        </div>
      </section>

      {/* LEADS */}
      <section className="px-8 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-4xl font-bold mb-2">
                Pipeline de Pacientes
              </h2>

              <p className="text-white/60">
                Leads privados cargados desde Supabase.
              </p>
            </div>

            <button
              onClick={() => setShowLeadForm(true)}
              className="flex items-center gap-2 bg-white text-black px-5 py-3 rounded-xl font-semibold hover:bg-neutral-200 transition"
            >
              Nuevo Lead
              <ArrowRight size={18} />
            </button>
          </div>

          {loadingLeads && (
            <p className="text-white/60">Cargando leads desde Supabase...</p>
          )}

          {errorLeads && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-200 p-4 rounded-xl mb-6">
              {errorLeads}
            </div>
          )}

          {!loadingLeads && !errorLeads && leads.length === 0 && (
            <p className="text-white/60">
              No hay leads todavía en Supabase.
            </p>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="bg-neutral-900 border border-white/10 rounded-3xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-semibold">
                      {lead.name || "Paciente sin nombre"}
                    </h3>
                    <p className="text-white/50">
                      {lead.treatment_interest || "Tratamiento no indicado"}
                    </p>
                  </div>

                  <div className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm">
                    {lead.status || "nuevo"}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-white/70">
                    <Phone size={18} />
                    {lead.phone}
                  </div>

                  <div className="flex items-center gap-3 text-white/70">
                    <CalendarCheck size={18} />
                    Interés: {lead.interest_level || "medio"}
                  </div>

                  <div className="flex items-center gap-3 text-white/70">
                    <Euro size={18} />
                    {lead.notes || "Sin notas"}
                  </div>
                </div>

                <button className="mt-8 w-full bg-white text-black py-3 rounded-xl font-semibold hover:bg-neutral-200 transition">
                  Ver conversación
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODAL NUEVO LEAD */}
      {showLeadForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl p-8 max-w-xl w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold">Nuevo Lead</h2>
                <p className="text-white/50 mt-1">
                  Guarda un paciente interesado en Supabase.
                </p>
              </div>

              <button
                onClick={() => setShowLeadForm(false)}
                className="text-white/60 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <input
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none"
                placeholder="Nombre del paciente"
                value={newLead.name}
                onChange={(e) =>
                  setNewLead({ ...newLead, name: e.target.value })
                }
              />

              <input
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none"
                placeholder="Teléfono"
                value={newLead.phone}
                onChange={(e) =>
                  setNewLead({ ...newLead, phone: e.target.value })
                }
              />

              <input
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none"
                placeholder="Tratamiento de interés"
                value={newLead.treatment_interest}
                onChange={(e) =>
                  setNewLead({
                    ...newLead,
                    treatment_interest: e.target.value,
                  })
                }
              />

              <select
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none"
                value={newLead.status}
                onChange={(e) =>
                  setNewLead({ ...newLead, status: e.target.value })
                }
              >
                <option value="nuevo">Nuevo</option>
                <option value="seguimiento">Seguimiento</option>
                <option value="citado">Citado</option>
                <option value="perdido">Perdido</option>
              </select>

              <select
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none"
                value={newLead.interest_level}
                onChange={(e) =>
                  setNewLead({
                    ...newLead,
                    interest_level: e.target.value,
                  })
                }
              >
                <option value="bajo">Interés bajo</option>
                <option value="medio">Interés medio</option>
                <option value="alto">Interés alto</option>
              </select>

              <textarea
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none min-h-[100px]"
                placeholder="Notas"
                value={newLead.notes}
                onChange={(e) =>
                  setNewLead({ ...newLead, notes: e.target.value })
                }
              />

              <button
                onClick={createLead}
                className="w-full bg-green-500 text-black font-semibold py-3 rounded-xl hover:bg-green-400 transition"
              >
                Guardar Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}