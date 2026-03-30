import { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
import { SupabaseService } from './supabaseClient';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// ============ WEBHOOK URLS ============
const WEBHOOK_REGEN_TEXT = import.meta.env.VITE_WEBHOOK_REGEN_TEXT;
const WEBHOOK_REGEN_IMAGE = import.meta.env.VITE_WEBHOOK_REGEN_IMAGE;
const WEBHOOK_TRIGGER_PLAN = import.meta.env.VITE_WEBHOOK_TRIGGER_PLAN;
const WEBHOOK_PUBLISH_POST = import.meta.env.VITE_WEBHOOK_PUBLISH_POST;

const USERS: Record<string, string> = {
  admin: 'admin123',
  user: 'user123'
};

// ============ TYPES ============
interface Config {
  tonality: string;
  topic: string;
  targetAudience: string;
  ageRange: { min: number; max: number };
  postFrequency: number;
  publishWindow: { start: string; end: string };
  contentMix: { [key: string]: number };
  hashtags: string[];
  emojiUsage: string;
  language: string;
  imagePrompt: string;
  imageStyle: string;
  textLength: number;
}

interface PostEngagement {
  likes: number;
  comments: number;
  shares: number;
}

interface Post {
  id?: string;
  content: string;
  timestamp: string;
  status: string;
  contentType: string;
  platform?: string;
  engagement?: PostEngagement;
  imageUrl?: string;
  scheduled_at?: string;
}

interface ToastData {
  message: string;
  type: 'success' | 'error' | 'info';
}

const DEFAULT_CONFIG: Config = {
  tonality: 'professional',
  topic: 'Business & Erfolg',
  targetAudience: 'b2b',
  ageRange: { min: 25, max: 55 },
  postFrequency: 3,
  publishWindow: { start: '09:00', end: '18:00' },
  contentMix: { tips: 30, quotes: 25, products: 25, news: 20 },
  hashtags: ['#business', '#success', '#motivation', '#entrepreneur'],
  emojiUsage: 'moderate',
  language: 'de',
  imagePrompt: '',
  imageStyle: 'realistic',
  textLength: 50
};

const CHART_COLORS = {
  likes: '#ec4899', comments: '#3b82f6', shares: '#10b981',
  facebook: '#1877f2', instagram: '#e4405f', primary: '#6366f1', warning: '#f59e0b'
};

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

// ============ LOGIN ============
function LoginScreen({ onLogin }: { onLogin: (u: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setTimeout(() => {
      if (USERS[username] === password) {
        localStorage.setItem('socialbot_user', username);
        onLogin(username);
      } else {
        setError('Ungültige Anmeldedaten');
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="login-logo"><span>SM</span></div>
          <h1>Social Agent</h1>
          <p>Melde dich an, um fortzufahren</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Benutzername</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin oder user" required />
          </div>
          <div className="input-group">
            <label>Passwort</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Anmeldung läuft...' : 'Anmelden'}
          </button>
        </form>
        <div className="login-footer"><p>Demo-Zugänge: admin/admin123 oder user/user123</p></div>
      </div>
    </div>
  );
}

// ============ SIDEBAR ============
function Sidebar({ activeTab, setActiveTab, onLogout }: { activeTab: string; setActiveTab: (t: string) => void; onLogout: () => void }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'planning', label: 'Content-Planung', icon: '📅' },
    { id: 'settings', label: 'Einstellungen', icon: '⚙️' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">SM</span>
          <span className="logo-text">Social Agent</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button className="logout-button" onClick={onLogout}><span>🚪</span> Abmelden</button>
      </div>
    </div>
  );
}

// ============ STAT CARD ============
function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="stat-icon" style={{ background: `${color}20` }}>{icon}</div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-title">{title}</div>
      </div>
    </div>
  );
}

// ============ DASHBOARD ============
function Dashboard({ config, posts, botStatus, onToggleBot }: { config: Config; posts: Post[]; botStatus: boolean; onToggleBot: () => void }) {
  const postedPosts = posts.filter(p => p.status === 'posted');
  const scheduledCount = posts.filter(p => p.status === 'scheduled').length;

  // Deduplicate: group posts by content (same content = same post on multiple platforms)
  const groupedPosts = useMemo(() => {
    const groups: Record<string, { platforms: string[]; post: Post; totalLikes: number; totalComments: number; totalShares: number }> = {};
    postedPosts.forEach(p => {
      // Use first 80 chars of content as group key
      const key = (p.content || '').substring(0, 80).trim();
      if (!key) return;
      if (!groups[key]) {
        groups[key] = {
          platforms: [p.platform || 'Facebook'],
          post: p,
          totalLikes: p.engagement?.likes || 0,
          totalComments: p.engagement?.comments || 0,
          totalShares: p.engagement?.shares || 0
        };
      } else {
        const plat = p.platform || 'Facebook';
        if (!groups[key].platforms.includes(plat)) groups[key].platforms.push(plat);
        groups[key].totalLikes += p.engagement?.likes || 0;
        groups[key].totalComments += p.engagement?.comments || 0;
        groups[key].totalShares += p.engagement?.shares || 0;
        // Keep the one with an image
        if (p.imageUrl && !groups[key].post.imageUrl) groups[key].post = p;
      }
    });
    return Object.values(groups).sort((a, b) =>
      new Date(b.post.timestamp).getTime() - new Date(a.post.timestamp).getTime()
    );
  }, [postedPosts]);

  const totalUnique = groupedPosts.length;
  const totalEngagement = groupedPosts.reduce((s, g) => s + g.totalLikes + g.totalComments + g.totalShares, 0);
  const avgEngagement = totalUnique > 0 ? Math.round(totalEngagement / totalUnique) : 0;

  const recentPosts = groupedPosts.slice(0, 6);

  return (
    <div className="dashboard">
      <div className="dashboard-header"><h1>Dashboard</h1></div>
      <div className="stats-grid">
        <StatCard title="Veröffentlicht" value={totalUnique} icon="📝" color="#3b82f6" />
        <StatCard title="Geplant" value={scheduledCount} icon="📅" color="#f59e0b" />
        <StatCard title="Ø Engagement" value={avgEngagement} icon="❤️" color="#ec4899" />
        <StatCard title="Frequenz" value={`${config.postFrequency}x/Woche`} icon="⏰" color="#10b981" />
      </div>

      <div className={`bot-control-panel ${botStatus ? '' : 'bot-inactive'}`}>
        <div className="bot-status-header">
          <h2>{botStatus ? '🟢 Agent aktiv' : '🔴 Agent deaktiviert'}</h2>
          <div className={`bot-toggle-button ${botStatus ? 'active' : ''}`} onClick={onToggleBot}>
            <div className="toggle-slider"></div>
            <span className="toggle-label">{botStatus ? 'AN' : 'AUS'}</span>
          </div>
        </div>
        <div className="bot-info">
          {botStatus ? (
            <p>Der Agent generiert automatisch {config.postFrequency}x pro Woche Posts und hält immer 3 geplante Posts bereit. Veröffentlichung zwischen {config.publishWindow.start} und {config.publishWindow.end} Uhr.</p>
          ) : (
            <p>Der Agent ist pausiert. Es werden keine neuen Posts generiert und keine geplanten Posts automatisch veröffentlicht. Manuelles Posten über „Jetzt posten" ist weiterhin möglich.</p>
          )}
        </div>
      </div>

      <div className="recent-posts">
        <h2>Letzte Posts</h2>
        <div className="posts-grid">
          {recentPosts.length > 0 ? recentPosts.map((group, idx) => (
            <div key={idx} className="post-card">
              <div className="post-header">
                <div className="post-platforms">
                  {group.platforms.map(p => <span key={p} className={`platform-tag ${p.toLowerCase().includes('&') ? 'both' : p.toLowerCase()}`}>{p}</span>)}
                </div>
                <span className="status-badge posted">✓ Gepostet</span>
              </div>
              {group.post.imageUrl && <img src={group.post.imageUrl} alt="Post" className="post-image" />}
              <div className="post-content">{group.post.content}</div>
              <div className="post-footer">
                <div className="post-date">{new Date(group.post.timestamp).toLocaleString('de-DE')}</div>
                <div className="post-engagement">
                  <span>❤️ {group.totalLikes}</span>
                  <span>💬 {group.totalComments}</span>
                  <span>🔄 {group.totalShares}</span>
                </div>
              </div>
            </div>
          )) : <p className="no-posts">Noch keine veröffentlichten Posts vorhanden.</p>}
        </div>
      </div>
    </div>
  );
}

// ============ CONTENT PLANNING (NEW) ============
function ContentPlanning({ showToast, onReload, botStatus, onToggleBot }: { showToast: (msg: string, type: 'success' | 'error' | 'info') => void; onReload: () => void; botStatus: boolean; onToggleBot: () => void }) {
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const fileInputRefs: Record<string, HTMLInputElement | null> = {};
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');

  const startScheduleEdit = (post: any) => {
    setEditingScheduleId(post.id);
    const d = post.scheduled_at ? new Date(post.scheduled_at) : new Date();
    setSchedDate(d.toISOString().split('T')[0]);
    setSchedTime(d.toTimeString().slice(0, 5));
  };

  const saveSchedule = async (postId: string) => {
    try {
      const scheduled_at = new Date(`${schedDate}T${schedTime}:00`).toISOString();
      await SupabaseService.updatePost(postId, { scheduled_at });
      showToast('Zeitplan aktualisiert!', 'success');
      setEditingScheduleId(null);
      await loadScheduled();
    } catch { showToast('Fehler beim Speichern', 'error'); }
  };

  const loadScheduled = async () => {
    try {
      setLoading(true);
      const data = await SupabaseService.getScheduledPosts();
      // Sort by scheduled_at ascending (earliest first = left)
      const sorted = data.slice(0, 3).sort((a: any, b: any) => {
        const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Infinity;
        const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Infinity;
        return ta - tb;
      });
      setScheduledPosts(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadScheduled(); }, []);

  const getTimeUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff < 0) return 'Überfällig';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 24) return `in ${Math.floor(h / 24)}d ${h % 24}h`;
    if (h > 0) return `in ${h}h ${m}min`;
    return `in ${m} Min.`;
  };

  const regenerateText = async (postId: string) => {
    setRegenerating(r => ({ ...r, [postId + '_text']: true }));
    try {
      const res = await fetch(WEBHOOK_REGEN_TEXT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Text erfolgreich neu generiert!', 'success');
        await loadScheduled();
      } else {
        showToast('Fehler bei der Text-Generierung', 'error');
      }
    } catch { showToast('Verbindungsfehler', 'error'); }
    finally { setRegenerating(r => ({ ...r, [postId + '_text']: false })); }
  };

  const regenerateImage = async (postId: string) => {
    setRegenerating(r => ({ ...r, [postId + '_img']: true }));
    try {
      const res = await fetch(WEBHOOK_REGEN_IMAGE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Bild erfolgreich neu generiert!', 'success');
        await loadScheduled();
      } else {
        showToast('Fehler bei der Bild-Generierung', 'error');
      }
    } catch { showToast('Verbindungsfehler', 'error'); }
    finally { setRegenerating(r => ({ ...r, [postId + '_img']: false })); }
  };

  const startEdit = (post: any) => {
    setEditingId(post.id);
    setEditContent(post.content || '');
    const d = post.scheduled_at ? new Date(post.scheduled_at) : new Date();
    setEditDate(d.toISOString().split('T')[0]);
    setEditTime(d.toTimeString().slice(0, 5));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const scheduled_at = new Date(`${editDate}T${editTime}:00`).toISOString();
      await SupabaseService.updatePost(editingId, { content: editContent, scheduled_at });
      showToast('Änderungen gespeichert!', 'success');
      setEditingId(null);
      await loadScheduled();
    } catch { showToast('Fehler beim Speichern', 'error'); }
  };

  const deletePost = async (id: string) => {
    if (!window.confirm('Diesen geplanten Post löschen?')) return;
    try {
      await SupabaseService.deletePost(id);
      showToast('Post gelöscht', 'info');
      await loadScheduled();
      onReload();
    } catch { showToast('Fehler beim Löschen', 'error'); }
  };

  // Publish a single post via webhook
  const triggerPublish = async (id: string, silent = false) => {
    setPublishing(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(WEBHOOK_PUBLISH_POST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id })
      });
      if (res.ok) {
        if (!silent) showToast('Post erfolgreich veröffentlicht! 🎉', 'success');
        await loadScheduled();
        onReload();
      } else {
        showToast('Fehler beim Veröffentlichen', 'error');
      }
    } catch { showToast('Verbindungsfehler zum Bot', 'error'); }
    finally { setPublishing(p => ({ ...p, [id]: false })); }
  };

  const publishNow = async (id: string) => {
    if (!window.confirm('Diesen Post jetzt sofort veröffentlichen?')) return;
    await triggerPublish(id);
  };

  // Auto-publish timers: trigger webhook at scheduled time
  const publishTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    // Clear old timers
    Object.values(publishTimers.current).forEach(t => clearTimeout(t));
    publishTimers.current = {};

    // Don't set timers if bot is deactivated
    if (!botStatus) return;

    scheduledPosts.forEach(post => {
      if (!post.scheduled_at || post.status !== 'scheduled') return;
      const delay = new Date(post.scheduled_at).getTime() - Date.now();

      if (delay <= 0) {
        // Already due – publish immediately
        triggerPublish(post.id, true);
      } else if (delay < 24 * 60 * 60 * 1000) {
        // Within 24h – set timer
        publishTimers.current[post.id] = setTimeout(() => {
          triggerPublish(post.id, true);
        }, delay);
      }
    });

    return () => {
      Object.values(publishTimers.current).forEach(t => clearTimeout(t));
    };
  }, [scheduledPosts, botStatus]);

  const handleImageUpload = async (postId: string, file: File) => {
    // Validate file before uploading
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSizeMB = 5;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      showToast(`Ungültiges Format: ${file.type || 'unbekannt'}. Erlaubt: JPG, PNG, WebP, GIF.`, 'error');
      return;
    }

    if (file.size > maxSizeBytes) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      showToast(`Datei zu groß: ${sizeMB} MB. Maximal ${maxSizeMB} MB erlaubt.`, 'error');
      return;
    }

    setUploading(u => ({ ...u, [postId]: true }));
    try {
      const imageUrl = await SupabaseService.uploadImage(file);
      await SupabaseService.updatePost(postId, { image_url: imageUrl });
      showToast('Bild erfolgreich hochgeladen!', 'success');
      await loadScheduled();
    } catch (err: any) {
      console.error('Upload-Fehler:', err);
      const msg = err?.message || err?.error || String(err);
      if (msg.includes('Payload too large') || msg.includes('413')) {
        showToast(`Datei zu groß für den Server. Bitte unter ${maxSizeMB} MB und max. 4000×4000 Pixel.`, 'error');
      } else if (msg.includes('mime') || msg.includes('type') || msg.includes('invalid')) {
        showToast(`Format nicht akzeptiert. Bitte JPG, PNG oder WebP verwenden.`, 'error');
      } else if (msg.includes('policy') || msg.includes('security') || msg.includes('row-level')) {
        showToast('Upload-Berechtigung fehlt. Prüfe die Supabase Storage-Policy für den Bucket "social-media-images".', 'error');
      } else if (msg.includes('Bucket not found') || msg.includes('not found')) {
        showToast('Storage-Bucket "social-media-images" existiert nicht. Bitte in Supabase anlegen.', 'error');
      } else {
        showToast(`Upload fehlgeschlagen: ${msg}`, 'error');
      }
    }
    finally { setUploading(u => ({ ...u, [postId]: false })); }
  };

  const triggerPlanning = async () => {
    setGenerating(true);
    showToast('Posts werden generiert... Das kann 1-2 Minuten dauern.', 'info');
    try {
      const res = await fetch(WEBHOOK_TRIGGER_PLAN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual: true })
      });
      if (res.ok) {
        showToast('Generierung gestartet! Posts erscheinen in ca. 1-2 Minuten.', 'success');
        // Poll for new posts every 15 seconds, max 8 attempts (2 min)
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          const data = await SupabaseService.getScheduledPosts();
          if (data.length > scheduledPosts.length || attempts >= 8) {
            clearInterval(poll);
            const sorted = data.slice(0, 3).sort((a: any, b: any) => {
              const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Infinity;
              const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Infinity;
              return ta - tb;
            });
            setScheduledPosts(sorted);
            setGenerating(false);
            if (data.length > scheduledPosts.length) {
              showToast(`${data.length - scheduledPosts.length} neue Posts generiert! 🎉`, 'success');
            } else {
              showToast('Generierung dauert noch... Klicke auf Aktualisieren.', 'info');
            }
            onReload();
          }
        }, 15000);
      } else {
        showToast('Fehler beim Starten der Generierung', 'error');
        setGenerating(false);
      }
    } catch {
      showToast('Verbindungsfehler zum Agent – ist der Workflow aktiv?', 'error');
      setGenerating(false);
    }
  };

  const emptySlots = 3 - scheduledPosts.length;

  return (
    <div className="content-planning">
      <div className="planning-header">
        <div>
          <h1>Content-Planung</h1>
          <p className="planning-subtitle">Die nächsten 3 geplanten Posts – prüfe, bearbeite oder generiere neu.</p>
        </div>
        <div className="planning-header-actions">
          <button
            className="action-button primary"
            onClick={triggerPlanning}
            disabled={generating || scheduledPosts.length >= 3}
            title={scheduledPosts.length >= 3 ? 'Bereits 3 Posts geplant' : 'Fehlende Posts jetzt generieren'}
          >
            {generating ? <><span className="spin">🔄</span> Generiert...</> : <><span>🚀</span> Posts generieren</>}
          </button>
          <button className="action-button secondary" onClick={loadScheduled} disabled={loading}>
            <span className={loading ? 'spin' : ''}>🔄</span> Aktualisieren
          </button>
        </div>
      </div>

      {/* Bot Status Banner */}
      <div className={`bot-control-panel ${botStatus ? '' : 'bot-inactive'}`}>
        <div className="bot-status-header">
          <h2>{botStatus ? '🟢 Agent aktiv' : '🔴 Agent deaktiviert'}</h2>
          <div className={`bot-toggle-button ${botStatus ? 'active' : ''}`} onClick={onToggleBot}>
            <div className="toggle-slider"></div>
            <span className="toggle-label">{botStatus ? 'AN' : 'AUS'}</span>
          </div>
        </div>
        {!botStatus && (
          <div className="bot-info">
            <p>Der Agent ist pausiert. Es werden keine neuen Posts automatisch generiert oder veröffentlicht.</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="planning-loading">
          <div className="spinner"></div>
          <p>Lade geplante Posts...</p>
        </div>
      ) : (
        <div className="planning-cards">
          {scheduledPosts.map((post, idx) => (
            <div key={post.id} className="planning-card">
              {/* Card Header with number & time */}
              <div className="pcard-header">
                <div className="pcard-number">#{idx + 1}</div>
                <div className="pcard-schedule">
                  <span className={`pcard-countdown ${new Date(post.scheduled_at) < new Date() ? 'overdue' : ''}`}>
                    {post.scheduled_at ? getTimeUntil(post.scheduled_at) : 'Kein Datum'}
                  </span>
                  <span className={`platform-tag ${(post.platform || 'facebook').toLowerCase().includes('&') ? 'both' : (post.platform || 'facebook').toLowerCase()}`}>
                    {post.platform || 'Facebook'}
                  </span>
                </div>
              </div>

              {/* Image Preview */}
              <div className="pcard-image-wrap">
                {post.image_url ? (
                  <img src={post.image_url} alt="Geplanter Post" className="pcard-image" />
                ) : (
                  <div className="pcard-image-placeholder">
                    <span>🖼️</span>
                    <p>Kein Bild</p>
                  </div>
                )}
              </div>

              {/* Middle Action Grid – between image and text */}
              {editingId !== post.id && (
                <div className="pcard-mid-actions">
                  <button
                    className="pcard-mid-btn"
                    onClick={() => regenerateImage(post.id)}
                    disabled={regenerating[post.id + '_img'] || uploading[post.id]}
                  >
                    {regenerating[post.id + '_img'] ? <><span className="spin">🔄</span> Generiert...</> : '🎨 Neues Bild generieren'}
                  </button>
                  <button
                    className="pcard-mid-btn"
                    onClick={() => fileInputRefs[post.id]?.click()}
                    disabled={regenerating[post.id + '_img'] || uploading[post.id]}
                  >
                    {uploading[post.id] ? <><span className="spin">🔄</span> Lädt hoch...</> : '📁 Eigenes Bild hochladen'}
                  </button>
                  <button
                    className="pcard-mid-btn"
                    onClick={() => regenerateText(post.id)}
                    disabled={regenerating[post.id + '_text']}
                  >
                    {regenerating[post.id + '_text'] ? <><span className="spin">🔄</span> Generiert...</> : '🤖 Neuen Text generieren'}
                  </button>
                  <button className="pcard-mid-btn" onClick={() => startEdit(post)}>
                    ✏️ Eigenen Text verfassen
                  </button>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    ref={el => { fileInputRefs[post.id] = el; }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(post.id, file);
                      e.target.value = '';
                    }}
                  />
                </div>
              )}

              {/* Content */}
              {editingId === post.id ? (
                <div className="pcard-edit">
                  <textarea
                    className="pcard-textarea"
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={5}
                  />
                  <div className="pcard-edit-time">
                    <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                    <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} />
                  </div>
                  <div className="pcard-edit-actions">
                    <button className="btn-save" onClick={saveEdit}>💾 Speichern</button>
                    <button className="btn-cancel" onClick={() => setEditingId(null)}>Abbrechen</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="pcard-content">
                    <p className="pcard-text">{post.content}</p>
                  </div>

                  {/* Schedule Row – clickable to edit */}
                  {editingScheduleId === post.id ? (
                    <div className="pcard-schedule-edit">
                      <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} />
                      <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} />
                      <button className="sched-save" onClick={() => saveSchedule(post.id)}>✓</button>
                      <button className="sched-cancel" onClick={() => setEditingScheduleId(null)}>✕</button>
                    </div>
                  ) : (
                    <div className="pcard-time-row" onClick={() => startScheduleEdit(post)} title="Klicke um Zeitpunkt zu ändern">
                      <span className="pcard-time-icon">🕐</span>
                      <span className="pcard-time-value">
                        {post.scheduled_at
                          ? new Date(post.scheduled_at).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                          : 'Nicht geplant'}
                      </span>
                      <span className="pcard-time-edit-hint">✏️</span>
                    </div>
                  )}
                </>
              )}

              {/* Bottom Buttons */}
              {editingId !== post.id && (
                <div className="pcard-bottom-actions">
                  <button className="pcard-bottom-btn delete" onClick={() => deletePost(post.id)} title="Post löschen">
                    🗑️ Post löschen
                  </button>
                  <button
                    className="pcard-bottom-btn publish"
                    onClick={() => publishNow(post.id)}
                    disabled={publishing[post.id]}
                    title="Post sofort veröffentlichen"
                  >
                    {publishing[post.id] ? <><span className="spin">🔄</span> Veröffentlicht...</> : '📤 Jetzt posten'}
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Empty Slots */}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div key={`empty-${i}`} className="planning-card empty-card">
              <div className="empty-card-content">
                <div className="empty-icon">{generating ? '🔄' : '⏳'}</div>
                <h3>{generating ? 'Post wird generiert...' : 'Kein Post geplant'}</h3>
                <p>{generating
                  ? 'Der AI-Agent erstellt gerade Text und Bild. Das kann 1-2 Minuten dauern.'
                  : 'Klicke auf „Posts generieren" um diesen Slot zu füllen.'}
                </p>
                {!generating && (
                  <button className="action-button primary" onClick={triggerPlanning} disabled={generating}>
                    🚀 Jetzt generieren
                  </button>
                )}
                {generating && <div className="spinner" style={{ margin: '16px auto', width: 32, height: 32 }}></div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="planning-info-box">
        <h3>💡 So funktioniert's</h3>
        <p>
          Klicke auf <strong>„Posts generieren"</strong> um die Warteschlange zu füllen. Der Agent generiert bis zu 
          <strong> 3 Posts</strong> mit AI-Text und AI-Bild. Danach werden fällige Posts automatisch veröffentlicht. 
          Du kannst jeden Post vorher prüfen und bei Bedarf Text oder Bild neu generieren lassen.
        </p>
        <p>
          Die Posts werden der Reihe nach abgearbeitet. Du kannst also bis zu zwei Posts in der Zukunft planen. 
          Den ersten Platz solltest du immer frei halten, damit hier die automatisch generierten Posts aufgefüllt 
          werden können. Belegst du alle Kacheln mit eigenen Posts, müssen diese – oder zumindest einer davon – 
          erst abgearbeitet werden, damit der Agent automatisch neue Posts generiert. 
          <strong>Content wird automatisch nur auf freien Kacheln generiert.</strong>
        </p>
      </div>
    </div>
  );
}

// ============ SETTINGS ============
function Settings({ config, onSave }: { config: Config; onSave: (c: Config) => void }) {
  const [localConfig, setLocalConfig] = useState(config);
  const [imagePromptMode, setImagePromptMode] = useState<'auto' | 'manual'>(config.imagePrompt ? 'manual' : 'auto');
  useEffect(() => {
    setLocalConfig(config);
    setImagePromptMode(config.imagePrompt ? 'manual' : 'auto');
  }, [config]);

  const tonalities: { key: string; label: string }[] = [
    { key: 'professional', label: 'Professionell' },
    { key: 'casual', label: 'Locker' },
    { key: 'humorous', label: 'Humorvoll' },
    { key: 'inspirational', label: 'Inspirierend' }
  ];

  const contentMixLabels: Record<string, string> = {
    tips: 'Tipps & Tricks', quotes: 'Zitate', products: 'Produkte / Angebote', news: 'News & Aktuelles'
  };

  const handleAgeMin = (val: number) => {
    const newMin = Math.min(val, localConfig.ageRange.max);
    setLocalConfig({ ...localConfig, ageRange: { ...localConfig.ageRange, min: newMin } });
  };

  const handleAgeMax = (val: number) => {
    const newMax = Math.max(val, localConfig.ageRange.min);
    setLocalConfig({ ...localConfig, ageRange: { ...localConfig.ageRange, max: newMax } });
  };

  const handleSave = () => {
    const toSave = { ...localConfig };
    if (imagePromptMode === 'auto') toSave.imagePrompt = '';
    onSave(toSave);
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Einstellungen</h1>
        <button className="action-button primary" onClick={handleSave}><span>💾</span> Speichern</button>
      </div>
      <div className="settings-grid">
        {/* === CONTENT === */}
        <div className="settings-section">
          <h2>Inhalt & Stil</h2>
          <div className="setting-group">
            <label>Tonalität</label>
            <div className="tone-buttons">
              {tonalities.map(t => (
                <button key={t.key} className={`tone-button ${localConfig.tonality === t.key ? 'active' : ''}`} onClick={() => setLocalConfig({ ...localConfig, tonality: t.key })}>{t.label}</button>
              ))}
            </div>
          </div>
          <div className="setting-group">
            <label>Thema / Themenbeschreibung</label>
            <textarea
              className="setting-textarea"
              value={localConfig.topic}
              onChange={e => setLocalConfig({ ...localConfig, topic: e.target.value })}
              rows={4}
              placeholder="Beschreibe das Thema detailliert, z.B.: Wir sind ein B2B SaaS-Unternehmen für Projektmanagement. Unsere Zielgruppe sind Teamleiter in mittelständischen Unternehmen. Wir möchten Expertise in agilen Methoden zeigen..."
            />
          </div>
          <div className="setting-group">
            <label>Textlänge: {localConfig.textLength <= 25 ? 'Kurz' : localConfig.textLength <= 50 ? 'Mittel' : localConfig.textLength <= 75 ? 'Lang' : 'Sehr lang'}</label>
            <div className="text-length-slider">
              <input type="range" min="0" max="100" value={localConfig.textLength} onChange={e => setLocalConfig({ ...localConfig, textLength: parseInt(e.target.value) })} />
              <div className="text-length-labels">
                <span>Kurz</span><span>Mittel</span><span>Lang</span><span>Sehr lang</span>
              </div>
            </div>
          </div>
          <div className="setting-group">
            <label>Zielgruppe</label>
            <select value={localConfig.targetAudience} onChange={e => setLocalConfig({ ...localConfig, targetAudience: e.target.value })}>
              <option value="b2b">B2B – Geschäftskunden</option>
              <option value="b2c">B2C – Endverbraucher</option>
              <option value="mixed">Gemischt</option>
            </select>
          </div>
          <div className="setting-group">
            <label>Altersgruppe: {localConfig.ageRange.min} – {localConfig.ageRange.max} Jahre</label>
            <div className="range-inputs">
              <div className="range-label-row"><span>Min</span><span>{localConfig.ageRange.min}</span></div>
              <input type="range" min="18" max="65" value={localConfig.ageRange.min} onChange={e => handleAgeMin(parseInt(e.target.value))} />
              <div className="range-label-row"><span>Max</span><span>{localConfig.ageRange.max}</span></div>
              <input type="range" min="18" max="65" value={localConfig.ageRange.max} onChange={e => handleAgeMax(parseInt(e.target.value))} />
            </div>
          </div>
        </div>

        {/* === ZEITPLAN === */}
        <div className="settings-section">
          <h2>Zeitplan & Häufigkeit</h2>
          <div className="setting-group">
            <label>Posts pro Woche: {localConfig.postFrequency}</label>
            <input type="range" min="1" max="14" value={localConfig.postFrequency} onChange={e => setLocalConfig({ ...localConfig, postFrequency: parseInt(e.target.value) })} />
          </div>
          <div className="setting-group">
            <label>Veröffentlichungszeitraum</label>
            <div className="time-inputs">
              <input type="time" value={localConfig.publishWindow.start} onChange={e => setLocalConfig({ ...localConfig, publishWindow: { ...localConfig.publishWindow, start: e.target.value } })} />
              <span>bis</span>
              <input type="time" value={localConfig.publishWindow.end} onChange={e => setLocalConfig({ ...localConfig, publishWindow: { ...localConfig.publishWindow, end: e.target.value } })} />
            </div>
          </div>
          <div className="setting-group">
            <label>Inhaltsverteilung</label>
            {Object.entries(localConfig.contentMix).map(([key, value]) => (
              <div key={key} className="slider-group">
                <span>{contentMixLabels[key] || key}: {value}%</span>
                <input type="range" min="0" max="100" value={value} onChange={e => setLocalConfig({ ...localConfig, contentMix: { ...localConfig.contentMix, [key]: parseInt(e.target.value) } })} />
              </div>
            ))}
          </div>
        </div>

        {/* === BILD-PROMPT === */}
        <div className="settings-section">
          <h2>Bildgenerierung</h2>
          <div className="setting-group">
            <label>Bildstil</label>
            <div className="tone-buttons">
              {([
                { key: 'realistic', label: '📷 Realistisch' },
                { key: 'comic', label: '💬 Comic' },
                { key: 'art', label: '🎨 Kunst' },
                { key: 'fantasy', label: '🌌 Fantasie' }
              ] as const).map(s => (
                <button key={s.key} className={`tone-button ${localConfig.imageStyle === s.key ? 'active' : ''}`} onClick={() => setLocalConfig({ ...localConfig, imageStyle: s.key })}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-group">
            <label>Bildprompt-Modus</label>
            <div className="tone-buttons">
              <button className={`tone-button ${imagePromptMode === 'auto' ? 'active' : ''}`} onClick={() => setImagePromptMode('auto')}>
                🤖 Automatisch aus Thema
              </button>
              <button className={`tone-button ${imagePromptMode === 'manual' ? 'active' : ''}`} onClick={() => setImagePromptMode('manual')}>
                ✏️ Eigener Prompt
              </button>
            </div>
            {imagePromptMode === 'auto' ? (
              <p className="setting-hint">Der Bildprompt wird automatisch aus dem Thema, der Tonalität und dem gewählten Bildstil erstellt.</p>
            ) : (
              <textarea
                className="setting-textarea"
                value={localConfig.imagePrompt}
                onChange={e => setLocalConfig({ ...localConfig, imagePrompt: e.target.value })}
                rows={4}
                placeholder="z.B.: Ein modernes Büro mit natürlichem Licht, diverse Teammitglieder bei einem Meeting, helle und positive Atmosphäre, professionelle Fotografie..."
              />
            )}
          </div>
        </div>

        {/* === WEITERE OPTIONEN === */}
        <div className="settings-section">
          <h2>Weitere Optionen</h2>
          <div className="setting-group">
            <label>Hashtags (kommagetrennt)</label>
            <input type="text" value={localConfig.hashtags.join(', ')} onChange={e => setLocalConfig({ ...localConfig, hashtags: e.target.value.split(',').map(h => h.trim()) })} />
          </div>
          <div className="setting-group">
            <label>Emoji-Nutzung</label>
            <select value={localConfig.emojiUsage} onChange={e => setLocalConfig({ ...localConfig, emojiUsage: e.target.value })}>
              <option value="none">Keine Emojis</option>
              <option value="minimal">Wenige (1–2 pro Post)</option>
              <option value="moderate">Moderat (3–5 pro Post)</option>
              <option value="extensive">Viele Emojis</option>
            </select>
          </div>
          <div className="setting-group">
            <label>Sprache</label>
            <select value={localConfig.language} onChange={e => setLocalConfig({ ...localConfig, language: e.target.value })}>
              <option value="de">Deutsch</option>
              <option value="en">Englisch</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ ANALYTICS ============
function Analytics({ posts, showToast, onReload }: { posts: Post[]; showToast: (msg: string, type: 'success' | 'error' | 'info') => void; onReload: () => void }) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('all');
  const [trackingEngagement, setTrackingEngagement] = useState(false);
  const postedPosts = posts.filter(p => p.status === 'posted');

  const triggerEngagement = async () => {
    setTrackingEngagement(true);
    try {
      const res = await fetch(import.meta.env.VITE_WEBHOOK_ENGAGEMENT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual: true })
      });
      if (res.ok) {
        showToast('Engagement-Daten werden aktualisiert...', 'success');
        setTimeout(() => { onReload(); setTrackingEngagement(false); }, 5000);
      } else {
        showToast('Fehler beim Engagement-Tracking', 'error');
        setTrackingEngagement(false);
      }
    } catch {
      showToast('Verbindungsfehler', 'error');
      setTrackingEngagement(false);
    }
  };

  const filteredPosts = useMemo(() => {
    if (timeRange === 'all') return postedPosts;
    const days = timeRange === '7d' ? 7 : 30;
    const cutoff = new Date(Date.now() - days * 86400000);
    return postedPosts.filter(p => new Date(p.timestamp) >= cutoff);
  }, [postedPosts, timeRange]);

  const totalLikes = filteredPosts.reduce((s, p) => s + (p.engagement?.likes || 0), 0);
  const totalComments = filteredPosts.reduce((s, p) => s + (p.engagement?.comments || 0), 0);
  const totalShares = filteredPosts.reduce((s, p) => s + (p.engagement?.shares || 0), 0);
  const totalEngagement = totalLikes + totalComments + totalShares;
  const avgEngagement = filteredPosts.length > 0 ? Math.round(totalEngagement / filteredPosts.length) : 0;

  const engagementOverTime = useMemo(() => {
    const grouped: Record<string, any> = {};
    filteredPosts.forEach(p => {
      const date = new Date(p.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      if (!grouped[date]) grouped[date] = { date, likes: 0, comments: 0, shares: 0 };
      grouped[date].likes += p.engagement?.likes || 0;
      grouped[date].comments += p.engagement?.comments || 0;
      grouped[date].shares += p.engagement?.shares || 0;
    });
    return Object.values(grouped).reverse();
  }, [filteredPosts]);

  const platformData = useMemo(() => {
    const platforms: Record<string, any> = {};
    filteredPosts.forEach(p => {
      const name = p.platform || 'Unbekannt';
      if (!platforms[name]) platforms[name] = { name, posts: 0, likes: 0, comments: 0, shares: 0 };
      platforms[name].posts += 1;
      platforms[name].likes += p.engagement?.likes || 0;
      platforms[name].comments += p.engagement?.comments || 0;
      platforms[name].shares += p.engagement?.shares || 0;
    });
    return Object.values(platforms);
  }, [filteredPosts]);

  const platformPieData = platformData.map(p => ({ name: p.name, value: p.posts }));

  const bestPosts = useMemo(() => {
    return [...filteredPosts]
      .map(p => ({ ...p, totalEngagement: (p.engagement?.likes || 0) + (p.engagement?.comments || 0) + (p.engagement?.shares || 0) }))
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, 5);
  }, [filteredPosts]);

  const weekdayData = useMemo(() => {
    const days = Array(7).fill(null).map((_, i) => ({ day: WEEKDAYS_SHORT[i], dayFull: WEEKDAYS[i], posts: 0, engagement: 0 }));
    filteredPosts.forEach(p => {
      const idx = new Date(p.timestamp).getDay();
      days[idx].posts += 1;
      days[idx].engagement += (p.engagement?.likes || 0) + (p.engagement?.comments || 0) + (p.engagement?.shares || 0);
    });
    return [...days.slice(1), days[0]];
  }, [filteredPosts]);

  const PIE_COLORS = [CHART_COLORS.facebook, CHART_COLORS.instagram, CHART_COLORS.primary, CHART_COLORS.warning];

  if (postedPosts.length === 0) {
    return <div className="analytics"><h1>Analytics</h1><p className="info-text">Noch keine Daten vorhanden.</p></div>;
  }

  return (
    <div className="analytics">
      <div className="analytics-header">
        <h1>Analytics</h1>
        <div className="analytics-header-actions">
          <div className="time-range-buttons">
            {([['7d', '7 Tage'], ['30d', '30 Tage'], ['all', 'Gesamt']] as const).map(([val, label]) => (
              <button key={val} className={`time-range-btn ${timeRange === val ? 'active' : ''}`} onClick={() => setTimeRange(val)}>{label}</button>
            ))}
          </div>
          <button className="action-button secondary" onClick={triggerEngagement} disabled={trackingEngagement}>
            {trackingEngagement ? <><span className="spin">🔄</span> Lädt...</> : <><span>📊</span> Engagement aktualisieren</>}
          </button>
        </div>
      </div>
      <div className="stats-grid">
        <StatCard title="Likes" value={totalLikes} icon="❤️" color={CHART_COLORS.likes} />
        <StatCard title="Kommentare" value={totalComments} icon="💬" color={CHART_COLORS.comments} />
        <StatCard title="Shares" value={totalShares} icon="🔄" color={CHART_COLORS.shares} />
        <StatCard title="Ø Engagement" value={avgEngagement} icon="📊" color={CHART_COLORS.primary} />
      </div>
      <div className="analytics-grid">
        <div className="analytics-card full-width">
          <h2>Engagement über Zeit</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Line type="monotone" dataKey="likes" stroke={CHART_COLORS.likes} strokeWidth={2} dot={{ r: 4 }} name="Likes" />
                <Line type="monotone" dataKey="comments" stroke={CHART_COLORS.comments} strokeWidth={2} dot={{ r: 4 }} name="Kommentare" />
                <Line type="monotone" dataKey="shares" stroke={CHART_COLORS.shares} strokeWidth={2} dot={{ r: 4 }} name="Shares" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="analytics-card">
          <h2>Plattform-Engagement</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={platformData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Bar dataKey="likes" fill={CHART_COLORS.likes} name="Likes" radius={[4, 4, 0, 0]} />
                <Bar dataKey="comments" fill={CHART_COLORS.comments} name="Kommentare" radius={[4, 4, 0, 0]} />
                <Bar dataKey="shares" fill={CHART_COLORS.shares} name="Shares" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="analytics-card">
          <h2>Posts nach Plattform</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={platformPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {platformPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="analytics-card">
          <h2>Aktivität pro Wochentag</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weekdayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip formatter={(val: any, name: any) => [val, name === 'posts' ? 'Posts' : 'Engagement']} labelFormatter={(l: any) => weekdayData.find(d => d.day === String(l))?.dayFull || String(l)} />
                <Bar dataKey="posts" fill={CHART_COLORS.primary} name="Posts" radius={[4, 4, 0, 0]} />
                <Bar dataKey="engagement" fill={CHART_COLORS.warning} name="Engagement" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="analytics-card full-width">
          <h2>Top 5 Posts nach Engagement</h2>
          <div className="best-posts-list">
            {bestPosts.map((post, idx) => (
              <div key={idx} className="best-post-item">
                <div className="best-post-rank">#{idx + 1}</div>
                <div className="best-post-content">
                  <div className="best-post-platform">
                    <span className={`platform-tag ${(post.platform || 'facebook').toLowerCase().includes('&') ? 'both' : (post.platform || 'facebook').toLowerCase()}`}>{post.platform || 'Facebook'}</span>
                    <span className="best-post-date">{new Date(post.timestamp).toLocaleDateString('de-DE')}</span>
                  </div>
                  <p className="best-post-text">{post.content}</p>
                </div>
                <div className="best-post-stats">
                  <span className="bp-stat likes">❤️ {post.engagement?.likes || 0}</span>
                  <span className="bp-stat comments">💬 {post.engagement?.comments || 0}</span>
                  <span className="bp-stat shares">🔄 {post.engagement?.shares || 0}</span>
                  <span className="bp-stat total">Σ {post.totalEngagement}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ TOAST ============
function Toast({ message, type, onClose }: { message: string; type: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, type === 'error' ? 6000 : 3000); return () => clearTimeout(t); }, [onClose, type]);
  return <div className={`toast ${type}`}>{message}</div>;
}

// ============ APP ============
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [, setUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [botStatus, setBotStatus] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => setToast({ message, type });

  const loadFromSupabase = async () => {
    try {
      setIsLoading(true);
      const loadedPosts = await SupabaseService.getPosts();
      setPosts(loadedPosts.map(p => ({
        id: p.id,
        content: p.content,
        timestamp: p.created_at || new Date().toISOString(),
        status: p.status,
        contentType: 'post',
        platform: p.platform,
        engagement: p.engagement || { likes: 0, comments: 0, shares: 0 },
        imageUrl: p.image_url,
        scheduled_at: p.scheduled_at
      })));

      const loadedConfig = await SupabaseService.getConfig();
      if (loadedConfig) {
        setConfig({
          tonality: loadedConfig.tonality,
          topic: loadedConfig.topic,
          targetAudience: loadedConfig.target_audience,
          ageRange: loadedConfig.age_range,
          postFrequency: loadedConfig.post_frequency,
          publishWindow: loadedConfig.publish_window,
          contentMix: loadedConfig.content_mix,
          hashtags: loadedConfig.hashtags,
          emojiUsage: loadedConfig.emoji_usage,
          language: loadedConfig.language,
          imagePrompt: loadedConfig.image_prompt || '',
          imageStyle: loadedConfig.image_style || 'realistic',
          textLength: loadedConfig.text_length ?? 50
        });
      }

      const loadedStatus = await SupabaseService.getBotStatus();
      if (loadedStatus) setBotStatus(loadedStatus.is_active);
      showToast('Daten geladen', 'success');
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      showToast('Fehler beim Laden', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('socialbot_user');
    if (savedUser) { setUser(savedUser); setIsLoggedIn(true); loadFromSupabase(); }
  }, []);

  const handleToggleBot = () => {
    const newStatus = !botStatus;
    setBotStatus(newStatus);
    SupabaseService.updateBotStatus(newStatus);
  };

  const handleLogin = (username: string) => { setUser(username); setIsLoggedIn(true); loadFromSupabase(); };
  const handleLogout = () => { localStorage.removeItem('socialbot_user'); setIsLoggedIn(false); setUser(null); };

  const handleSaveSettings = async (newConfig: Config) => {
    setIsLoading(true);
    try {
      setConfig(newConfig);
      await SupabaseService.updateConfig({
        tonality: newConfig.tonality, topic: newConfig.topic, target_audience: newConfig.targetAudience,
        age_range: newConfig.ageRange, post_frequency: newConfig.postFrequency, publish_window: newConfig.publishWindow,
        content_mix: newConfig.contentMix, hashtags: newConfig.hashtags, emoji_usage: newConfig.emojiUsage,
        language: newConfig.language, image_prompt: newConfig.imagePrompt, image_style: newConfig.imageStyle,
        text_length: newConfig.textLength
      });
      showToast('Einstellungen gespeichert!', 'success');
    } catch { showToast('Fehler beim Speichern', 'error'); }
    setIsLoading(false);
  };

  if (!isLoggedIn) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="app">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      <div className="main-content">
        {isLoading && <div className="loading-overlay"><div className="spinner"></div></div>}
        {activeTab !== 'planning' && activeTab !== 'analytics' && (
          <div className="top-bar">
            <button className="refresh-button" onClick={loadFromSupabase} disabled={isLoading}>
              <span className={isLoading ? 'spin' : ''}>🔄</span> Aktualisieren
            </button>
          </div>
        )}
        {activeTab === 'dashboard' && <Dashboard config={config} posts={posts} botStatus={botStatus} onToggleBot={handleToggleBot} />}
        {activeTab === 'planning' && <ContentPlanning showToast={showToast} onReload={loadFromSupabase} botStatus={botStatus} onToggleBot={handleToggleBot} />}
        {activeTab === 'settings' && <Settings config={config} onSave={handleSaveSettings} />}
        {activeTab === 'analytics' && <Analytics posts={posts} showToast={showToast} onReload={loadFromSupabase} />}
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
