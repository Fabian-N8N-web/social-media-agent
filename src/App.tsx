import { useState, useEffect, CSSProperties } from 'react';
import './App.css';
import { supabase, SupabaseService } from './supabaseClient';

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
  onSave: () => void;
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
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Benutzername</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin oder user" required />
          </div>
          <div className="input-group">
            <label>Passwort</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Anmeldung läuft...' : 'Anmelden'}
          </button>
        </form>
        <div className="login-footer">
          <p>Demo-Zugänge: admin/admin123 oder user/user123</p>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ activeTab, setActiveTab, onLogout }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'settings', label: 'Einstellungen', icon: '⚙️' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'planning', label: 'Content-Planung', icon: '📅' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">SM</span>
          <span className="logo-text">Social Bot</span>
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
        <button className="logout-button" onClick={onLogout}>
          <span>🚪</span> Abmelden
        </button>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: StatCardProps) {
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

function PostCard({ post }: PostCardProps) {
  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-platforms">
          {post.platforms.map(platform => (
            <span key={platform} className={`platform-tag ${platform.toLowerCase()}`}>{platform}</span>
          ))}
        </div>
        <span className={`status-badge ${post.status}`}>{post.status === 'posted' ? '✓ Gepostet' : '⏱ Geplant'}</span>
      </div>
      {post.imageUrl && <img src={post.imageUrl} alt="Post" className="post-image" />}
      <div className="post-content">{post.content}</div>
      <div className="post-footer">
        <div className="post-date">{new Date(post.date).toLocaleString('de-DE')}</div>
        <div className="post-engagement">
          <span>❤️ {post.likes}</span>
          <span>💬 {post.comments}</span>
          <span>🔄 {post.shares}</span>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ config, posts, botStatus, onToggleBot, onTriggerPost }: DashboardProps) {
  const totalPosts = posts.length;
  const totalEngagement = posts.reduce((sum, p) => sum + (p.engagement?.likes || 0) + (p.engagement?.comments || 0) + (p.engagement?.shares || 0), 0);
  const avgEngagement = totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0;

  const recentPosts = posts.slice(0, 5).map(p => ({
    platforms: [p.platform || 'Facebook'],
    status: p.status,
    date: p.timestamp,
    content: p.content,
    likes: p.engagement?.likes || 0,
    comments: p.engagement?.comments || 0,
    shares: p.engagement?.shares || 0,
    imageUrl: p.imageUrl
  }));

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="header-actions">
          <button className="action-button primary" onClick={onTriggerPost}>
            <span>🚀</span> Post jetzt erstellen
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title="Gesamt Posts" value={totalPosts} icon="📝" color="#3b82f6" />
        <StatCard title="Ø Engagement" value={avgEngagement} icon="❤️" color="#ec4899" />
        <StatCard title="Bot Status" value={botStatus ? 'Aktiv' : 'Inaktiv'} icon="🤖" color={botStatus ? '#10b981' : '#6b7280'} />
        <StatCard title="Frequenz" value={`${config.postFrequency}x/Woche`} icon="⏰" color="#f59e0b" />
      </div>

      <div className="bot-control-panel">
        <div className="bot-status-header">
          <h2>Bot Steuerung</h2>
          <div className={`bot-toggle-button ${botStatus ? 'active' : ''}`} onClick={onToggleBot}>
            <div className="toggle-slider"></div>
            <span className="toggle-label">{botStatus ? 'AN' : 'AUS'}</span>
          </div>
        </div>
        <div className="bot-info">
          <p>Der Bot erstellt automatisch {config.postFrequency}x pro Woche Posts zwischen {config.publishWindow.start} und {config.publishWindow.end} Uhr.</p>
        </div>
      </div>

      <div className="recent-posts">
        <h2>Letzte Posts</h2>
        <div className="posts-grid">
          {recentPosts.length > 0 ? recentPosts.map((post, idx) => <PostCard key={idx} post={post} />) : <p className="no-posts">Noch keine Posts vorhanden. Erstelle deinen ersten Post!</p>}
        </div>
      </div>
    </div>
  );
}

function Settings({ config, setConfig, onSave }: SettingsProps) {
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = () => {
    setConfig(localConfig);
    onSave();
  };

  const tonalities = ['professional', 'casual', 'humorous', 'inspirational'];

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Einstellungen</h1>
        <button className="action-button primary" onClick={handleSave}>
          <span>💾</span> Speichern
        </button>
      </div>

      <div className="settings-grid">
        <div className="settings-section">
          <h2>Content Einstellungen</h2>
          <div className="setting-group">
            <label>Tonalität</label>
            <div className="tone-buttons">
              {tonalities.map(tone => (
                <button key={tone} className={`tone-button ${localConfig.tonality === tone ? 'active' : ''}`} onClick={() => setLocalConfig({ ...localConfig, tonality: tone })}>
                  {tone}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-group">
            <label>Thema</label>
            <input type="text" value={localConfig.topic} onChange={(e) => setLocalConfig({ ...localConfig, topic: e.target.value })} />
          </div>

          <div className="setting-group">
            <label>Zielgruppe</label>
            <select value={localConfig.targetAudience} onChange={(e) => setLocalConfig({ ...localConfig, targetAudience: e.target.value })}>
              <option value="b2b">B2B</option>
              <option value="b2c">B2C</option>
              <option value="mixed">Gemischt</option>
            </select>
          </div>

          <div className="setting-group">
            <label>Altersgruppe: {localConfig.ageRange.min} - {localConfig.ageRange.max} Jahre</label>
            <div className="range-inputs">
              <input type="range" min="18" max="65" value={localConfig.ageRange.min} onChange={(e) => setLocalConfig({ ...localConfig, ageRange: { ...localConfig.ageRange, min: parseInt(e.target.value) } })} />
              <input type="range" min="18" max="65" value={localConfig.ageRange.max} onChange={(e) => setLocalConfig({ ...localConfig, ageRange: { ...localConfig.ageRange, max: parseInt(e.target.value) } })} />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>Posting Zeitplan</h2>
          <div className="setting-group">
            <label>Posts pro Woche: {localConfig.postFrequency}</label>
            <input type="range" min="1" max="14" value={localConfig.postFrequency} onChange={(e) => setLocalConfig({ ...localConfig, postFrequency: parseInt(e.target.value) })} style={{ '--slider-color': '#3b82f6' } as CustomCSSProperties} />
          </div>

          <div className="setting-group">
            <label>Posting Zeitfenster</label>
            <div className="time-inputs">
              <input type="time" value={localConfig.publishWindow.start} onChange={(e) => setLocalConfig({ ...localConfig, publishWindow: { ...localConfig.publishWindow, start: e.target.value } })} />
              <span>bis</span>
              <input type="time" value={localConfig.publishWindow.end} onChange={(e) => setLocalConfig({ ...localConfig, publishWindow: { ...localConfig.publishWindow, end: e.target.value } })} />
            </div>
          </div>

          <div className="setting-group">
            <label>Content Mix</label>
            {Object.entries(localConfig.contentMix).map(([key, value]) => (
              <div key={key} className="slider-group">
                <span>{key}: {value}%</span>
                <input type="range" min="0" max="100" value={value} onChange={(e) => setLocalConfig({ ...localConfig, contentMix: { ...localConfig.contentMix, [key]: parseInt(e.target.value) } })} />
              </div>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h2>Weitere Optionen</h2>
          <div className="setting-group">
            <label>Hashtags (kommagetrennt)</label>
            <input type="text" value={localConfig.hashtags.join(', ')} onChange={(e) => setLocalConfig({ ...localConfig, hashtags: e.target.value.split(',').map(h => h.trim()) })} />
          </div>

          <div className="setting-group">
            <label>Emoji Nutzung</label>
            <select value={localConfig.emojiUsage} onChange={(e) => setLocalConfig({ ...localConfig, emojiUsage: e.target.value })}>
              <option value="none">Keine</option>
              <option value="minimal">Minimal</option>
              <option value="moderate">Moderat</option>
              <option value="extensive">Umfangreich</option>
            </select>
          </div>

          <div className="setting-group">
            <label>Sprache</label>
            <select value={localConfig.language} onChange={(e) => setLocalConfig({ ...localConfig, language: e.target.value })}>
              <option value="de">Deutsch</option>
              <option value="en">Englisch</option>
            </select>
          </div>

          <div className="setting-group">
            <label>AI Model</label>
            <select value={localConfig.aiModel} onChange={(e) => setLocalConfig({ ...localConfig, aiModel: e.target.value })}>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5">GPT-3.5</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function Analytics({ posts }: AnalyticsProps) {
  const totalLikes = posts.reduce((sum, p) => sum + (p.engagement?.likes || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.engagement?.comments || 0), 0);
  const totalShares = posts.reduce((sum, p) => sum + (p.engagement?.shares || 0), 0);

  return (
    <div className="analytics">
      <h1>Analytics</h1>
      <div className="stats-grid">
        <StatCard title="Gesamt Likes" value={totalLikes} icon="❤️" color="#ec4899" />
        <StatCard title="Gesamt Kommentare" value={totalComments} icon="💬" color="#3b82f6" />
        <StatCard title="Gesamt Shares" value={totalShares} icon="🔄" color="#10b981" />
      </div>
      <p className="info-text">Detaillierte Analytics-Grafiken kommen bald!</p>
    </div>
  );
}

function ContentPlanning({ posts }: ContentPlanningProps) {
  const scheduledPosts = posts.filter(p => p.status === 'scheduled');

  return (
    <div className="content-planning">
      <h1>Content-Planung</h1>
      <div className="posts-grid">
        {scheduledPosts.length > 0 ? scheduledPosts.map((post, idx) => (
          <PostCard key={idx} post={{
            platforms: [post.platform || 'Facebook'],
            status: post.status,
            date: post.timestamp,
            content: post.content,
            likes: post.engagement?.likes || 0,
            comments: post.engagement?.comments || 0,
            shares: post.engagement?.shares || 0,
            imageUrl: post.imageUrl
          }} />
        )) : <p className="no-posts">Keine geplanten Posts vorhanden.</p>}
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return <div className={`toast ${type}`}>{message}</div>;
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

  const loadFromSupabase = async () => {
    try {
      setIsLoading(true);
      
      const loadedPosts = await SupabaseService.getPosts();
      setPosts(loadedPosts.map(p => ({
        content: p.content,
        timestamp: p.created_at || new Date().toISOString(),
        status: p.status,
        contentType: 'post',
        platform: p.platform,
        engagement: p.engagement || { likes: 0, comments: 0, shares: 0 },
        imageUrl: p.image_url
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
          aiModel: loadedConfig.ai_model
        });
      }
      
      const loadedStatus = await SupabaseService.getBotStatus();
      if (loadedStatus) {
        setBotStatus(loadedStatus.is_active);
      }
      
      showToast('Daten erfolgreich geladen', 'success');
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      showToast('Fehler beim Laden der Daten', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('socialbot_user');
    if (savedUser) {
      setUser(savedUser);
      setIsLoggedIn(true);
      loadFromSupabase();
    }
  }, []);

  const saveConfig = async () => {
    try {
      await SupabaseService.updateConfig({
        tonality: config.tonality,
        topic: config.topic,
        target_audience: config.targetAudience,
        age_range: config.ageRange,
        post_frequency: config.postFrequency,
        publish_window: config.publishWindow,
        content_mix: config.contentMix,
        hashtags: config.hashtags,
        emoji_usage: config.emojiUsage,
        language: config.language,
        ai_model: config.aiModel
      });
    } catch (error) {
      console.error('Fehler beim Speichern der Config:', error);
    }
  };

  const saveBotStatus = async () => {
    try {
      await SupabaseService.updateBotStatus(botStatus);
    } catch (error) {
      console.error('Fehler beim Speichern des Bot-Status:', error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      saveBotStatus();
    }
  }, [botStatus]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  const handleLogin = (username: string) => {
    setUser(username);
    setIsLoggedIn(true);
    loadFromSupabase();
  };

  const handleLogout = () => {
    localStorage.removeItem('socialbot_user');
    setIsLoggedIn(false);
    setUser(null);
  };

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
      console.log('Full Webhook Response:', JSON.stringify(data, null, 2));

      if (data.success && data.posts) {
        for (const p of data.posts) {
          let imageUrl = null;
          
          if (p.image || p.imageData || p.imageUrl) {
            const imageData = p.imageUrl || p.image || p.imageData;
            
            if (imageData.startsWith('http')) {
              imageUrl = imageData;
            } else {
              const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
              const blob = await fetch(`data:image/png;base64,${base64Data}`).then(r => r.blob());
              
              const fileName = `post-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('post-images')
                .upload(fileName, blob, { contentType: 'image/png' });
              
              if (!uploadError && uploadData) {
                const { data: urlData } = supabase.storage
                  .from('post-images')
                  .getPublicUrl(fileName);
                imageUrl = urlData.publicUrl;
              }
            }
          }
          
          const newPost = await SupabaseService.createPost({
            content: p.content || p.text || '',
            platform: p.platform,
            status: 'posted',
            image_url: imageUrl,
            engagement: { likes: 0, comments: 0, shares: 0 }
          });
          
          if (newPost) {
            setPosts(prev => [{
              content: newPost.content,
              timestamp: newPost.created_at || new Date().toISOString(),
              status: newPost.status,
              contentType: 'post',
              platform: newPost.platform,
              engagement: newPost.engagement || { likes: 0, comments: 0, shares: 0 },
              imageUrl: newPost.image_url
            }, ...prev]);
          }
        }
        
        const platformNames = data.posts.map((p: any) => p.platform).join(' & ') || 'Facebook & Instagram';
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

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await saveConfig();
      showToast('Einstellungen erfolgreich gespeichert!', 'success');
    } catch (error) {
      showToast('Fehler beim Speichern', 'error');
    }
    setIsLoading(false);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      <div className="main-content">
        {isLoading && <div className="loading-overlay"><div className="spinner"></div></div>}
        {activeTab === 'dashboard' && <Dashboard config={config} posts={posts} botStatus={botStatus} onToggleBot={() => setBotStatus(!botStatus)} onTriggerPost={triggerPost} />}
        {activeTab === 'settings' && <Settings config={config} setConfig={setConfig} onSave={handleSaveSettings} />}
        {activeTab === 'analytics' && <Analytics posts={posts} />}
        {activeTab === 'planning' && <ContentPlanning posts={posts} />}
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
