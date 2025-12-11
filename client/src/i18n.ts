import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// English translations
const en = {
  translation: {
    // Navigation
    nav: {
      dashboard: "Dashboard",
      jobs: "Jobs",
      candidates: "Candidates",
      programs: "Programs",
      documents: "Documents",
      progress: "Progress",
      compliance: "Compliance",
      templates: "Templates",
      analytics: "Analytics",
      aiAssistant: "AI Assistant",
      settings: "Settings",
      logout: "Logout",
    },
    // Common
    common: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      add: "Add",
      search: "Search",
      filter: "Filter",
      export: "Export",
      import: "Import",
      loading: "Loading...",
      error: "Error",
      success: "Success",
      confirm: "Confirm",
      back: "Back",
      next: "Next",
      submit: "Submit",
      close: "Close",
    },
    // Dashboard
    dashboard: {
      welcome: "Welcome back, {{name}}!",
      subtitle: "Here's what's happening with your recruitment today.",
      totalJobs: "Total Jobs",
      activeCandidates: "Active Candidates",
      avgMatchScore: "Avg. Match Score",
      timeToHire: "Time to Hire",
      quickActions: "Quick Actions",
      recentActivity: "Recent Activity",
      createJob: "Create New Job Posting",
      viewJobs: "View All Jobs",
      getHelp: "Get AI Help",
    },
    // Programs
    programs: {
      title: "Onboarding Programs",
      create: "Create New Program",
      name: "Program Name",
      description: "Description",
      stages: "Stages",
      participants: "Participants",
      status: "Status",
      active: "Active",
      inactive: "Inactive",
    },
    // Documents
    documents: {
      title: "Documents",
      upload: "Upload Document",
      download: "Download",
      approve: "Approve",
      reject: "Reject",
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      type: "Document Type",
      uploadedBy: "Uploaded By",
      uploadedAt: "Uploaded At",
    },
    // Compliance
    compliance: {
      title: "Compliance Reporting",
      participantCompletion: "Participant Completion Rate",
      trainingHours: "Training Hours",
      programOutcomes: "Program Outcomes",
      exportReport: "Export Report",
      dateRange: "Date Range",
      program: "Program",
      allPrograms: "All Programs",
    },
    // Email notifications
    email: {
      subject: {
        missingDocuments: "Missing Documents Reminder",
        pendingApproval: "Pending Document Approval",
        deadlineReminder: "Upcoming Deadline Reminder",
      },
      greeting: "Hello {{name}},",
      footer: "Best regards,<br/>{{organizationName}} Team",
    },
    // SMS notifications
    sms: {
      missingDocuments: "Reminder: You have {{count}} missing document(s). Please upload them at your earliest convenience.",
      pendingApproval: "You have {{count}} document(s) pending approval. Please review them.",
      deadlineReminder: "Reminder: {{taskName}} is due on {{date}}. Please complete it soon.",
    },
  },
};

// Spanish translations
const es = {
  translation: {
    // Navigation
    nav: {
      dashboard: "Panel de Control",
      jobs: "Trabajos",
      candidates: "Candidatos",
      programs: "Programas",
      documents: "Documentos",
      progress: "Progreso",
      compliance: "Cumplimiento",
      templates: "Plantillas",
      analytics: "Análisis",
      aiAssistant: "Asistente IA",
      settings: "Configuración",
      logout: "Cerrar Sesión",
    },
    // Common
    common: {
      save: "Guardar",
      cancel: "Cancelar",
      delete: "Eliminar",
      edit: "Editar",
      add: "Agregar",
      search: "Buscar",
      filter: "Filtrar",
      export: "Exportar",
      import: "Importar",
      loading: "Cargando...",
      error: "Error",
      success: "Éxito",
      confirm: "Confirmar",
      back: "Atrás",
      next: "Siguiente",
      submit: "Enviar",
      close: "Cerrar",
    },
    // Dashboard
    dashboard: {
      welcome: "¡Bienvenido de nuevo, {{name}}!",
      subtitle: "Esto es lo que está sucediendo con tu reclutamiento hoy.",
      totalJobs: "Trabajos Totales",
      activeCandidates: "Candidatos Activos",
      avgMatchScore: "Puntuación Promedio",
      timeToHire: "Tiempo de Contratación",
      quickActions: "Acciones Rápidas",
      recentActivity: "Actividad Reciente",
      createJob: "Crear Nueva Publicación de Trabajo",
      viewJobs: "Ver Todos los Trabajos",
      getHelp: "Obtener Ayuda de IA",
    },
    // Programs
    programs: {
      title: "Programas de Incorporación",
      create: "Crear Nuevo Programa",
      name: "Nombre del Programa",
      description: "Descripción",
      stages: "Etapas",
      participants: "Participantes",
      status: "Estado",
      active: "Activo",
      inactive: "Inactivo",
    },
    // Documents
    documents: {
      title: "Documentos",
      upload: "Subir Documento",
      download: "Descargar",
      approve: "Aprobar",
      reject: "Rechazar",
      pending: "Pendiente",
      approved: "Aprobado",
      rejected: "Rechazado",
      type: "Tipo de Documento",
      uploadedBy: "Subido Por",
      uploadedAt: "Subido El",
    },
    // Compliance
    compliance: {
      title: "Informes de Cumplimiento",
      participantCompletion: "Tasa de Finalización de Participantes",
      trainingHours: "Horas de Capacitación",
      programOutcomes: "Resultados del Programa",
      exportReport: "Exportar Informe",
      dateRange: "Rango de Fechas",
      program: "Programa",
      allPrograms: "Todos los Programas",
    },
    // Email notifications
    email: {
      subject: {
        missingDocuments: "Recordatorio de Documentos Faltantes",
        pendingApproval: "Aprobación de Documentos Pendiente",
        deadlineReminder: "Recordatorio de Fecha Límite Próxima",
      },
      greeting: "Hola {{name}},",
      footer: "Saludos cordiales,<br/>Equipo de {{organizationName}}",
    },
    // SMS notifications
    sms: {
      missingDocuments: "Recordatorio: Tienes {{count}} documento(s) faltante(s). Por favor súbelos lo antes posible.",
      pendingApproval: "Tienes {{count}} documento(s) pendiente(s) de aprobación. Por favor revísalos.",
      deadlineReminder: "Recordatorio: {{taskName}} vence el {{date}}. Por favor complétalo pronto.",
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en,
      es,
    },
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
