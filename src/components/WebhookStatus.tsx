import { useState, useEffect } from 'react';
import { WEBHOOK_TRIGGER_PLAN } from '../constants';
import { supabase } from '../supabaseClient';

type Status = 'checking' | 'online' | 'offline';

export default function WebhookStatus() {
  const [wfStatus, setWfStatus] = useState<Status>('checking');
  const [dbStatus, setDbStatus] = useState<Status>('checking');

  const checkWorkflow = async () => {
    setWfStatus('checking');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const baseUrl = WEBHOOK_TRIGGER_PLAN.substring(0, WEBHOOK_TRIGGER_PLAN.lastIndexOf('/'));
      const res = await fetch(baseUrl + '/health', { signal: controller.signal });
      clearTimeout(timeout);
      setWfStatus(res.ok ? 'online' : 'offline');
    } catch {
      setWfStatus('offline');
    }
  };

  const checkDatabase = async () => {
    setDbStatus('checking');
    try {
      const { error } = await supabase.from('bot_status').select('is_active').limit(1);
      setDbStatus(error ? 'offline' : 'online');
    } catch {
      setDbStatus('offline');
    }
  };

  const checkAll = () => { checkWorkflow(); checkDatabase(); };

  useEffect(() => {
    checkAll();
    const interval = setInterval(checkAll, 60000);
    return () => clearInterval(interval);
  }, []);

  const dbLabel = { checking: 'Prüft...', online: 'Datenbank Online', offline: 'Datenbank Offline' }[dbStatus];
  const dbDot   = { checking: '🟡', online: '🟢', offline: '🔴' }[dbStatus];
  const wfLabel = { checking: 'Prüft...', online: 'Workflow Online', offline: 'Workflow Offline' }[wfStatus];
  const wfDot   = { checking: '🟡', online: '🟢', offline: '🔴' }[wfStatus];

  return (
    <div className="webhook-status-group" onClick={checkAll} title="Klicken zum Aktualisieren">
      <div className="webhook-status">
        <span className="webhook-status-dot">{dbDot}</span>
        <span className="webhook-status-label">{dbLabel}</span>
      </div>
      <div className="webhook-status">
        <span className="webhook-status-dot">{wfDot}</span>
        <span className="webhook-status-label">{wfLabel}</span>
      </div>
    </div>
  );
}
