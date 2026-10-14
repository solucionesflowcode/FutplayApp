// Componentes compartidos del admin (fase 2 de docs/PLAN_UI_UX_ADMIN.md).
export { default as Button, type VarianteBoton } from "./Button";
export { default as ConfirmDialog } from "./ConfirmDialog";
export { default as DataTable, ordenarFilas, type Columna } from "./DataTable";
export { default as FormField, CLASE_INPUT, type PropsControl } from "./FormField";
export { default as Modal } from "./Modal";
export { default as NumberInput, parsearEntero } from "./NumberInput";
export { default as PageHeader } from "./PageHeader";
export { default as PhoneInput, digitosMovil } from "./PhoneInput";
export { default as StatCard } from "./StatCard";
export { default as StatusBadge, infoEstado, type EstadoConocido } from "./StatusBadge";
export { ToastProvider, useToast, DURACION_AVISO_MS, type Aviso } from "./Toast";
export { useAdminMutation, fueExitoso, type ResultadoAccion } from "./useAdminMutation";
