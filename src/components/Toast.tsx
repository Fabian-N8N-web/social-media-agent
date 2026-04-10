import { useEffect } from 'react';

export default function Toast({ message, type, onClose }: { message: string; type: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, type === 'error' ? 6000 : 3000); return () => clearTimeout(t); }, [onClose, type]);
  return <div className={`toast ${type}`}>{message}</div>;
}
