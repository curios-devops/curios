
export default function Logo({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
      <img src='/compass.svg' className="h-7 w-7"/>
      {!isCollapsed && (
        <div className="flex items-center tracking-tight">
          <span className="font-helvetica font-semibold text-xl tracking-tight text-gray-900 dark:text-white">Curios</span>
          <span className="font-helvetica font-semibold text-xl tracking-tight text-[#0095FF] ml-0.5">AI</span>
        </div>
      )}
    </div>
  );
}