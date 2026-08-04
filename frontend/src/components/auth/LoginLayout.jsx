export default function LoginLayout({ children }) {
  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden">
      {/* Fondo animado con gradientes */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradiente base */}
        <div className="absolute inset-0 bg-gradient-to-br from-bg-dark via-[#1a1a2e] to-bg-dark"></div>
        
        {/* Orbes animados con gradiente */}
        <div className="absolute top-0 -left-20 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-gradient-to-br from-accent/20 via-accent/10 to-transparent rounded-full blur-3xl animate-blob opacity-70"></div>
        <div className="absolute top-0 -right-20 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-gradient-to-bl from-accent/15 via-accent/5 to-transparent rounded-full blur-3xl animate-blob animation-delay-2000 opacity-60"></div>
        <div className="absolute -bottom-20 left-20 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-gradient-to-tr from-accent/20 via-accent/10 to-transparent rounded-full blur-3xl animate-blob animation-delay-4000 opacity-70"></div>
        <div className="absolute bottom-0 right-1/4 w-72 h-72 sm:w-96 sm:h-96 bg-gradient-to-tl from-accent/10 via-accent/5 to-transparent rounded-full blur-3xl animate-blob animation-delay-6000 opacity-50"></div>
      </div>
      
      {/* Grid pattern - más sutil */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] sm:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] sm:bg-[size:50px_50px] opacity-30"></div>
      
      {/* Contenido */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}
