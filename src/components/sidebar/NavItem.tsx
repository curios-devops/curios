import React from "react";
import { useNavigate } from "react-router-dom";
import { useUserType } from "../../hooks/useUserType.ts";
import type { LucideIcon } from "lucide-react";

interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  requiresAuth?: boolean;
  authContext?: "default" | "pro" | "library" | "spaces";
  onAuthRequired?: (context: string) => void;
}

export default function NavItem({
  to,
  icon: Icon,
  label,
  isActive,
  isCollapsed,
  requiresAuth = false,
  authContext = "default",
  onAuthRequired,
}: NavItemProps) {
  const navigate = useNavigate();
  const userType = useUserType();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (requiresAuth && userType === "guest") {
      onAuthRequired?.(authContext);
      return;
    }

    navigate(to);
  };

  return (
    <a
      href={to}
      onClick={handleClick}
      className={`flex items-center ${
        isCollapsed ? "justify-center" : "gap-3"
      } p-2.5 rounded-lg transition-colors duration-200 ${
        isActive
          ? "text-[#007BFF] bg-[#eef1f2] dark:bg-[#1a1a1a] font-medium"
          : "text-gray-600 dark:text-gray-400 hover:text-[#007BFF] dark:hover:text-[#007BFF] hover:bg-[#eef1f2] dark:hover:bg-[#1a1a1a]"
      }`}
    >
      <Icon size={24} />
      {!isCollapsed && (
        <span className="text-[15px] font-medium tracking-[-0.01em]">
          {label}
        </span>
      )}
    </a>
  );
}
