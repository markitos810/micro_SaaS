import { NextResponse } from "next/server";

type ConversationMessage = {
  role: string | null;
  message: string | null;
};

function getFirstName(name: string) {
  const cleanName = name.trim();

  if (!cleanName) return "";

  return cleanName.split(" ")[0];
}

function cleanText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;

  return value.trim() || fallback;
}

function getTreatmentPhrase(treatment: string) {
  if (!treatment) return "el tratamiento que nos consultaste";

  return treatment;
}

function getTonePhrase(tone: string) {
  const lowerTone = tone.toLowerCase();

  if (lowerTone.includes("cercano")) {
    return "con un trato cercano y personalizado";
  }

  if (lowerTone.includes("elegante")) {
    return "con un trato cuidado, profesional y elegante";
  }

  if (lowerTone.includes("profesional")) {
    return "con un trato profesional y claro";
  }

  return "con un trato personalizado";
}

function hasConversationFromLead(conversations: ConversationMessage[]) {
  return conversations.some((item) => item.role === "lead" && item.message);
}

function getLastLeadMessage(conversations: ConversationMessage[]) {
  const leadMessages = conversations.filter(
    (item) => item.role === "lead" && item.message
  );

  const lastMessage = leadMessages[leadMessages.length - 1];

  return lastMessage?.message?.trim() || "";
}

function buildMessage(params: {
  clinicName: string;
  clinicTone: string;
  leadName: string;
  treatmentInterest: string;
  leadStatus: string;
  interestLevel: string;
  notes: string;
  objective: string;
  conversations: ConversationMessage[];
}) {
  const firstName = getFirstName(params.leadName);
  const greetingName = firstName || "qué tal";
  const clinicName = params.clinicName || "la clínica";
  const treatment = getTreatmentPhrase(params.treatmentInterest);
  const tonePhrase = getTonePhrase(params.clinicTone);
  const status = params.leadStatus.toLowerCase();
  const interest = params.interestLevel.toLowerCase();
  const notes = params.notes.toLowerCase();
  const hasLeadConversation = hasConversationFromLead(params.conversations);
  const lastLeadMessage = getLastLeadMessage(params.conversations);

  if (status === "cita_agendada" || params.objective.includes("confirmar")) {
    return `Hola ${greetingName}, te escribo de ${clinicName} para confirmarte tu cita sobre ${treatment}. Te atenderemos ${tonePhrase}. Si necesitas cambiar la hora o tienes cualquier duda antes de venir, puedes responderme por aquí.`;
  }

  if (status === "interesado" || interest === "alto") {
    if (notes.includes("esta semana") || notes.includes("urgente")) {
      return `Hola ${greetingName}, soy de ${clinicName}. He visto que estás interesado/a en ${treatment} y que te gustaría verlo pronto. Si quieres, puedo ayudarte a encontrar disponibilidad esta semana para una valoración y resolverte cualquier duda antes de reservar.`;
    }

    return `Hola ${greetingName}, soy de ${clinicName}. Te escribo porque habías mostrado interés en ${treatment}. Podemos orientarte ${tonePhrase} y ver disponibilidad para una valoración. ¿Te gustaría que te proponga alguna hora?`;
  }

  if (status === "contactado" || hasLeadConversation) {
    if (lastLeadMessage) {
      return `Hola ${greetingName}, soy de ${clinicName}. Te escribo para retomar lo que comentamos sobre ${treatment}. Si sigues interesado/a, puedo ayudarte a resolver dudas y ver una opción de cita que encaje contigo.`;
    }

    return `Hola ${greetingName}, soy de ${clinicName}. Te escribo para hacer seguimiento sobre ${treatment}. Si todavía te interesa, puedo ayudarte a resolver dudas y ver disponibilidad para una valoración.`;
  }

  if (status === "no_interesado" || interest === "bajo") {
    return `Hola ${greetingName}, soy de ${clinicName}. Te escribo solo para dejarte la puerta abierta por si más adelante quieres retomar la información sobre ${treatment}. Estaremos encantados de orientarte ${tonePhrase}, sin ningún compromiso.`;
  }

  if (params.objective.includes("recuperar")) {
    return `Hola ${greetingName}, soy de ${clinicName}. Hace unos días hablamos sobre ${treatment} y quería saber si todavía te interesa recibir información o ver disponibilidad para una valoración. Puedo ayudarte por aquí cuando quieras.`;
  }

  return `Hola ${greetingName}, soy de ${clinicName}. Te escribo porque nos habías consultado por ${treatment}. Podemos orientarte ${tonePhrase} y resolver tus dudas antes de reservar una valoración. ¿Te gustaría que te ayudara a ver disponibilidad?`;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "Ruta activa. Esta versión usa generación demo sin API de pago.",
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const clinicName = cleanText(body.clinicName, "la clínica");
    const clinicTone = cleanText(
      body.clinicTone,
      "profesional, cercano y elegante"
    );
    const leadName = cleanText(body.leadName, "el paciente");
    const treatmentInterest = cleanText(
      body.treatmentInterest,
      "el tratamiento que nos consultaste"
    );
    const leadStatus = cleanText(body.leadStatus, "nuevo");
    const interestLevel = cleanText(body.interestLevel, "medio");
    const notes = cleanText(body.notes, "");
    const objective = cleanText(
      body.objective,
      "conseguir una respuesta del paciente"
    );

    const conversations: ConversationMessage[] = Array.isArray(
      body.conversations
    )
      ? body.conversations
      : [];

    const message = buildMessage({
      clinicName,
      clinicTone,
      leadName,
      treatmentInterest,
      leadStatus,
      interestLevel,
      notes,
      objective,
      conversations,
    });

    return NextResponse.json({
      message,
      mode: "demo",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error desconocido generando el mensaje demo.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}