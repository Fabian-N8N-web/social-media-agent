import { useState, useEffect, CSSProperties } from 'react';
import './App.css';

const WEBHOOK_URL = 'https://n8n.srv1274405.hstgr.cloud/webhook/social-bot-trigger';

const USERS: Record<string, string> = {
  admin: 'admin123',
  user: 'user123'
};

// Type Definitions
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
  aiModel: string;
}

interface PostEngagement {
  likes: number;
  comments: number;
  shares: number;
}

interface Post {
  content: string;
  timestamp: string;
  status: string;
  contentType: string;
  platform?: string;
  engagement?: PostEngagement;
  imageUrl?: string;
  imageData?: string;
}

interface ToastData {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface LoginScreenProps {
  onLogin: (username: string) => void;
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}

interface PostCardProps {
  post: {
    platforms: string[];
    status: string;
    date: string;
    content: string;
    likes: number;
    comments: number;
    shares: number;
    imageUrl?: string;
    imageData?: string;
  };
}

interface DashboardProps {
  config: Config;
  posts: Post[];
  botStatus: boolean;
  onToggleBot: () => void;
  onTriggerPost: () => void;
}

interface SettingsProps {
  config: Config;
  setConfig: React.Dispatch<React.SetStateAction<Config>>;
}

interface AnalyticsProps {
  posts: Post[];
}

interface ContentPlanningProps {
  posts: Post[];
}

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

interface CustomCSSProperties extends CSSProperties {
  '--slider-color'?: string;
}

function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setTimeout(() => {
      if (USERS[username] && USERS[username] === password) {
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
          <h1>Social Bot</h1>
          <p>Melde dich an, um fortzufahren</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Benutzername</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Benutzername eingeben" required />
          </div>
          <div className="form-group">
            <label>Passwort</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Passwort eingeben" required />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={isLoading} className="login-button">{isLoading ? 'Anmelden...' : 'Anmelden'}</button>
        </form>
      </div>
    </div>
  );
}

function Sidebar({ activeTab, setActiveTab, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'settings', label: 'Einstellungen', icon: '⚙️' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'content', label: 'Content-Planung', icon: '📝' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">SM</div>
        <span className="logo-text">Social Bot</span>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`nav-item ${activeTab === item.id ? 'active' : ''}`}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
      <button onClick={onLogout} className="logout-button"><span>🚪</span><span>Abmelden</span></button>
    </div>
  );
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-content">
        <span className="stat-title">{title}</span>
        <span className="stat-value">{value}</span>
      </div>
      <div className={`stat-icon ${color}`}><span>{icon}</span></div>
    </div>
  );
}

function PostCard({ post }: PostCardProps) {
  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-platforms">
          {post.platforms.map((platform: string, idx: number) => (
            <span key={idx} className={`platform-tag ${platform.toLowerCase()}`}>
              {platform}
            </span>
          ))}
          <span className={`status-tag ${post.status}`}>
            {post.status === 'posted' ? 'Veröffentlicht' : 'Geplant'}
          </span>
        </div>
        <span className="post-date">{post.date}</span>
      </div>
      <div className="post-preview">
        {post.imageUrl || post.imageData ? (
          <img 
            src={post.imageUrl || `data:image/png;base64,${post.imageData}`} 
            alt="Post" 
            className="post-image-actual"
            onError={(e) => {
              console.error('Image load error');
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="post-image">🖼️ Post preview</div>
        )}
      </div>
      <p className="post-content">{post.content}</p>
      <div className="post-stats">
        <span>👍 {post.likes}</span>
        <span>💬 {post.comments}</span>
        <span>🔄 {post.shares}</span>
      </div>
    </div>
  );
}

function Dashboard({ posts, botStatus, onToggleBot, onTriggerPost }: DashboardProps) {
  const todayPosts = posts.filter((p: Post) => new Date(p.timestamp).toDateString() === new Date().toDateString()).length;
  const totalEngagement = posts.reduce((acc: number, p: Post) => acc + (p.engagement?.likes || 0) + (p.engagement?.comments || 0) + (p.engagement?.shares || 0), 0);
  const avgEngagement = posts.length > 0 ? Math.round((totalEngagement / posts.length / 3) * 100) : 0;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div><h1>Social Media Bot Dashboard</h1><p>Verwalte deine automatisierten Social Media Posts</p></div>
        <button onClick={onToggleBot} className={`bot-toggle-button ${botStatus ? 'active' : 'inactive'}`}>{botStatus ? '⏸️ Bot Pausieren' : '▶️ Bot Starten'}</button>
      </div>
      <div className="stats-grid">
        <StatCard title="Bot Status" value={botStatus ? 'Aktiv' : 'Pausiert'} icon="🤖" color="blue" />
        <StatCard title="Posts heute" value={todayPosts} icon="📤" color="orange" />
        <StatCard title="Posts gesamt" value={posts.length} icon="📊" color="purple" />
        <StatCard title="Engagement" value={`${avgEngagement}%`} icon="📈" color="green" />
        <StatCard title="Reichweite" value="2.4K" icon="👥" color="pink" />
      </div>
      <div className="quick-actions"><h3>Schnellaktionen</h3><button onClick={onTriggerPost} className="action-button primary">📤 Jetzt posten</button></div>
      <div className="posts-section">
        <div className="section-header"><h2>Aktuelle Posts</h2><button className="link-button">Alle anzeigen</button></div>
        <div className="posts-grid">
          {posts.slice(0, 4).map((post: Post, idx: number) => (
            <PostCard 
              key={idx} 
              post={{
                platforms: [post.platform || 'Facebook'],
                status: post.status,
                date: new Date(post.timestamp).toLocaleString('de-DE'),
                content: post.content,
                likes: post.engagement?.likes || 0,
                comments: post.engagement?.comments || 0,
                shares: post.engagement?.shares || 0,
                imageUrl: post.imageUrl,
                imageData: post.imageData
              }} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Settings({ config, setConfig }: SettingsProps) {
  const handleChange = (key: string, value: unknown) => setConfig((prev: Config) => ({ ...prev, [key]: value }));
  const handleContentMixChange = (type: string, value: string) => setConfig((prev: Config) => ({ ...prev, contentMix: { ...prev.contentMix, [type]: parseInt(value) } }));

  return (
    <div className="settings">
      <h1>Einstellungen</h1>
      <p className="subtitle">Konfiguriere deinen Social Media Bot</p>
      <div className="settings-grid">
        <div className="settings-card">
          <h3>🎭 Tonalität</h3><p>Wähle den Stil deiner Posts</p>
          <div className="button-group">
            {['professional', 'casual', 'humorous', 'inspiring'].map(tone => (
              <button key={tone} onClick={() => handleChange('tonality', tone)} className={`tone-button ${config.tonality === tone ? 'active' : ''}`}>
                {tone === 'professional' && '👔 Professionell'}{tone === 'casual' && '😊 Casual'}{tone === 'humorous' && '😄 Humorvoll'}{tone === 'inspiring' && '✨ Inspirierend'}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-card">
          <h3>📌 Thema</h3><p>Hauptthema deiner Inhalte</p>
          <input type="text" value={config.topic} onChange={(e) => handleChange('topic', e.target.value)} placeholder="z.B. Business, Lifestyle, Tech..." className="text-input" />
        </div>
        <div className="settings-card">
          <h3>🎯 Zielgruppe</h3><p>Definiere deine Zielgruppe</p>
          <select value={config.targetAudience} onChange={(e) => handleChange('targetAudience', e.target.value)} className="select-input">
            <option value="b2b">B2B - Geschäftskunden</option><option value="b2c">B2C - Endverbraucher</option><option value="both">Beide</option>
          </select>
          <div className="age-group">
            <label>Altersgruppe</label>
            <div className="range-inputs">
              <input type="number" value={config.ageRange?.min || 18} onChange={(e) => handleChange('ageRange', { ...config.ageRange, min: parseInt(e.target.value) })} min={13} max={65} className="number-input" />
              <span>bis</span>
              <input type="number" value={config.ageRange?.max || 65} onChange={(e) => handleChange('ageRange', { ...config.ageRange, max: parseInt(e.target.value) })} min={13} max={100} className="number-input" />
            </div>
          </div>
        </div>
        <div className="settings-card">
          <h3>📅 Post-Frequenz</h3><p>Wie oft soll gepostet werden?</p>
          <div className="frequency-control">
            <input type="range" min={1} max={10} value={config.postFrequency} onChange={(e) => handleChange('postFrequency', parseInt(e.target.value))} className="range-slider" />
            <span className="frequency-value">{config.postFrequency} Posts/Tag</span>
          </div>
        </div>
        <div className="settings-card">
          <h3>⏰ Zeitfenster</h3><p>Wann sollen Posts veröffentlicht werden?</p>
          <div className="time-inputs">
            <div className="time-group"><label>Von</label><input type="time" value={config.publishWindow?.start || '09:00'} onChange={(e) => handleChange('publishWindow', { ...config.publishWindow, start: e.target.value })} className="time-input" /></div>
            <div className="time-group"><label>Bis</label><input type="time" value={config.publishWindow?.end || '18:00'} onChange={(e) => handleChange('publishWindow', { ...config.publishWindow, end: e.target.value })} className="time-input" /></div>
          </div>
        </div>
        <div className="settings-card full-width">
          <h3>📊 Content-Mix</h3><p>Verteilung der Content-Typen</p>
          <div className="content-mix-sliders">
            {[{ key: 'tips', label: '💡 Tipps', color: '#3b82f6' }, { key: 'quotes', label: '💬 Zitate', color: '#8b5cf6' }, { key: 'products', label: '🛍️ Produkte', color: '#f59e0b' }, { key: 'news', label: '📰 News', color: '#10b981' }].map(item => (
              <div key={item.key} className="mix-slider">
                <div className="mix-label"><span>{item.label}</span><span>{config.contentMix?.[item.key] || 25}%</span></div>
                <input type="range" min={0} max={100} value={config.contentMix?.[item.key] || 25} onChange={(e) => handleContentMixChange(item.key, e.target.value)} className="range-slider" style={{ '--slider-color': item.color } as CustomCSSProperties} />
              </div>
            ))}
          </div>
        </div>
        <div className="settings-card">
          <h3>#️⃣ Hashtags</h3><p>Standard-Hashtags für Posts</p>
          <textarea value={config.hashtags?.join(' ') || ''} onChange={(e) => handleChange('hashtags', e.target.value.split(' ').filter(h => h))} placeholder="#business #success #motivation" className="textarea-input" />
        </div>
        <div className="settings-card">
          <h3>😀 Emoji-Einstellungen</h3><p>Emoji-Nutzung in Posts</p>
          <select value={config.emojiUsage} onChange={(e) => handleChange('emojiUsage', e.target.value)} className="select-input">
            <option value="none">Keine Emojis</option><option value="minimal">Minimal (1-2)</option><option value="moderate">Moderat (3-5)</option><option value="heavy">Viele Emojis</option>
          </select>
        </div>
        <div className="settings-card">
          <h3>🌐 Sprache</h3><p>Sprache der generierten Inhalte</p>
          <select value={config.language} onChange={(e) => handleChange('language', e.target.value)} className="select-input">
            <option value="de">🇩🇪 Deutsch</option><option value="en">🇬🇧 English</option>
          </select>
        </div>
        <div className="settings-card">
          <h3>🤖 KI-Modell</h3><p>Wähle das KI-Modell für Content</p>
          <select value={config.aiModel} onChange={(e) => handleChange('aiModel', e.target.value)} className="select-input">
            <option value="gpt-4">GPT-4 (Beste Qualität)</option><option value="gpt-3.5">GPT-3.5 (Schneller)</option><option value="claude">Claude (Kreativ)</option>
          </select>
        </div>
      </div>
      <div className="settings-actions"><button className="save-button">💾 Einstellungen speichern</button></div>
    </div>
  );
}

function Analytics({ posts }: AnalyticsProps) {
  const totalLikes = posts.reduce((acc: number, p: Post) => acc + (p.engagement?.likes || 0), 0);
  const totalComments = posts.reduce((acc: number, p: Post) => acc + (p.engagement?.comments || 0), 0);
  const totalShares = posts.reduce((acc: number, p: Post) => acc + (p.engagement?.shares || 0), 0);

  return (
    <div className="analytics">
      <h1>Analytics</h1><p className="subtitle">Übersicht deiner Performance</p>
      <div className="analytics-stats">
        <div className="analytics-card"><span className="analytics-icon">👍</span><span className="analytics-value">{totalLikes}</span><span className="analytics-label">Likes gesamt</span></div>
        <div className="analytics-card"><span className="analytics-icon">💬</span><span className="analytics-value">{totalComments}</span><span className="analytics-label">Kommentare</span></div>
        <div className="analytics-card"><span className="analytics-icon">🔄</span><span className="analytics-value">{totalShares}</span><span className="analytics-label">Shares</span></div>
        <div className="analytics-card"><span className="analytics-icon">📊</span><span className="analytics-value">{posts.length}</span><span className="analytics-label">Posts gesamt</span></div>
      </div>
      <div className="analytics-chart"><h3>Engagement-Verlauf</h3><div className="chart-placeholder"><p>📈 Chart wird hier angezeigt</p><p className="chart-info">Engagement der letzten 7 Tage</p></div></div>
    </div>
  );
}

function ContentPlanning({ posts }: ContentPlanningProps) {
  return (
    <div className="content-planning">
      <h1>Content-Planung</h1><p className="subtitle">Plane und verwalte deine Posts</p>
      <div className="planning-actions"><button className="action-button primary">➕ Neuen Post erstellen</button><button className="action-button secondary">📅 Kalenderansicht</button></div>
      <div className="scheduled-posts">
        <h3>Geplante Posts</h3>
        {posts.length === 0 ? (<div className="empty-state"><span>📭</span><p>Keine geplanten Posts vorhanden</p></div>) : (
          <div className="posts-list">
            {posts.map((post: Post, idx: number) => (
              <div key={idx} className="scheduled-post-item">
                <div className="post-info"><span className="post-type">{post.contentType}</span><p className="post-preview-text">{post.content}</p><span className="post-time">{new Date(post.timestamp).toLocaleString('de-DE')}</span></div>
                <div className="post-actions"><button className="icon-button">✏️</button><button className="icon-button danger">🗑️</button></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => { const timer = setTimeout(onClose, 5000); return () => clearTimeout(timer); }, [onClose]);
  return (
    <div className={`toast ${type}`}>
      <span className="toast-icon">{type === 'success' && '✅'}{type === 'error' && '❌'}{type === 'info' && 'ℹ️'}</span>
      <span className="toast-message">{message}</span>
      <button onClick={onClose} className="toast-close">×</button>
    </div>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [, setUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [botStatus, setBotStatus] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [config, setConfig] = useState<Config>({
    tonality: 'professional', topic: 'Business & Erfolg', targetAudience: 'b2b', ageRange: { min: 25, max: 55 },
    postFrequency: 3, publishWindow: { start: '09:00', end: '18:00' },
    contentMix: { tips: 30, quotes: 25, products: 25, news: 20 },
    hashtags: ['#business', '#success', '#motivation', '#entrepreneur'],
    emojiUsage: 'moderate', language: 'de', aiModel: 'gpt-4'
  });

  useEffect(() => { const savedUser = localStorage.getItem('socialbot_user'); if (savedUser) { setUser(savedUser); setIsLoggedIn(true); } }, []);

  const handleLogin = (username: string) => { setUser(username); setIsLoggedIn(true); showToast('Erfolgreich angemeldet!', 'success'); };
  const handleLogout = () => { localStorage.removeItem('socialbot_user'); setUser(null); setIsLoggedIn(false); showToast('Erfolgreich abgemeldet', 'info'); };
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message, type });
  const toggleBot = () => { setBotStatus(!botStatus); showToast(botStatus ? 'Bot wurde pausiert' : 'Bot wurde gestartet', 'success'); };

  const triggerPost = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post',
          config: {
            platforms: { facebook: true, instagram: true },
            tonality: config.tonality,
            topic: config.topic,
            targetAudience: config.targetAudience,
            language: config.language,
            hashtags: config.hashtags,
            emojiUsage: config.emojiUsage
          }
        })
      });

      const data = await response.json();
      console.log('Webhook Response:', data);

      if (data.success) {
        const newPosts = data.posts?.map((p: any) => ({
          content: p.content || p.text || '',
          timestamp: new Date().toISOString(),
          status: 'posted',
          contentType: 'post',
          platform: p.platform,
          engagement: { likes: 0, comments: 0, shares: 0 },
          imageUrl: p.imageUrl,
          imageData: p.image || p.imageData
        })) || [];

        setPosts((prev: Post[]) => [...newPosts, ...prev]);
        
        const platformNames = data.posts?.map((p: any) => p.platform).join(' & ') || 'Facebook & Instagram';
        showToast(`✅ Post erfolgreich auf ${platformNames} veröffentlicht!`, 'success');
      } else {
        showToast('Fehler beim Posten', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Verbindungsfehler zum Bot', 'error');
    }
    setIsLoading(false);
  };

  if (!isLoggedIn) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="app">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard config={config} posts={posts} botStatus={botStatus} onToggleBot={toggleBot} onTriggerPost={triggerPost} />}
        {activeTab === 'settings' && <Settings config={config} setConfig={setConfig} />}
        {activeTab === 'analytics' && <Analytics posts={posts} />}
        {activeTab === 'content' && <ContentPlanning posts={posts} />}
      </main>
      {isLoading && <div className="loading-overlay"><div className="spinner"></div><p>Wird gepostet...</p></div>}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
