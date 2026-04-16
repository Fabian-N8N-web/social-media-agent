import { useState, useEffect } from 'react';
import './App.css';
import { SupabaseService } from './supabaseClient';
import { DEFAULT_CONFIG } from './constants';
import type { Config, Post, ToastData } from './types';
import LoginScreen     from './components/LoginScreen';
import Sidebar         from './components/Sidebar';
import Dashboard       from './components/Dashboard';
import ContentPlanning from './components/ContentPlanning';
import Settings        from './components/Settings';
import Analytics       from './components/Analytics';
import Toast           from './components/Toast';
import OnboardingWizard from './components/OnboardingWizard';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [botStatus, setBotStatus] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [generating, setGenerating] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

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
          hashtags: loadedConfig.hashtags,
          emojiUsage: loadedConfig.emoji_usage,
          language: loadedConfig.language,
          imagePrompt: loadedConfig.image_prompt || '',
          imageStyle: loadedConfig.image_style || 'realistic',
          textLength: loadedConfig.text_length ?? 50,
          websiteUrl: loadedConfig.website_url || '',
          brandContext: loadedConfig.brand_context || '',
          brandContextUpdatedAt: loadedConfig.brand_context_updated_at || '',
          brandKeywords: loadedConfig.brand_keywords || '',
          styleMode: loadedConfig.style_mode || 'auto',
          postFrequencyUnit: loadedConfig.post_frequency_unit || 'week',
          enabledPostTypes: loadedConfig.enabled_post_types || ['trend', 'knowledge', 'story', 'tip', 'spotlight'],
          imageFallbackMode: loadedConfig.image_fallback_mode || 'ai_generated',
          setupCompleted: loadedConfig.setup_completed ?? false,
          publishPlatform: loadedConfig.publish_platform || 'both',
          businessType: loadedConfig.business_type || 'products',
          industry: loadedConfig.industry || '',
          imageModels: loadedConfig.image_models || { people: 'google/imagen-4', scene: 'black-forest-labs/flux-1.1-pro-ultra' },
          styleOverrides: loadedConfig.style_overrides || { tonality: 'auto', targetAudience: 'auto', ageRange: 'auto', language: 'auto', emojiUsage: 'auto', hashtags: 'auto' }
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

  // Check existing session on mount + listen for auth changes
  useEffect(() => {
    SupabaseService.getSession().then(session => {
      if (session) {
        setIsLoggedIn(true);
        loadFromSupabase();
      }
      setAuthChecked(true);
    });

    const { data: { subscription } } = SupabaseService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsLoggedIn(false);
      } else if (event === 'SIGNED_IN' && session) {
        setIsLoggedIn(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleToggleBot = async () => {
    const newStatus = !botStatus;
    setBotStatus(newStatus);
    try {
      await SupabaseService.updateBotStatus(newStatus);
    } catch (err) {
      console.error('Bot-Status konnte nicht gespeichert werden:', err);
      showToast('Fehler beim Speichern des Bot-Status', 'error');
      setBotStatus(!newStatus);
    }
  };

  const handleLogin = () => { setIsLoggedIn(true); loadFromSupabase(); };
  const handleLogout = async () => {
    try {
      await SupabaseService.signOut();
    } catch (err) {
      console.error('Logout fehlgeschlagen:', err);
    }
    setIsLoggedIn(false);
  };

  const handleSaveSettings = async (newConfig: Config) => {
    setIsLoading(true);
    try {
      setConfig(newConfig);
      await SupabaseService.updateConfig({
        tonality: newConfig.tonality, topic: newConfig.topic, target_audience: newConfig.targetAudience,
        age_range: newConfig.ageRange, post_frequency: newConfig.postFrequency, publish_window: newConfig.publishWindow,
        hashtags: newConfig.hashtags, emoji_usage: newConfig.emojiUsage,
        language: newConfig.language, image_prompt: newConfig.imagePrompt, image_style: newConfig.imageStyle,
        text_length: newConfig.textLength,
        website_url: newConfig.websiteUrl,
        brand_context: newConfig.brandContext || null,
        brand_context_updated_at: newConfig.brandContextUpdatedAt || null,
        brand_keywords: newConfig.brandKeywords,
        style_mode: newConfig.styleMode,
        post_frequency_unit: newConfig.postFrequencyUnit,
        enabled_post_types: newConfig.enabledPostTypes,
        image_fallback_mode: newConfig.imageFallbackMode,
        setup_completed: newConfig.setupCompleted,
        publish_platform: newConfig.publishPlatform,
        business_type: newConfig.businessType,
        industry: newConfig.industry,
        image_models: newConfig.imageModels,
        style_overrides: newConfig.styleOverrides
      });
      showToast('Einstellungen gespeichert!', 'success');
    } catch { showToast('Fehler beim Speichern', 'error'); }
    setIsLoading(false);
  };

  const handleWizardComplete = async () => {
    // Config neu laden, damit setupCompleted = true übernommen wird
    await loadFromSupabase();
  };

  const handleRestartWizard = async () => {
    const updated = { ...config, setupCompleted: false };
    setConfig(updated);
    try {
      await SupabaseService.updateConfig({ setup_completed: false });
      showToast('Setup wird neu gestartet …', 'info');
    } catch {
      showToast('Fehler beim Setup-Neustart', 'error');
    }
  };

  // Show nothing while checking session to avoid login flash
  if (!authChecked) return null;

  if (!isLoggedIn) return <LoginScreen onLogin={handleLogin} />;

  // Onboarding-Wizard blockierend anzeigen, solange Setup nicht abgeschlossen
  if (!config.setupCompleted) {
    return (
      <>
        <OnboardingWizard
          config={config}
          onComplete={handleWizardComplete}
          showToast={showToast}
        />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  return (
    <div className="app">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} />
      <div className="main-content">
        {isLoading && <div className="loading-overlay"><div className="spinner"></div></div>}
        {activeTab !== 'planning' && activeTab !== 'analytics' && activeTab !== 'settings' && (
          <div className="top-bar">
            <button className="refresh-button" onClick={loadFromSupabase} disabled={isLoading}>
              <span className={isLoading ? 'spin' : ''}>🔄</span> Aktualisieren
            </button>
          </div>
        )}
        {activeTab === 'dashboard' && <Dashboard config={config} posts={posts} botStatus={botStatus} onToggleBot={handleToggleBot} />}
        {activeTab === 'planning' && <ContentPlanning showToast={showToast} onReload={loadFromSupabase} botStatus={botStatus} onToggleBot={handleToggleBot} generating={generating} setGenerating={setGenerating} />}
        {activeTab === 'settings' && <Settings config={config} onSave={handleSaveSettings} showToast={showToast} onRestartWizard={handleRestartWizard} onReloadConfig={loadFromSupabase} posts={posts} />}
        {activeTab === 'analytics' && <Analytics posts={posts} showToast={showToast} onReload={loadFromSupabase} />}
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
