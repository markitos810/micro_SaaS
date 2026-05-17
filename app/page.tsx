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
  Send,
  User,
  Bot,
  Save,
  Bell,
  CheckCircle2,
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

type ConversationMessage = {
  id: string;
  lead_id: string;
  role: string;
  message: string;
  created_at: string;
};

type FollowUp = {
  id: string;
  lead_id: string;
  message: string;
  scheduled_at: string;
  status: string | null;
  created_at: string;
  leads?: {
    name: string | null;
    phone: string | null;
    treatment_interest: string | null;
  } | null;
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
      text: "¡Hola! 💖 Claro. Trabajamos con ácido hialurónico premium. ¿Te gustaría reservar valoración gratuita?",
    },
  ]);

  const [input, setInput] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingFollowUps, setLoadingFollowUps] = useState(true);
  const [errorLeads, setErrorLeads] = useState("");
  const [showLeadForm, setShowLeadForm] = useState(false);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [conversationMessages, setConversationMessages] = useState<
    ConversationMessage[]
  >([]);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [newConversationMessage, setNewConversationMessage] = useState("");
  const [newConversationRole, setNewConversationRole] = useState("clinica");
  const [savingLead, setSavingLead] = useState(false);

  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({
    message: "",
    scheduled_at: "",
  });

  const [editableLead, setEditableLead] = useState({
    name: "",
    phone: "",
    treatment_interest: "",
    status: "nuevo",
    interest_level: "medio",
    notes: "",
  });

  const [newLead, setNewLead] = useState({
    name: "",
    phone: "",
    treatment_interest: "",
    status: "nuevo",
    interest_level: "medio",
    notes: "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [interestFilter, setInterestFilter] = useState("todos");

  const filteredLeads = leads.filter((lead) => {
    const searchableText = `
      ${lead.name || ""}
      ${lead.phone || ""}
      ${lead.treatment_interest || ""}
    `.toLowerCase();

    const matchesSearch = searchableText.includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "todos" || (lead.status || "nuevo") === statusFilter;

    const matchesInterest =
      interestFilter === "todos" ||
      (lead.interest_level || "medio") === interestFilter;

    return matchesSearch && matchesStatus && matchesInterest;
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
      await loadFollowUps();
    }

    init();
  }, []);

  function getTomorrowDateTimeInput() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(10, 0, 0, 0);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function formatDate(dateString: string) {
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateString));
  }

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

  async function loadFollowUps() {
    setLoadingFollowUps(true);

    const { data, error } = await supabase
      .from("follow_ups")
      .select(
        "id, lead_id, message, scheduled_at, status, created_at, leads(name, phone, treatment_interest)"
      )
      .eq("status", "pendiente")
      .order("scheduled_at", { ascending: true });

    if (error) {
      console.error(error);
      setFollowUps([]);
    } else {
      setFollowUps((data || []) as unknown as FollowUp[]);
    }

    setLoadingFollowUps(false);
  }

  async function openConversation(lead: Lead) {
    setSelectedLead(lead);

    setEditableLead({
      name: lead.name || "",
      phone: lead.phone || "",
      treatment_interest: lead.treatment_interest || "",
      status: lead.status || "nuevo",
      interest_level: lead.interest_level || "medio",
      notes: lead.notes || "",
    });

    setLoadingConversation(true);
    setConversationMessages([]);

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      alert("No se pudo cargar la conversación.");
    } else {
      setConversationMessages(data || []);
    }

    setLoadingConversation(false);
  }

  async function addConversationMessage() {
    if (!selectedLead) return;

    if (!newConversationMessage.trim()) {
      alert("Escribe un mensaje.");
      return;
    }

    const { error } = await supabase.from("conversations").insert([
      {
        lead_id: selectedLead.id,
        role: newConversationRole,
        message: newConversationMessage,
      },
    ]);

    if (error) {
      console.error(error);
      alert("No se pudo guardar el mensaje. Revisa permisos/RLS.");
      return;
    }

    setNewConversationMessage("");
    await openConversation(selectedLead);
  }

  async function updateLead() {
    if (!selectedLead) return;

    if (!editableLead.name.trim() || !editableLead.phone.trim()) {
      alert("El nombre y el teléfono son obligatorios.");
      return;
    }

    setSavingLead(true);

    const { error } = await supabase
      .from("leads")
      .update({
        name: editableLead.name,
        phone: editableLead.phone,
        treatment_interest: editableLead.treatment_interest,
        status: editableLead.status,
        interest_level: editableLead.interest_level,
        notes: editableLead.notes,
      })
      .eq("id", selectedLead.id);

    setSavingLead(false);

    if (error) {
      console.error(error);
      alert("No se pudo actualizar el lead. Revisa permisos/RLS.");
      return;
    }

    const updatedLead: Lead = {
      ...selectedLead,
      name: editableLead.name,
      phone: editableLead.phone,
      treatment_interest: editableLead.treatment_interest,
      status: editableLead.status,
      interest_level: editableLead.interest_level,
      notes: editableLead.notes,
    };

    setSelectedLead(updatedLead);
    await loadLeads();
    alert("Lead actualizado correctamente.");
  }

  function openFollowUpForm() {
    if (!selectedLead) return;

    setNewFollowUp({
      message: `Hola ${selectedLead.name || ""}, queríamos saber si sigues interesada/o en ${
        selectedLead.treatment_interest || "el tratamiento"
      }. ¿Quieres que te ayudemos a reservar una valoración?`,
      scheduled_at: getTomorrowDateTimeInput(),
    });

    setShowFollowUpForm(true);
  }

  async function createFollowUp() {
    if (!selectedLead) return;

    if (!newFollowUp.message.trim() || !newFollowUp.scheduled_at) {
      alert("Escribe el mensaje y selecciona fecha/hora.");
      return;
    }

    setSavingFollowUp(true);

    const { error } = await supabase.from("follow_ups").insert([
      {
        lead_id: selectedLead.id,
        message: newFollowUp.message,
        scheduled_at: new Date(newFollowUp.scheduled_at).toISOString(),
        status: "pendiente",
      },
    ]);

    setSavingFollowUp(false);

    if (error) {
      console.error(error);
      alert("No se pudo programar el seguimiento. Revisa permisos/RLS.");
      return;
    }

    setShowFollowUpForm(false);
    setNewFollowUp({
      message: "",
      scheduled_at: "",
    });

    await loadFollowUps();
    alert("Seguimiento programado correctamente.");
  }

  async function completeFollowUp(followUpId: string) {
    const { error } = await supabase
      .from("follow_ups")
      .update({ status: "completado" })
      .eq("id", followUpId);

    if (error) {
      console.error(error);
      alert("No se pudo completar el seguimiento.");
      return;
    }

    await loadFollowUps();
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

          <div className="bg-neutral-900 rounded-3xl border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <MessageCircle className="text-green-400" />
              <h2 className="font-semibold text-xl">Asistente WhatsApp IA</h2>
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

      <section className="px-8 py-14 border-b border-white/10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          <div className="bg-neutral-900 p-6 rounded-3xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="text-green-400" />
              <h3 className="text-xl font-semibold">Conversión</h3>
            </div>

            <p className="text-5xl font-bold">+37%</p>

            <p className="text-white/60 mt-2">Más reservas desde WhatsApp</p>
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

            <p className="text-white/60 mt-2">Incremento mensual estimado</p>
          </div>
        </div>
      </section>

      <section className="px-8 py-12 border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="text-yellow-400" />
            <div>
              <h2 className="text-3xl font-bold">Seguimientos pendientes</h2>
              <p className="text-white/60">
                Pacientes a los que hay que volver a contactar.
              </p>
            </div>
          </div>

          {loadingFollowUps && (
            <p className="text-white/60">Cargando seguimientos...</p>
          )}

          {!loadingFollowUps && followUps.length === 0 && (
            <p className="text-white/60">
              No hay seguimientos pendientes todavía.
            </p>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            {followUps.map((followUp) => (
              <div
                key={followUp.id}
                className="bg-neutral-900 border border-white/10 rounded-3xl p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {followUp.leads?.name || "Paciente"}
                    </h3>
                    <p className="text-white/50 text-sm">
                      {followUp.leads?.treatment_interest ||
                        "Tratamiento no indicado"}
                    </p>
                  </div>

                  <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm">
                    Pendiente
                  </span>
                </div>

                <p className="text-white/70 text-sm leading-6 mb-4">
                  {followUp.message}
                </p>

                <div className="text-white/50 text-sm mb-5">
                  Programado: {formatDate(followUp.scheduled_at)}
                </div>

                <button
                  onClick={() => completeFollowUp(followUp.id)}
                  className="w-full bg-white text-black py-3 rounded-xl font-semibold hover:bg-neutral-200 transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Marcar como completado
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

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

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <input
              className="bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 outline-none"
              placeholder="Buscar por nombre, teléfono o tratamiento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className="bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              <option value="nuevo">Nuevo</option>
              <option value="seguimiento">Seguimiento</option>
              <option value="citado">Citado</option>
              <option value="perdido">Perdido</option>
            </select>

            <select
              className="bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 outline-none"
              value={interestFilter}
              onChange={(e) => setInterestFilter(e.target.value)}
            >
              <option value="todos">Todos los intereses</option>
              <option value="bajo">Interés bajo</option>
              <option value="medio">Interés medio</option>
              <option value="alto">Interés alto</option>
            </select>
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
            <p className="text-white/60">No hay leads todavía en Supabase.</p>
          )}

          {!loadingLeads &&
            !errorLeads &&
            leads.length > 0 &&
            filteredLeads.length === 0 && (
              <p className="text-white/60">
                No hay pacientes que coincidan con los filtros.
              </p>
            )}

          <div className="grid md:grid-cols-3 gap-6">
            {filteredLeads.map((lead) => (
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

                <button
                  onClick={() => openConversation(lead)}
                  className="mt-8 w-full bg-white text-black py-3 rounded-xl font-semibold hover:bg-neutral-200 transition"
                >
                  Ver conversación
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

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

      {selectedLead && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center p-6 z-50 overflow-y-auto">
          <button
            onClick={() => {
              setSelectedLead(null);
              setConversationMessages([]);
              setNewConversationMessage("");
            }}
            className="fixed top-6 right-6 bg-white text-black px-4 py-2 rounded-xl font-semibold z-[60] hover:bg-neutral-200 transition"
          >
            Cerrar
          </button>

          <div className="bg-neutral-900 border border-white/10 rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden mt-10 mb-10">
            <div className="p-6 border-b border-white/10 flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold">
                  {selectedLead.name || "Paciente sin nombre"}
                </h2>

                <p className="text-white/50 mt-1">
                  {selectedLead.treatment_interest || "Sin tratamiento"} ·{" "}
                  {selectedLead.phone}
                </p>

                <div className="flex gap-3 mt-4">
                  <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm">
                    {selectedLead.status || "nuevo"}
                  </span>

                  <span className="bg-white/10 text-white/70 px-3 py-1 rounded-full text-sm">
                    Interés: {selectedLead.interest_level || "medio"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedLead(null);
                  setConversationMessages([]);
                  setNewConversationMessage("");
                }}
                className="text-white/60 hover:text-white"
              >
                <X size={26} />
              </button>
            </div>

            <div className="grid md:grid-cols-[1.3fr_0.9fr]">
              <div className="p-6 border-r border-white/10">
                <h3 className="text-xl font-semibold mb-4">Conversación</h3>

                <div className="bg-black rounded-2xl border border-white/10 p-4 h-[360px] overflow-y-auto space-y-4">
                  {loadingConversation && (
                    <p className="text-white/50">Cargando conversación...</p>
                  )}

                  {!loadingConversation &&
                    conversationMessages.length === 0 && (
                      <p className="text-white/50">
                        Todavía no hay mensajes guardados para este paciente.
                      </p>
                    )}

                  {conversationMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`max-w-[85%] p-4 rounded-2xl ${
                        msg.role === "paciente"
                          ? "bg-white text-black ml-auto"
                          : msg.role === "ia"
                          ? "bg-green-500/20 text-green-100"
                          : "bg-blue-500/20 text-blue-100"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2 text-xs opacity-70">
                        {msg.role === "paciente" ? (
                          <User size={14} />
                        ) : msg.role === "ia" ? (
                          <Bot size={14} />
                        ) : (
                          <MessageCircle size={14} />
                        )}

                        <span>
                          {msg.role === "paciente"
                            ? "Paciente"
                            : msg.role === "ia"
                            ? "IA"
                            : "Clínica"}
                        </span>
                      </div>

                      <p>{msg.message}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-[140px_1fr_auto] gap-2">
                  <select
                    className="bg-black border border-white/10 rounded-xl px-3 py-3 outline-none"
                    value={newConversationRole}
                    onChange={(e) => setNewConversationRole(e.target.value)}
                  >
                    <option value="clinica">Clínica</option>
                    <option value="paciente">Paciente</option>
                    <option value="ia">IA</option>
                  </select>

                  <input
                    className="bg-black border border-white/10 rounded-xl px-4 py-3 outline-none"
                    placeholder="Añadir mensaje..."
                    value={newConversationMessage}
                    onChange={(e) =>
                      setNewConversationMessage(e.target.value)
                    }
                  />

                  <button
                    onClick={addConversationMessage}
                    className="bg-green-500 text-black px-5 rounded-xl font-semibold hover:bg-green-400 transition"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4">
                  Editar ficha del paciente
                </h3>

                <div className="space-y-4">
                  <input
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none"
                    placeholder="Nombre"
                    value={editableLead.name}
                    onChange={(e) =>
                      setEditableLead({
                        ...editableLead,
                        name: e.target.value,
                      })
                    }
                  />

                  <input
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none"
                    placeholder="Teléfono"
                    value={editableLead.phone}
                    onChange={(e) =>
                      setEditableLead({
                        ...editableLead,
                        phone: e.target.value,
                      })
                    }
                  />

                  <input
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none"
                    placeholder="Tratamiento de interés"
                    value={editableLead.treatment_interest}
                    onChange={(e) =>
                      setEditableLead({
                        ...editableLead,
                        treatment_interest: e.target.value,
                      })
                    }
                  />

                  <select
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none"
                    value={editableLead.status}
                    onChange={(e) =>
                      setEditableLead({
                        ...editableLead,
                        status: e.target.value,
                      })
                    }
                  >
                    <option value="nuevo">Nuevo</option>
                    <option value="seguimiento">Seguimiento</option>
                    <option value="citado">Citado</option>
                    <option value="perdido">Perdido</option>
                  </select>

                  <select
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none"
                    value={editableLead.interest_level}
                    onChange={(e) =>
                      setEditableLead({
                        ...editableLead,
                        interest_level: e.target.value,
                      })
                    }
                  >
                    <option value="bajo">Interés bajo</option>
                    <option value="medio">Interés medio</option>
                    <option value="alto">Interés alto</option>
                  </select>

                  <textarea
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none min-h-[120px]"
                    placeholder="Notas"
                    value={editableLead.notes}
                    onChange={(e) =>
                      setEditableLead({
                        ...editableLead,
                        notes: e.target.value,
                      })
                    }
                  />

                  <button
                    onClick={updateLead}
                    disabled={savingLead}
                    className="w-full bg-green-500 text-black py-3 rounded-xl font-semibold hover:bg-green-400 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    {savingLead ? "Guardando..." : "Guardar cambios"}
                  </button>

                  <button
                    onClick={openFollowUpForm}
                    className="w-full bg-white text-black py-3 rounded-xl font-semibold hover:bg-neutral-200 transition"
                  >
                    Programar seguimiento
                  </button>

                  <button className="w-full border border-white/10 py-3 rounded-xl font-semibold hover:bg-white/10 transition">
                    Crear cita
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFollowUpForm && selectedLead && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-[80]">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl p-8 max-w-xl w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold">Programar seguimiento</h2>
                <p className="text-white/50 mt-1">
                  Paciente: {selectedLead.name || "Paciente sin nombre"}
                </p>
              </div>

              <button
                onClick={() => setShowFollowUpForm(false)}
                className="text-white/60 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <textarea
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none min-h-[140px]"
                placeholder="Mensaje de seguimiento"
                value={newFollowUp.message}
                onChange={(e) =>
                  setNewFollowUp({
                    ...newFollowUp,
                    message: e.target.value,
                  })
                }
              />

              <input
                type="datetime-local"
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none"
                value={newFollowUp.scheduled_at}
                onChange={(e) =>
                  setNewFollowUp({
                    ...newFollowUp,
                    scheduled_at: e.target.value,
                  })
                }
              />

              <button
                onClick={createFollowUp}
                disabled={savingFollowUp}
                className="w-full bg-green-500 text-black font-semibold py-3 rounded-xl hover:bg-green-400 transition disabled:opacity-50"
              >
                {savingFollowUp ? "Guardando..." : "Guardar seguimiento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}