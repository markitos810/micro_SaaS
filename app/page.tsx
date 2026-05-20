"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Clinic = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  opening_hours: string | null;
  tone: string | null;
  created_at: string;
};

type Lead = {
  id: string;
  clinic_id: string;
  name: string | null;
  phone: string | null;
  treatment_interest: string | null;
  status: string | null;
  interest_level: string | null;
  notes: string | null;
  created_at: string;
};

type Conversation = {
  id: string;
  lead_id: string;
  role: string | null;
  message: string | null;
  created_at: string;
};

type FollowUp = {
  id: string;
  lead_id: string;
  message: string | null;
  scheduled_at: string | null;
  status: string | null;
  created_at: string;
};

type Appointment = {
  id: string;
  clinic_id: string;
  lead_id: string | null;
  treatment: string | null;
  appointment_at: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
};

type LeadForm = {
  name: string;
  phone: string;
  treatment_interest: string;
  status: string;
  interest_level: string;
  notes: string;
};

type FollowUpForm = {
  message: string;
  scheduled_at: string;
};

type AppointmentForm = {
  treatment: string;
  appointment_at: string;
  notes: string;
  status: string;
};

type WhatsAppTemplate =
  | "first_contact"
  | "appointment_confirmation"
  | "follow_up"
  | "reactivation";

const emptyLeadForm: LeadForm = {
  name: "",
  phone: "",
  treatment_interest: "",
  status: "nuevo",
  interest_level: "medio",
  notes: "",
};

const emptyFollowUpForm: FollowUpForm = {
  message: "",
  scheduled_at: "",
};

const emptyAppointmentForm: AppointmentForm = {
  treatment: "",
  appointment_at: "",
  notes: "",
  status: "scheduled",
};

function getLocalDateTimeValue(hoursToAdd = 1) {
  const date = new Date();
  date.setHours(date.getHours() + hoursToAdd);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusLabel(status: string | null | undefined) {
  if (!status) return "Sin estado";

  const labels: Record<string, string> = {
    nuevo: "Nuevo",
    contactado: "Contactado",
    interesado: "Interesado",
    cita_agendada: "Cita agendada",
    no_interesado: "No interesado",
    pending: "Pendiente",
    completed: "Completado",
    scheduled: "Programada",
    cancelled: "Cancelada",
  };

  return labels[status] ?? status;
}

function getInterestLabel(level: string | null | undefined) {
  if (!level) return "Sin nivel";

  const labels: Record<string, string> = {
    bajo: "Bajo",
    medio: "Medio",
    alto: "Alto",
  };

  return labels[level] ?? level;
}

function sortAppointments(list: Appointment[]) {
  return [...list].sort(
    (a, b) =>
      new Date(a.appointment_at ?? "").getTime() -
      new Date(b.appointment_at ?? "").getTime()
  );
}

function cleanPhoneForWhatsApp(phone: string | null | undefined) {
  const cleaned = (phone ?? "").replace(/\D/g, "");

  if (!cleaned) return "";

  if (cleaned.startsWith("00")) {
    return cleaned.slice(2);
  }

  if (cleaned.startsWith("34")) {
    return cleaned;
  }

  if (cleaned.length === 9) {
    return `34${cleaned}`;
  }

  return cleaned;
}

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function isPastDate(value: string | null | undefined) {
  if (!value) return false;

  return new Date(value).getTime() < new Date().getTime();
}

function isActiveAppointment(appointment: Appointment) {
  return (
    appointment.status !== "completed" && appointment.status !== "cancelled"
  );
}

export default function HomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [userEmail, setUserEmail] = useState("");
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationMessage, setConversationMessage] = useState("");
  const [conversationRole, setConversationRole] = useState("clinic");

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpForm, setFollowUpForm] =
    useState<FollowUpForm>(emptyFollowUpForm);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);
  const [appointmentForm, setAppointmentForm] =
    useState<AppointmentForm>(emptyAppointmentForm);

  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadForm, setLeadForm] = useState<LeadForm>(emptyLeadForm);

  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppLead, setWhatsAppLead] = useState<Lead | null>(null);
  const [whatsAppMessage, setWhatsAppMessage] = useState("");
  const [generatingAIMessage, setGeneratingAIMessage] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [interestFilter, setInterestFilter] = useState("todos");

  useEffect(() => {
    async function init() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (!session) {
        router.replace("/login");
        return;
      }

      setUserEmail(session.user.email ?? "");

      const { data: clinicUser, error: clinicUserError } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle();

      if (clinicUserError) {
        setErrorMessage(clinicUserError.message);
        setLoading(false);
        return;
      }

      if (!clinicUser?.clinic_id) {
        setErrorMessage(
          "Tu usuario no está asociado a ninguna clínica en la tabla clinic_users."
        );
        setLoading(false);
        return;
      }

      setClinicId(clinicUser.clinic_id);

      await loadInitialData(clinicUser.clinic_id);

      setLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  async function loadInitialData(currentClinicId: string) {
    await loadClinic(currentClinicId);
    const loadedLeads = await loadLeads(currentClinicId);
    await loadFollowUps(loadedLeads.map((lead) => lead.id));
    await loadAppointments(currentClinicId);
  }

  async function loadClinic(currentClinicId: string) {
    const { data, error } = await supabase
      .from("clinics")
      .select("*")
      .eq("id", currentClinicId)
      .maybeSingle();

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setClinic(data);
  }

  async function loadLeads(currentClinicId: string) {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("clinic_id", currentClinicId)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      return [];
    }

    const loadedLeads = data ?? [];

    setLeads(loadedLeads);

    setSelectedLead((previousLead) => {
      if (!previousLead) return loadedLeads[0] ?? null;

      const updatedLead = loadedLeads.find(
        (lead) => lead.id === previousLead.id
      );

      return updatedLead ?? loadedLeads[0] ?? null;
    });

    return loadedLeads;
  }

  async function loadConversations(leadId: string) {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setConversations(data ?? []);
  }

  async function loadFollowUps(leadIds?: string[]) {
    const ids = leadIds ?? leads.map((lead) => lead.id);

    if (ids.length === 0) {
      setFollowUps([]);
      return;
    }

    const { data, error } = await supabase
      .from("follow_ups")
      .select("*")
      .in("lead_id", ids)
      .order("scheduled_at", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setFollowUps(data ?? []);
  }

  async function loadAppointments(currentClinicId?: string) {
    const idToUse = currentClinicId ?? clinicId;

    if (!idToUse) return;

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("clinic_id", idToUse)
      .order("appointment_at", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAppointments(data ?? []);
  }

  useEffect(() => {
    if (selectedLead?.id) {
      loadConversations(selectedLead.id);
    } else {
      setConversations([]);
    }
  }, [selectedLead?.id]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const text = searchText.toLowerCase().trim();

      const matchesSearch =
        !text ||
        lead.name?.toLowerCase().includes(text) ||
        lead.phone?.toLowerCase().includes(text) ||
        lead.treatment_interest?.toLowerCase().includes(text);

      const matchesStatus =
        statusFilter === "todos" || lead.status === statusFilter;

      const matchesInterest =
        interestFilter === "todos" || lead.interest_level === interestFilter;

      return matchesSearch && matchesStatus && matchesInterest;
    });
  }, [leads, searchText, statusFilter, interestFilter]);

  const pendingFollowUps = useMemo(() => {
    return followUps.filter((followUp) => followUp.status !== "completed");
  }, [followUps]);

  const selectedLeadFollowUps = useMemo(() => {
    if (!selectedLead) return [];

    return followUps.filter((followUp) => followUp.lead_id === selectedLead.id);
  }, [followUps, selectedLead]);

  const selectedLeadAppointments = useMemo(() => {
    if (!selectedLead) return [];

    return appointments.filter(
      (appointment) => appointment.lead_id === selectedLead.id
    );
  }, [appointments, selectedLead]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();

    return appointments.filter((appointment) => {
      if (!isActiveAppointment(appointment)) return false;
      if (!appointment.appointment_at) return true;

      return new Date(appointment.appointment_at) >= now;
    });
  }, [appointments]);

  const todayAppointments = useMemo(() => {
    const today = new Date();

    return appointments.filter((appointment) => {
      if (!appointment.appointment_at) return false;
      if (!isActiveAppointment(appointment)) return false;

      return isSameDay(new Date(appointment.appointment_at), today);
    });
  }, [appointments]);

  const overdueFollowUps = useMemo(() => {
    return followUps.filter((followUp) => {
      if (followUp.status === "completed") return false;

      return isPastDate(followUp.scheduled_at);
    });
  }, [followUps]);

  const hotLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (lead.interest_level !== "alto") return false;

      const hasActiveFutureAppointment = appointments.some((appointment) => {
        if (appointment.lead_id !== lead.id) return false;
        if (!isActiveAppointment(appointment)) return false;
        if (!appointment.appointment_at) return true;

        return new Date(appointment.appointment_at) >= new Date();
      });

      return !hasActiveFutureAppointment;
    });
  }, [leads, appointments]);

  const recoveryLeads = useMemo(() => {
    return leads.filter((lead) => {
      return lead.status === "contactado" || lead.status === "no_interesado";
    });
  }, [leads]);

  function getLeadById(leadId: string | null | undefined) {
    if (!leadId) return null;

    return leads.find((lead) => lead.id === leadId) ?? null;
  }

  function getLeadName(leadId: string | null | undefined) {
    if (!leadId) return "Paciente no asignado";

    return leads.find((lead) => lead.id === leadId)?.name ?? "Paciente";
  }

  function getLeadPhone(leadId: string | null | undefined) {
    if (!leadId) return "";

    return leads.find((lead) => lead.id === leadId)?.phone ?? "";
  }

  function buildWhatsAppMessage(
    lead: Lead,
    template: WhatsAppTemplate,
    appointment?: Appointment
  ) {
    const firstName = lead.name?.split(" ")[0] || "hola";
    const treatment =
      lead.treatment_interest || appointment?.treatment || "el tratamiento";
    const clinicName = clinic?.name || "nuestra clínica";

    if (template === "first_contact") {
      return `Hola ${firstName}, soy de ${clinicName}. Te escribo porque nos habías consultado por ${treatment}. ¿Te gustaría que te ayudáramos a resolver dudas o ver disponibilidad para una valoración?`;
    }

    if (template === "appointment_confirmation") {
      const appointmentDate = appointment?.appointment_at
        ? formatDateTime(appointment.appointment_at)
        : "la fecha acordada";

      return `Hola ${firstName}, te confirmamos tu cita en ${clinicName} para ${treatment} el ${appointmentDate}. Si necesitas cambiarla o tienes cualquier duda, puedes responder a este mensaje.`;
    }

    if (template === "follow_up") {
      return `Hola ${firstName}, soy de ${clinicName}. Te escribo para hacer seguimiento sobre ${treatment}. ¿Sigues interesado/a en que te demos disponibilidad o resolvamos alguna duda?`;
    }

    return `Hola ${firstName}, soy de ${clinicName}. Hace unos días hablamos sobre ${treatment} y quería saber si todavía te interesa que te ayudemos a reservar una valoración.`;
  }

  function openWhatsAppModal(
    lead: Lead,
    template: WhatsAppTemplate = "first_contact",
    appointment?: Appointment
  ) {
    setSelectedLead(lead);
    setWhatsAppLead(lead);
    setWhatsAppMessage(buildWhatsAppMessage(lead, template, appointment));
    setShowWhatsAppModal(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function changeWhatsAppTemplate(template: WhatsAppTemplate) {
    if (!whatsAppLead) return;

    setWhatsAppMessage(buildWhatsAppMessage(whatsAppLead, template));
  }

  async function handleCopyWhatsAppMessage() {
    if (!whatsAppMessage.trim()) {
      setErrorMessage("No hay mensaje para copiar.");
      return;
    }

    await navigator.clipboard.writeText(whatsAppMessage);
    setSuccessMessage("Mensaje copiado al portapapeles.");
  }

  function handleOpenWhatsApp() {
    if (!whatsAppLead) return;

    const phone = cleanPhoneForWhatsApp(whatsAppLead.phone);

    if (!phone) {
      setErrorMessage("Este paciente no tiene teléfono válido.");
      return;
    }

    if (!whatsAppMessage.trim()) {
      setErrorMessage("Escribe un mensaje antes de abrir WhatsApp.");
      return;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(
      whatsAppMessage.trim()
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleGenerateWhatsAppWithAI() {
    if (!whatsAppLead) return;

    setGeneratingAIMessage(true);
    setErrorMessage("");
    setSuccessMessage("");

    const recentConversations = conversations.slice(-8);

    const objective =
      whatsAppLead.status === "cita_agendada"
        ? "confirmar la cita y transmitir confianza"
        : whatsAppLead.status === "interesado"
        ? "cerrar una cita o valoración"
        : whatsAppLead.status === "contactado"
        ? "hacer seguimiento y recuperar la conversación"
        : "iniciar contacto y conseguir respuesta del paciente";

    try {
      const response = await fetch("/api/generate-whatsapp-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clinicName: clinic?.name,
          clinicTone: clinic?.tone,
          leadName: whatsAppLead.name,
          leadPhone: whatsAppLead.phone,
          treatmentInterest: whatsAppLead.treatment_interest,
          leadStatus: whatsAppLead.status,
          interestLevel: whatsAppLead.interest_level,
          notes: whatsAppLead.notes,
          currentDraft: whatsAppMessage,
          objective,
          conversations: recentConversations,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Error generando mensaje con IA.");
        return;
      }

      setWhatsAppMessage(data.message);
      setSuccessMessage("Mensaje generado con IA correctamente.");
    } catch (error) {
      console.error(error);
      setErrorMessage("Error conectando con la IA.");
    } finally {
      setGeneratingAIMessage(false);
    }
  }

  async function handleSaveWhatsAppInConversation() {
    if (!whatsAppLead) return;

    if (!whatsAppMessage.trim()) {
      setErrorMessage("No hay mensaje para guardar.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        lead_id: whatsAppLead.id,
        role: "clinic",
        message: whatsAppMessage.trim(),
      })
      .select("*")
      .single();

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (selectedLead?.id === whatsAppLead.id) {
      setConversations((previousMessages) => [...previousMessages, data]);
    }

    setSuccessMessage("Mensaje guardado en la conversación.");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function openCreateLeadModal() {
    setEditingLead(null);
    setLeadForm(emptyLeadForm);
    setShowLeadModal(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openEditLeadModal(lead: Lead) {
    setEditingLead(lead);
    setLeadForm({
      name: lead.name ?? "",
      phone: lead.phone ?? "",
      treatment_interest: lead.treatment_interest ?? "",
      status: lead.status ?? "nuevo",
      interest_level: lead.interest_level ?? "medio",
      notes: lead.notes ?? "",
    });
    setShowLeadModal(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSaveLead() {
    if (!clinicId) return;

    if (!leadForm.name.trim()) {
      setErrorMessage("El nombre del paciente es obligatorio.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (editingLead) {
      const { data, error } = await supabase
        .from("leads")
        .update({
          name: leadForm.name.trim(),
          phone: leadForm.phone.trim(),
          treatment_interest: leadForm.treatment_interest.trim(),
          status: leadForm.status,
          interest_level: leadForm.interest_level,
          notes: leadForm.notes.trim(),
        })
        .eq("id", editingLead.id)
        .select("*")
        .single();

      setSaving(false);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setLeads((previousLeads) =>
        previousLeads.map((lead) => (lead.id === data.id ? data : lead))
      );

      setSelectedLead(data);
      setShowLeadModal(false);
      setSuccessMessage("Paciente actualizado correctamente.");
      return;
    }

    const { data, error } = await supabase
      .from("leads")
      .insert({
        clinic_id: clinicId,
        name: leadForm.name.trim(),
        phone: leadForm.phone.trim(),
        treatment_interest: leadForm.treatment_interest.trim(),
        status: leadForm.status,
        interest_level: leadForm.interest_level,
        notes: leadForm.notes.trim(),
      })
      .select("*")
      .single();

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setLeads((previousLeads) => [data, ...previousLeads]);
    setSelectedLead(data);
    setShowLeadModal(false);
    setSuccessMessage("Paciente creado correctamente.");
  }

  async function handleAddConversationMessage() {
    if (!selectedLead) return;

    if (!conversationMessage.trim()) {
      setErrorMessage("Escribe un mensaje antes de guardarlo.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        lead_id: selectedLead.id,
        role: conversationRole,
        message: conversationMessage.trim(),
      })
      .select("*")
      .single();

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setConversations((previousMessages) => [...previousMessages, data]);
    setConversationMessage("");
    setSuccessMessage("Mensaje añadido a la conversación.");
  }

  function openFollowUpModal(lead: Lead) {
    setSelectedLead(lead);
    setFollowUpForm({
      message: "",
      scheduled_at: getLocalDateTimeValue(24),
    });
    setShowFollowUpModal(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleCreateFollowUp() {
    if (!selectedLead) return;

    if (!followUpForm.message.trim()) {
      setErrorMessage("Escribe el mensaje del seguimiento.");
      return;
    }

    if (!followUpForm.scheduled_at) {
      setErrorMessage("Selecciona una fecha para el seguimiento.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } = await supabase
      .from("follow_ups")
      .insert({
        lead_id: selectedLead.id,
        message: followUpForm.message.trim(),
        scheduled_at: new Date(followUpForm.scheduled_at).toISOString(),
        status: "pending",
      })
      .select("*")
      .single();

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setFollowUps((previousFollowUps) =>
      [...previousFollowUps, data].sort(
        (a, b) =>
          new Date(a.scheduled_at ?? "").getTime() -
          new Date(b.scheduled_at ?? "").getTime()
      )
    );

    setShowFollowUpModal(false);
    setSuccessMessage("Seguimiento programado correctamente.");
  }

  async function handleCompleteFollowUp(followUpId: string) {
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } = await supabase
      .from("follow_ups")
      .update({
        status: "completed",
      })
      .eq("id", followUpId)
      .select("*")
      .single();

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setFollowUps((previousFollowUps) =>
      previousFollowUps.map((followUp) =>
        followUp.id === followUpId ? data : followUp
      )
    );

    setSuccessMessage("Seguimiento marcado como completado.");
  }

  function openCreateAppointmentModal(lead: Lead) {
    setSelectedLead(lead);
    setEditingAppointment(null);
    setAppointmentForm({
      treatment: lead.treatment_interest ?? "",
      appointment_at: getLocalDateTimeValue(2),
      notes: "",
      status: "scheduled",
    });
    setShowAppointmentModal(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openEditAppointmentModal(appointment: Appointment) {
    const appointmentLead = leads.find(
      (lead) => lead.id === appointment.lead_id
    );

    if (appointmentLead) {
      setSelectedLead(appointmentLead);
    }

    setEditingAppointment(appointment);
    setAppointmentForm({
      treatment: appointment.treatment ?? "",
      appointment_at: toDateTimeLocal(appointment.appointment_at),
      notes: appointment.notes ?? "",
      status: appointment.status ?? "scheduled",
    });
    setShowAppointmentModal(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSaveAppointment() {
    if (!clinicId) return;
    if (!selectedLead) return;

    if (!appointmentForm.treatment.trim()) {
      setErrorMessage("Escribe el tratamiento de la cita.");
      return;
    }

    if (!appointmentForm.appointment_at) {
      setErrorMessage("Selecciona fecha y hora para la cita.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (editingAppointment) {
      const { data, error } = await supabase
        .from("appointments")
        .update({
          treatment: appointmentForm.treatment.trim(),
          appointment_at: new Date(appointmentForm.appointment_at).toISOString(),
          status: appointmentForm.status,
          notes: appointmentForm.notes.trim(),
        })
        .eq("id", editingAppointment.id)
        .select("*")
        .single();

      setSaving(false);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setAppointments((previousAppointments) =>
        sortAppointments(
          previousAppointments.map((appointment) =>
            appointment.id === editingAppointment.id ? data : appointment
          )
        )
      );

      setShowAppointmentModal(false);
      setEditingAppointment(null);
      setSuccessMessage("Cita actualizada correctamente.");
      return;
    }

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        clinic_id: clinicId,
        lead_id: selectedLead.id,
        treatment: appointmentForm.treatment.trim(),
        appointment_at: new Date(appointmentForm.appointment_at).toISOString(),
        status: "scheduled",
        notes: appointmentForm.notes.trim(),
      })
      .select("*")
      .single();

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAppointments((previousAppointments) =>
      sortAppointments([...previousAppointments, data])
    );

    setShowAppointmentModal(false);
    setSuccessMessage("Cita creada correctamente.");
  }

  async function handleCompleteAppointment(appointmentId: string) {
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } = await supabase
      .from("appointments")
      .update({
        status: "completed",
      })
      .eq("id", appointmentId)
      .select("*")
      .single();

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAppointments((previousAppointments) =>
      previousAppointments.map((appointment) =>
        appointment.id === appointmentId ? data : appointment
      )
    );

    setSuccessMessage("Cita marcada como completada.");
  }

  async function handleCancelAppointment(appointmentId: string) {
    const confirmCancel = window.confirm(
      "¿Seguro que quieres cancelar esta cita?"
    );

    if (!confirmCancel) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } = await supabase
      .from("appointments")
      .update({
        status: "cancelled",
      })
      .eq("id", appointmentId)
      .select("*")
      .single();

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAppointments((previousAppointments) =>
      previousAppointments.map((appointment) =>
        appointment.id === appointmentId ? data : appointment
      )
    );

    setSuccessMessage("Cita cancelada correctamente.");
  }

  async function handleDeleteAppointment(appointmentId: string) {
    const confirmDelete = window.confirm(
      "¿Seguro que quieres borrar esta cita? Esta acción no se puede deshacer."
    );

    if (!confirmDelete) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", appointmentId);

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAppointments((previousAppointments) =>
      previousAppointments.filter(
        (appointment) => appointment.id !== appointmentId
      )
    );

    setSuccessMessage("Cita borrada correctamente.");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p className="text-slate-300">Cargando ClinicFlow AI...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-300">ClinicFlow AI</p>
            <h1 className="text-2xl font-bold md:text-3xl">
              {clinic?.name ?? "Panel de clínica"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Sesión iniciada como {userEmail}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200"
          >
            Cerrar sesión
          </button>
        </header>

        {errorMessage && (
          <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {successMessage}
          </div>
        )}

        <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-300">
                Centro de control
              </p>
              <h2 className="text-2xl font-bold">Prioridades de hoy</h2>
              <p className="mt-1 text-sm text-slate-400">
                Aquí ves qué pacientes requieren atención, qué citas tienes hoy
                y qué leads puedes convertir.
              </p>
            </div>

            <button
              onClick={openCreateLeadModal}
              className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
            >
              Añadir nuevo lead
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold">Citas de hoy</h3>
                <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-300">
                  {todayAppointments.length}
                </span>
              </div>

              <div className="space-y-3">
                {todayAppointments.length === 0 && (
                  <p className="rounded-2xl bg-white/5 p-3 text-sm text-slate-400">
                    No tienes citas activas para hoy.
                  </p>
                )}

                {todayAppointments.slice(0, 3).map((appointment) => {
                  const lead = getLeadById(appointment.lead_id);

                  return (
                    <div
                      key={appointment.id}
                      className="rounded-2xl bg-white/5 p-3"
                    >
                      <p className="text-sm font-semibold">
                        {getLeadName(appointment.lead_id)}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {appointment.treatment || "Sin tratamiento"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(appointment.appointment_at)}
                      </p>

                      {lead && (
                        <button
                          onClick={() =>
                            openWhatsAppModal(
                              lead,
                              "appointment_confirmation",
                              appointment
                            )
                          }
                          className="mt-3 rounded-xl bg-green-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-green-300"
                        >
                          Confirmar por WhatsApp
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold">Seguimientos vencidos</h3>
                <span className="rounded-full bg-red-400/20 px-3 py-1 text-xs font-bold text-red-300">
                  {overdueFollowUps.length}
                </span>
              </div>

              <div className="space-y-3">
                {overdueFollowUps.length === 0 && (
                  <p className="rounded-2xl bg-white/5 p-3 text-sm text-slate-400">
                    No tienes seguimientos atrasados.
                  </p>
                )}

                {overdueFollowUps.slice(0, 3).map((followUp) => {
                  const lead = getLeadById(followUp.lead_id);

                  return (
                    <div
                      key={followUp.id}
                      className="rounded-2xl bg-white/5 p-3"
                    >
                      <p className="text-sm font-semibold">
                        {getLeadName(followUp.lead_id)}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {followUp.message}
                      </p>

                      <p className="mt-1 text-xs text-red-300">
                        Vencido: {formatDateTime(followUp.scheduled_at)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {lead && (
                          <button
                            onClick={() => openWhatsAppModal(lead, "follow_up")}
                            className="rounded-xl bg-green-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-green-300"
                          >
                            WhatsApp
                          </button>
                        )}

                        <button
                          onClick={() => handleCompleteFollowUp(followUp.id)}
                          disabled={saving}
                          className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
                        >
                          Completar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold">Leads calientes</h3>
                <span className="rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-bold text-yellow-300">
                  {hotLeads.length}
                </span>
              </div>

              <div className="space-y-3">
                {hotLeads.length === 0 && (
                  <p className="rounded-2xl bg-white/5 p-3 text-sm text-slate-400">
                    No hay leads calientes pendientes de cerrar.
                  </p>
                )}

                {hotLeads.slice(0, 3).map((lead) => (
                  <div key={lead.id} className="rounded-2xl bg-white/5 p-3">
                    <p className="text-sm font-semibold">
                      {lead.name || "Paciente"}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {lead.treatment_interest || "Sin tratamiento"}
                    </p>

                    <p className="mt-1 text-xs text-yellow-300">
                      Interés alto
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => openWhatsAppModal(lead)}
                        className="rounded-xl bg-green-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-green-300"
                      >
                        WhatsApp
                      </button>

                      <button
                        onClick={() => openCreateAppointmentModal(lead)}
                        className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300"
                      >
                        Crear cita
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold">A recuperar</h3>
                <span className="rounded-full bg-violet-400/20 px-3 py-1 text-xs font-bold text-violet-300">
                  {recoveryLeads.length}
                </span>
              </div>

              <div className="space-y-3">
                {recoveryLeads.length === 0 && (
                  <p className="rounded-2xl bg-white/5 p-3 text-sm text-slate-400">
                    No hay pacientes marcados para recuperar.
                  </p>
                )}

                {recoveryLeads.slice(0, 3).map((lead) => (
                  <div key={lead.id} className="rounded-2xl bg-white/5 p-3">
                    <p className="text-sm font-semibold">
                      {lead.name || "Paciente"}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {lead.treatment_interest || "Sin tratamiento"}
                    </p>

                    <p className="mt-1 text-xs text-violet-300">
                      Estado: {getStatusLabel(lead.status)}
                    </p>

                    <button
                      onClick={() => openWhatsAppModal(lead, "reactivation")}
                      className="mt-3 rounded-xl bg-green-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-green-300"
                    >
                      Reactivar por WhatsApp
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-400">Pacientes</p>
            <p className="mt-2 text-3xl font-bold">{leads.length}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-400">Seguimientos pendientes</p>
            <p className="mt-2 text-3xl font-bold">{pendingFollowUps.length}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-400">Próximas citas</p>
            <p className="mt-2 text-3xl font-bold">
              {upcomingAppointments.length}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-400">Tono de la clínica</p>
            <p className="mt-2 text-lg font-semibold">
              {clinic?.tone ?? "No definido"}
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_180px_auto]">
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Buscar por nombre, teléfono o tratamiento..."
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-400"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-400"
            >
              <option value="todos">Todos los estados</option>
              <option value="nuevo">Nuevo</option>
              <option value="contactado">Contactado</option>
              <option value="interesado">Interesado</option>
              <option value="cita_agendada">Cita agendada</option>
              <option value="no_interesado">No interesado</option>
            </select>

            <select
              value={interestFilter}
              onChange={(event) => setInterestFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-400"
            >
              <option value="todos">Todo interés</option>
              <option value="alto">Alto</option>
              <option value="medio">Medio</option>
              <option value="bajo">Bajo</option>
            </select>

            <button
              onClick={openCreateLeadModal}
              className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
            >
              Nuevo paciente
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr_360px]">
          <aside className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Leads</h2>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                {filteredLeads.length}
              </span>
            </div>

            <div className="space-y-3">
              {filteredLeads.length === 0 && (
                <p className="rounded-2xl bg-slate-900 p-4 text-sm text-slate-400">
                  No hay pacientes con esos filtros.
                </p>
              )}

              {filteredLeads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedLead?.id === lead.id
                      ? "border-cyan-400 bg-cyan-400/10"
                      : "border-white/10 bg-slate-900 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{lead.name}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {lead.phone || "Sin teléfono"}
                      </p>
                    </div>

                    <span className="rounded-full bg-white/10 px-2 py-1 text-xs">
                      {getInterestLabel(lead.interest_level)}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-300">
                    {lead.treatment_interest || "Sin tratamiento"}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Estado: {getStatusLabel(lead.status)}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            {!selectedLead && (
              <div className="flex min-h-[500px] items-center justify-center rounded-3xl bg-slate-900 p-8 text-center">
                <div>
                  <h2 className="text-xl font-bold">Selecciona un paciente</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Aquí verás la ficha, conversación, citas y seguimientos.
                  </p>
                </div>
              </div>
            )}

            {selectedLead && (
              <div>
                <div className="mb-5 flex flex-col gap-4 rounded-3xl bg-slate-900 p-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedLead.name ?? "Paciente"}
                    </h2>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-300 md:grid-cols-2">
                      <p>
                        <span className="text-slate-500">Teléfono:</span>{" "}
                        {selectedLead.phone || "Sin teléfono"}
                      </p>

                      <p>
                        <span className="text-slate-500">Tratamiento:</span>{" "}
                        {selectedLead.treatment_interest || "Sin tratamiento"}
                      </p>

                      <p>
                        <span className="text-slate-500">Estado:</span>{" "}
                        {getStatusLabel(selectedLead.status)}
                      </p>

                      <p>
                        <span className="text-slate-500">Interés:</span>{" "}
                        {getInterestLabel(selectedLead.interest_level)}
                      </p>
                    </div>

                    {selectedLead.notes && (
                      <p className="mt-4 rounded-2xl bg-white/5 p-3 text-sm text-slate-300">
                        {selectedLead.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openEditLeadModal(selectedLead)}
                      className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => openWhatsAppModal(selectedLead)}
                      className="rounded-2xl bg-green-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-green-300"
                    >
                      WhatsApp
                    </button>

                    <button
                      onClick={() => openFollowUpModal(selectedLead)}
                      className="rounded-2xl bg-violet-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-violet-300"
                    >
                      Seguimiento
                    </button>

                    <button
                      onClick={() => openCreateAppointmentModal(selectedLead)}
                      className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300"
                    >
                      Crear cita
                    </button>
                  </div>
                </div>

                <div className="mb-5 rounded-3xl bg-slate-900 p-5">
                  <h3 className="mb-4 text-lg font-bold">Conversación</h3>

                  <div className="mb-4 max-h-72 space-y-3 overflow-y-auto pr-2">
                    {conversations.length === 0 && (
                      <p className="rounded-2xl bg-white/5 p-4 text-sm text-slate-400">
                        Todavía no hay mensajes guardados para este paciente.
                      </p>
                    )}

                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`rounded-2xl p-4 ${
                          conversation.role === "lead"
                            ? "bg-white/10"
                            : "bg-cyan-400/10"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                            {conversation.role === "lead"
                              ? "Paciente"
                              : "Clínica"}
                          </p>

                          <p className="text-xs text-slate-500">
                            {formatDateTime(conversation.created_at)}
                          </p>
                        </div>

                        <p className="text-sm text-slate-200">
                          {conversation.message}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[160px_1fr_auto]">
                    <select
                      value={conversationRole}
                      onChange={(event) =>
                        setConversationRole(event.target.value)
                      }
                      className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                    >
                      <option value="clinic">Clínica</option>
                      <option value="lead">Paciente</option>
                    </select>

                    <input
                      value={conversationMessage}
                      onChange={(event) =>
                        setConversationMessage(event.target.value)
                      }
                      placeholder="Escribe un mensaje..."
                      className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-400"
                    />

                    <button
                      onClick={handleAddConversationMessage}
                      disabled={saving}
                      className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                    >
                      Guardar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="rounded-3xl bg-slate-900 p-5">
                    <h3 className="mb-4 text-lg font-bold">
                      Seguimientos del paciente
                    </h3>

                    <div className="space-y-3">
                      {selectedLeadFollowUps.length === 0 && (
                        <p className="rounded-2xl bg-white/5 p-4 text-sm text-slate-400">
                          No hay seguimientos para este paciente.
                        </p>
                      )}

                      {selectedLeadFollowUps.map((followUp) => (
                        <div
                          key={followUp.id}
                          className="rounded-2xl border border-white/10 bg-white/5 p-4"
                        >
                          <p className="text-sm text-slate-200">
                            {followUp.message}
                          </p>

                          <p className="mt-2 text-xs text-slate-500">
                            {formatDateTime(followUp.scheduled_at)}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                              {getStatusLabel(followUp.status)}
                            </span>

                            <button
                              onClick={() =>
                                openWhatsAppModal(selectedLead, "follow_up")
                              }
                              className="rounded-xl bg-green-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-green-300"
                            >
                              WhatsApp
                            </button>

                            {followUp.status !== "completed" && (
                              <button
                                onClick={() =>
                                  handleCompleteFollowUp(followUp.id)
                                }
                                disabled={saving}
                                className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
                              >
                                Completar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-900 p-5">
                    <h3 className="mb-4 text-lg font-bold">
                      Citas del paciente
                    </h3>

                    <div className="space-y-3">
                      {selectedLeadAppointments.length === 0 && (
                        <p className="rounded-2xl bg-white/5 p-4 text-sm text-slate-400">
                          No hay citas para este paciente.
                        </p>
                      )}

                      {selectedLeadAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="rounded-2xl border border-white/10 bg-white/5 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">
                                {appointment.treatment || "Sin tratamiento"}
                              </p>

                              <p className="mt-2 text-sm text-slate-300">
                                {formatDateTime(appointment.appointment_at)}
                              </p>
                            </div>

                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                              {getStatusLabel(appointment.status)}
                            </span>
                          </div>

                          {appointment.notes && (
                            <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-slate-400">
                              {appointment.notes}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              onClick={() =>
                                openWhatsAppModal(
                                  selectedLead,
                                  "appointment_confirmation",
                                  appointment
                                )
                              }
                              className="rounded-xl bg-green-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-green-300"
                            >
                              WhatsApp
                            </button>

                            <button
                              onClick={() =>
                                openEditAppointmentModal(appointment)
                              }
                              className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"
                            >
                              Editar
                            </button>

                            {appointment.status !== "completed" && (
                              <button
                                onClick={() =>
                                  handleCompleteAppointment(appointment.id)
                                }
                                disabled={saving}
                                className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
                              >
                                Completar
                              </button>
                            )}

                            {appointment.status !== "cancelled" && (
                              <button
                                onClick={() =>
                                  handleCancelAppointment(appointment.id)
                                }
                                disabled={saving}
                                className="rounded-xl bg-yellow-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-yellow-300 disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                            )}

                            <button
                              onClick={() =>
                                handleDeleteAppointment(appointment.id)
                              }
                              disabled={saving}
                              className="rounded-xl bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-400 disabled:opacity-50"
                            >
                              Borrar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="mb-4 text-lg font-bold">
                Seguimientos pendientes
              </h2>

              <div className="space-y-3">
                {pendingFollowUps.length === 0 && (
                  <p className="rounded-2xl bg-slate-900 p-4 text-sm text-slate-400">
                    No tienes seguimientos pendientes.
                  </p>
                )}

                {pendingFollowUps.map((followUp) => {
                  const lead = getLeadById(followUp.lead_id);

                  return (
                    <div
                      key={followUp.id}
                      className="rounded-2xl bg-slate-900 p-4"
                    >
                      <p className="text-sm font-semibold">
                        {getLeadName(followUp.lead_id)}
                      </p>

                      <p className="mt-2 text-sm text-slate-300">
                        {followUp.message}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        {formatDateTime(followUp.scheduled_at)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {lead && (
                          <button
                            onClick={() =>
                              openWhatsAppModal(lead, "follow_up")
                            }
                            className="rounded-xl bg-green-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-green-300"
                          >
                            WhatsApp
                          </button>
                        )}

                        <button
                          onClick={() => handleCompleteFollowUp(followUp.id)}
                          disabled={saving}
                          className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
                        >
                          Marcar completado
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="mb-4 text-lg font-bold">Próximas citas</h2>

              <div className="space-y-3">
                {upcomingAppointments.length === 0 && (
                  <p className="rounded-2xl bg-slate-900 p-4 text-sm text-slate-400">
                    No tienes próximas citas activas.
                  </p>
                )}

                {upcomingAppointments.map((appointment) => {
                  const lead = getLeadById(appointment.lead_id);

                  return (
                    <div
                      key={appointment.id}
                      className="rounded-2xl bg-slate-900 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {getLeadName(appointment.lead_id)}
                          </p>

                          {getLeadPhone(appointment.lead_id) && (
                            <p className="mt-1 text-xs text-slate-500">
                              {getLeadPhone(appointment.lead_id)}
                            </p>
                          )}
                        </div>

                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                          {getStatusLabel(appointment.status)}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-slate-300">
                        {appointment.treatment || "Sin tratamiento"}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        {formatDateTime(appointment.appointment_at)}
                      </p>

                      {appointment.notes && (
                        <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-slate-400">
                          {appointment.notes}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {lead && (
                          <button
                            onClick={() =>
                              openWhatsAppModal(
                                lead,
                                "appointment_confirmation",
                                appointment
                              )
                            }
                            className="rounded-xl bg-green-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-green-300"
                          >
                            WhatsApp
                          </button>
                        )}

                        <button
                          onClick={() => openEditAppointmentModal(appointment)}
                          className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() =>
                            handleCompleteAppointment(appointment.id)
                          }
                          disabled={saving}
                          className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
                        >
                          Completar
                        </button>

                        <button
                          onClick={() =>
                            handleCancelAppointment(appointment.id)
                          }
                          disabled={saving}
                          className="rounded-xl bg-yellow-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-yellow-300 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </section>
      </div>

      {showLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">
                {editingLead ? "Editar paciente" : "Nuevo paciente"}
              </h2>

              <button
                onClick={() => setShowLeadModal(false)}
                className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Nombre
                </label>
                <input
                  value={leadForm.name}
                  onChange={(event) =>
                    setLeadForm({ ...leadForm, name: event.target.value })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  placeholder="Ej: Laura García"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Teléfono
                </label>
                <input
                  value={leadForm.phone}
                  onChange={(event) =>
                    setLeadForm({ ...leadForm, phone: event.target.value })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  placeholder="Ej: 600 000 000"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Tratamiento de interés
                </label>
                <input
                  value={leadForm.treatment_interest}
                  onChange={(event) =>
                    setLeadForm({
                      ...leadForm,
                      treatment_interest: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  placeholder="Ej: Botox, ácido hialurónico..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Estado
                </label>
                <select
                  value={leadForm.status}
                  onChange={(event) =>
                    setLeadForm({ ...leadForm, status: event.target.value })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                >
                  <option value="nuevo">Nuevo</option>
                  <option value="contactado">Contactado</option>
                  <option value="interesado">Interesado</option>
                  <option value="cita_agendada">Cita agendada</option>
                  <option value="no_interesado">No interesado</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Nivel de interés
                </label>
                <select
                  value={leadForm.interest_level}
                  onChange={(event) =>
                    setLeadForm({
                      ...leadForm,
                      interest_level: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                >
                  <option value="alto">Alto</option>
                  <option value="medio">Medio</option>
                  <option value="bajo">Bajo</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-slate-400">
                  Notas
                </label>
                <textarea
                  value={leadForm.notes}
                  onChange={(event) =>
                    setLeadForm({ ...leadForm, notes: event.target.value })
                  }
                  className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  placeholder="Notas internas del paciente..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowLeadModal(false)}
                className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold hover:bg-white/20"
              >
                Cancelar
              </button>

              <button
                onClick={handleSaveLead}
                disabled={saving}
                className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFollowUpModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Programar seguimiento</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Paciente: {selectedLead.name}
                </p>
              </div>

              <button
                onClick={() => setShowFollowUpModal(false)}
                className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Mensaje
                </label>
                <textarea
                  value={followUpForm.message}
                  onChange={(event) =>
                    setFollowUpForm({
                      ...followUpForm,
                      message: event.target.value,
                    })
                  }
                  className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  placeholder="Ej: Escribir para confirmar si quiere cerrar la cita."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Fecha y hora
                </label>
                <input
                  type="datetime-local"
                  value={followUpForm.scheduled_at}
                  onChange={(event) =>
                    setFollowUpForm({
                      ...followUpForm,
                      scheduled_at: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowFollowUpModal(false)}
                className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold hover:bg-white/20"
              >
                Cancelar
              </button>

              <button
                onClick={handleCreateFollowUp}
                disabled={saving}
                className="rounded-2xl bg-violet-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-violet-300 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Programar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAppointmentModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  {editingAppointment ? "Editar cita" : "Crear cita"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Paciente: {selectedLead.name}
                </p>
              </div>

              <button
                onClick={() => {
                  setShowAppointmentModal(false);
                  setEditingAppointment(null);
                }}
                className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Tratamiento
                </label>
                <input
                  value={appointmentForm.treatment}
                  onChange={(event) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      treatment: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  placeholder="Ej: Botox, limpieza facial, ácido hialurónico..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Fecha y hora
                </label>
                <input
                  type="datetime-local"
                  value={appointmentForm.appointment_at}
                  onChange={(event) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      appointment_at: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                />
              </div>

              {editingAppointment && (
                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    Estado
                  </label>
                  <select
                    value={appointmentForm.status}
                    onChange={(event) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        status: event.target.value,
                      })
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  >
                    <option value="scheduled">Programada</option>
                    <option value="completed">Completada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Notas
                </label>
                <textarea
                  value={appointmentForm.notes}
                  onChange={(event) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      notes: event.target.value,
                    })
                  }
                  className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  placeholder="Ej: Primera valoración, confirmar alergias, viene por Instagram..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAppointmentModal(false);
                  setEditingAppointment(null);
                }}
                className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold hover:bg-white/20"
              >
                Cancelar
              </button>

              <button
                onClick={handleSaveAppointment}
                disabled={saving}
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
              >
                {saving
                  ? "Guardando..."
                  : editingAppointment
                  ? "Guardar cambios"
                  : "Crear cita"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWhatsAppModal && whatsAppLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Mensaje de WhatsApp</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Paciente: {whatsAppLead.name} · Teléfono:{" "}
                  {whatsAppLead.phone || "sin teléfono"}
                </p>
              </div>

              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
              >
                Cerrar
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-green-400/30 bg-green-400/10 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold text-green-300">
                    Asistente IA de mensajes
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Genera un WhatsApp personalizado usando el paciente, sus
                    notas y la conversación previa.
                  </p>
                </div>

                <button
                  onClick={handleGenerateWhatsAppWithAI}
                  disabled={generatingAIMessage}
                  className="rounded-2xl bg-green-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-green-300 disabled:opacity-50"
                >
                  {generatingAIMessage ? "Generando..." : "Generar con IA"}
                </button>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => changeWhatsAppTemplate("first_contact")}
                className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"
              >
                Primer contacto
              </button>

              <button
                onClick={() =>
                  changeWhatsAppTemplate("appointment_confirmation")
                }
                className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"
              >
                Confirmar cita
              </button>

              <button
                onClick={() => changeWhatsAppTemplate("follow_up")}
                className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"
              >
                Seguimiento
              </button>

              <button
                onClick={() => changeWhatsAppTemplate("reactivation")}
                className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"
              >
                Reactivar lead
              </button>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Mensaje editable
              </label>

              <textarea
                value={whatsAppMessage}
                onChange={(event) => setWhatsAppMessage(event.target.value)}
                className="min-h-52 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm leading-relaxed outline-none focus:border-green-400"
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
              <button
                onClick={handleCopyWhatsAppMessage}
                className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold hover:bg-white/20"
              >
                Copiar mensaje
              </button>

              <button
                onClick={handleSaveWhatsAppInConversation}
                disabled={saving}
                className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
              >
                Guardar conversación
              </button>

              <button
                onClick={handleOpenWhatsApp}
                className="rounded-2xl bg-green-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-green-300"
              >
                Abrir WhatsApp
              </button>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              El botón abrirá WhatsApp con el mensaje preparado. El envío final
              lo haces manualmente desde WhatsApp.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}