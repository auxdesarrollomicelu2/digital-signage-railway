export default function FilterBar({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 mb-6 ${className}`}>
      <div className="flex flex-wrap gap-4 items-end">
        {children}
      </div>
    </div>
  );
}
