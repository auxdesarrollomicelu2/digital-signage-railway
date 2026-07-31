export default function Link({ children, href, variant = 'accent', size = 'md' }) {
  const variants = {
    accent: 'text-accent hover:text-accent/80',
    muted: 'text-gray-400 hover:text-gray-300',
  };

  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
  };

  return (
    <a
      href={href}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        font-medium transition-all duration-200
        hover:underline underline-offset-2
      `}
    >
      {children}
    </a>
  );
}
