import { Info, CheckCircle, AlertTriangle, ShieldAlert } from "lucide-react";

export type NotificationType = "info" | "warning" | "success" | "alert";
export type TargetMode = "all" | "specific";

export const typeConfig = {
  info: { icon: Info, label: "ព័ត៌មាន", color: "bg-emerald-100 text-emerald-700", borderColor: "border-emerald-200", iconColor: "text-emerald-600", iconBg: "bg-emerald-100" },
  success: { icon: CheckCircle, label: "ជោគជ័យ", color: "bg-emerald-100 text-emerald-700", borderColor: "border-emerald-200", iconColor: "text-emerald-600", iconBg: "bg-emerald-100" },
  warning: { icon: AlertTriangle, label: "ការព្រមាន", color: "bg-amber-100 text-amber-700", borderColor: "border-amber-200", iconColor: "text-amber-600", iconBg: "bg-amber-100" },
  alert: { icon: ShieldAlert, label: "អាសន្ន", color: "bg-red-100 text-red-700", borderColor: "border-red-200", iconColor: "text-red-600", iconBg: "bg-red-100" },
};
