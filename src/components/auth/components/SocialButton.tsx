interface SocialButtonProps {
  onClick: () => void;
  children: import('react').ReactNode;
}

export default function SocialButton({ onClick, children }: SocialButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 bg-white text-gray-800 p-3 rounded-lg hover:bg-gray-100 transition-colors"
    >
      {children}
    </button>
  );
}