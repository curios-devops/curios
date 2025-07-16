import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { HelpCircle } from "lucide-react";

export default function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItems = [
    { label: "Help & FAQ", href: "#" },
    { label: "Release Notes", href: "#" },
    { label: "Terms & Policies", href: "/policies" },
    { label: "Keyboard Shortcuts", href: "#" },
    { label: "Report Illegal Content", href: "#" },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-7 h-7 rounded-full bg-theme-theme-toggle flex items-center justify-center transition-colors"
        aria-label="Help menu"
      >
        <HelpCircle size={14} className="text-on-surface text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-48 bg-surface rounded-lg shadow-lg border border-outline overflow-hidden">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.href}
              className="block px-4 py-2 text-sm text-on-surface hover:bg-secondary hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
