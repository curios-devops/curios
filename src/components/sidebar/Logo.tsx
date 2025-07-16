
export default function Logo({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
      <img src='/compass.svg' className="h-10 w-10"/>
      {!isCollapsed && (
        <div className="flex items-center tracking-tight">
          <span className="text-gray-900 dark:text-white font-semibold text-xl tracking-[-0.02em]">Curios</span>
          <span className="font-semibold text-xl tracking-[-0.02em] text-blue-500">AI</span>
        </div>
      )}
    </div>
  );
}