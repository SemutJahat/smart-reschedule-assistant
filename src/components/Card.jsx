export default function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-pure-white border border-soft-border rounded-2xl p-6 md:p-8 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
