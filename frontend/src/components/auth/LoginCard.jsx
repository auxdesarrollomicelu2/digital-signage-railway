export default function LoginCard({ children }) {
  return (
    <div className="w-full max-w-[450px] md:max-w-[500px] mx-auto px-4 sm:px-0">
      <div className="bg-card-dark border border-border-dark rounded-2xl p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-lg">
        {children}
      </div>
    </div>
  );
}
