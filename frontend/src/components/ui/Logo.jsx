export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: 'text-lg tracking-wide',
    md: 'text-2xl tracking-wider',
    lg: 'text-3xl sm:text-4xl tracking-wider',
  };

  return (
    <div className={`font-heading font-black ${sizes[size]} text-center`}>
      <span className="text-accent">Digital</span>
      <span className="text-white ml-2">Signage</span>
    </div>
  );
}
