import Card from './Card';

export default function PhasePlaceholder({ icon, badge, title, text }) {
  return (
    <main className="flex-1 p-5 lg:p-6">
      <Card className="phase-placeholder">
        <div className="phase-placeholder-icon" aria-hidden="true">
          <i className={icon} />
        </div>
        <span className="phase-placeholder-badge">{badge}</span>
        <h2 className="phase-placeholder-title">{title}</h2>
        <p className="phase-placeholder-text">{text}</p>
      </Card>
    </main>
  );
}
