import { AlertCircle, AlertTriangle, ShieldCheck, Flame } from "lucide-react";
export const RiskBadge = ({
  level = "UNKNOWN",
  className = "",
  showIcon = true,
}) => {
  const normalized = String(level || "UNKNOWN").toLowerCase();
  const getIcon = () => {
    switch (normalized) {
      case "critical":
        return <Flame size={12} />;
      case "high":
        return <AlertTriangle size={12} />;
      case "moderate":
      case "warning":
        return <AlertCircle size={12} />;
      case "low":
        return <ShieldCheck size={12} />;
      default:
        return <AlertCircle size={12} />;
    }
  };
  const getLabel = () => {
    switch (normalized) {
      case "critical":
        return "Critical";
      case "high":
        return "High";
      case "moderate":
      case "warning":
        return "Moderate";
      case "low":
        return "Low";
      default:
        return "Unknown";
    }
  };
  return (
    <span className={`badge-ops ${normalized} ${className}`}>
      {showIcon && getIcon()}
      <span>{getLabel()}</span>
    </span>
  );
};
export default RiskBadge;
