"use client";

import { useState } from "react";
import {
  MessageCircle,
  CalendarCheck,
  TrendingUp,
  Euro,
  Sparkles,
  ArrowRight,
  Phone,
  Clock,
} from "lucide-react";

export default function ClinicFlowDemo() {
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

  const leads = [
    {
      name: "Marta G.",
      treatment: "Labios",
      status: "Citada",
      value: "220€",
    },
    {
      name: "Laura P.",
      treatment: "Botox",
      status: "Pendiente",
      value: "350€",
    },
    {
      name: "Andrea R.",
      treatment: "Rinomodelación",
      status: "Seguimiento",
      value: "420€",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
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
                Gestiona automáticamente nuevos leads y seguimientos.
              </p>
            </div>

            <button className="flex items-center gap-2 bg-white text-black px-5 py-3 rounded-xl font-semibold">
              Nuevo Lead
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {leads.map((lead, i) => (
              <div
                key={i}
                className="bg-neutral-900 border border-white/10 rounded-3xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-semibold">{lead.name}</h3>
                    <p className="text-white/50">{lead.treatment}</p>
                  </div>

                  <div className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm">
                    {lead.status}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-white/70">
                    <Phone size={18} />
                    WhatsApp automatizado
                  </div>

                  <div className="flex items-center gap-3 text-white/70">
                    <CalendarCheck size={18} />
                    Seguimiento IA activo
                  </div>

                  <div className="flex items-center gap-3 text-white/70">
                    <Euro size={18} />
                    Valor potencial: {lead.value}
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
    </div>
  );
}