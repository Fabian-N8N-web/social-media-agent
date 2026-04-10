import WebhookStatus from './WebhookStatus';

export default function Sidebar({ activeTab, setActiveTab, onLogout, darkMode, onToggleDark }: { activeTab: string; setActiveTab: (t: string) => void; onLogout: () => void; darkMode: boolean; onToggleDark: () => void }) {
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
        <WebhookStatus />
        <button className="dark-mode-button" onClick={onToggleDark}>
          <span>{darkMode ? '☀️' : '🌙'}</span>
          <span className="nav-label">{darkMode ? 'Hell' : 'Dunkel'}</span>
        </button>
        <button className="logout-button" onClick={onLogout}><span>🚪</span> Abmelden</button>
      </div>
    </div>
  );
}
