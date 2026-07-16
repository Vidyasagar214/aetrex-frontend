export default function Card({ children, className = '' }) {
  return <div className={`cp-card ${className}`.trim()}>{children}</div>;
}
