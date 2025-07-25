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
        className="w-10 h-10 rounded-full bg-theme-theme-toggle flex items-center justify-center text-gray-700 text-sm font-medium transition-colors"
        aria-label="Help menu"
      >
        <HelpCircle size={22} className="text-on-surface text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-4 mb-2 w-56 bg-surface rounded-lg shadow-lg border-2 border-gray-700 overflow-hidden">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.href}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-secondary hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <span className="text-base mr-1">
                {index === 0 && <span className="inline-block w-4 h-4 align-middle"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="7" /><text x="8" y="11" textAnchor="middle" fontSize="8" fill="currentColor">?</text></svg></span>}
                {index === 1 && <span className="inline-block w-4 h-4 align-middle"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="12" height="12" rx="2" /><line x1="4" y1="6" x2="12" y2="6" /><line x1="4" y1="10" x2="12" y2="10" /></svg></span>}
                {index === 2 && <span className="inline-block w-4 h-4 align-middle"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="10" height="10" rx="2" /><line x1="5" y1="7" x2="11" y2="7" /><line x1="5" y1="9" x2="11" y2="9" /></svg></span>}
                {index === 3 && <span className="inline-block w-4 h-4 align-middle"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="12" height="8" rx="2" /><rect x="5" y="2" width="6" height="2" rx="1" /></svg></span>}
                {index === 4 && <span className="inline-block w-4 h-4 align-middle"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="8,2 14,14 2,14" /></svg></span>}
              </span>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
