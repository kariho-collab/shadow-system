import { motion } from 'framer-motion';

export const Panel = ({ title, children, className = '' }) => (
  <section className={`panel ${className}`}>{title && <h2>{title}</h2>}{children}</section>
);
export const Bar = ({ value, label }) => {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className="bar" role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
};
export const Loading = () => <div aria-busy="true" aria-label="Loading"><div className="skeleton" /><div className="skeleton" /></div>;
export const ErrorBox = ({ message, onRetry }) => (
  <Panel title="SYSTEM ERROR"><p className="err">{message}</p>{onRetry && <button onClick={onRetry}>Retry</button>}</Panel>
);
export const Empty = ({ children }) => <Panel><p className="dim">{children}</p></Panel>;
export const Page = ({ children }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>{children}</motion.div>
);
export function Confirm({ message, onYes, onNo }) {
  return (
    <div className="overlay" role="alertdialog" aria-modal="true" aria-label="Confirm">
      <div className="modal">
        <p>{message}</p>
        <div className="row"><button onClick={onNo} autoFocus>Cancel</button><button className="danger" onClick={onYes}>Confirm</button></div>
      </div>
    </div>
  );
}
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
