import { useState, useEffect, useRef, useCallback } from 'react';
import { SupabaseService } from '../supabaseClient';
import { WEBHOOK_SCRAPE } from '../constants';
import type { Config } from '../types';
import ProductManager from './ProductManager';

interface Props {
  config: Config;
  onSave: (c: Config) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function Settings({ config, onSave, showToast }: Props) {
  const [localConfig, setLocalConfig] = useState(config);
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'schedule'>('text');
  const [imagePromptMode, setImagePromptMode] = useState<'auto' | 'manual'>(config.imagePrompt ? 'manual' : 'auto');
  const [scrapingLoading, setScrapingLoading] = useState(false);
  const [nextPostType, setNextPostType] = useState<string | null>(null);
  const [nextProductId, setNextProductId] = useState<string | null>(null);

  useEffect(() => {
    setLocalConfig(config);
    setImagePromptMode(config.imagePrompt ? 'manual' : 'auto');
  }, [config]);

  useEffect(() => {
    const refresh = async () => {
      try {
        const posts = await SupabaseService.getPosts();
        // Scheduled Posts nach scheduled_at sortieren (ASC, wie N8N)
        const scheduled = posts
          .filter((p: any) => p.status === 'scheduled')
          .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

        const allTypes = ['spotlight', 'trend', 'knowledge', 'story', 'tip'];
        const enabled = (localConfig.enabledPostTypes || allTypes).filter((t: string) => allTypes.includes(t));
        if (enabled.length === 0) { setNextPostType(null); setNextProductId(null); return; }

        // Exakt wie N8N: letzter scheduled Post mit post_type bestimmt den nächsten Typ
        const scheduledWithType = scheduled.filter((p: any) => p.post_type);
        if (scheduledWithType.length > 0) {
          const lastType = scheduledWithType[scheduledWithType.length - 1].post_type;
          const lastIdx = enabled.indexOf(lastType);
          setNextPostType(enabled[lastIdx >= 0 ? (lastIdx + 1) % enabled.length : 0]);
        } else {
          // Keine scheduled Posts → N8N startet bei Index 0
          setNextPostType(enabled[0]);
        }

        // Produkt-Rotation: zählt scheduled Spotlight-Posts (wie N8N)
        const products = await SupabaseService.getProducts();
        if (products.length > 0) {
          const scheduledSpotlights = scheduled.filter((p: any) => p.post_type === 'spotlight').length;
          const nextIdx = scheduledSpotlights % products.length;
          setNextProductId(products[nextIdx].id);
        } else {
          setNextProductId(null);
        }
      } catch { /* ignore */ }
    };
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [localConfig.enabledPostTypes]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSave = useCallback((cfg: Config) => {
    const toSave = { ...cfg };
    if (imagePromptMode === 'auto') toSave.imagePrompt = '';
    const so = toSave.styleOverrides || { tonality: 'auto', targetAudience: 'auto', ageRange: 'auto', language: 'auto', emojiUsage: 'auto', hashtags: 'auto' };
    const allAuto = Object.values(so).every(v => v === 'auto');
    toSave.styleMode = allAuto ? 'auto' : 'manual';
    onSave(toSave);
  }, [onSave, imagePromptMode]);

  const set = (patch: Partial<Config>) => {
    setLocalConfig(c => {
      const updated = { ...c, ...patch };
      // Auto-save mit Debounce
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => doSave(updated), 1500);
      return updated;
    });
  };

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  const handleSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    doSave(localConfig);
  };

  const scrapeWebsite = async () => {
    if (!localConfig.websiteUrl.trim()) { showToast('Bitte URL eingeben', 'error'); return; }
    setScrapingLoading(true);
    try {
      const res = await fetch(WEBHOOK_SCRAPE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: localConfig.websiteUrl, userId: 'admin' })
      });
      const data = await res.json();
      if (data.success && data.brand_context) {
        set({ brandContext: data.brand_context, brandContextUpdatedAt: new Date().toISOString() });
        showToast('Website erfolgreich ausgelesen!', 'success');
      } else {
        showToast('Scraping fehlgeschlagen', 'error');
      }
    } catch {
      showToast('Verbindungsfehler beim Scraping', 'error');
    } finally {
      setScrapingLoading(false);
    }
  };

  const tonalities = [
    { key: 'professional', label: 'Professionell' },
    { key: 'casual', label: 'Locker' },
    { key: 'humorous', label: 'Humorvoll' },
    { key: 'inspirational', label: 'Inspirierend' }
  ];

  const postTypes = [
    { key: 'spotlight', icon: '🔦', name: 'Produkt-Spotlight', desc: 'Vorstellung eines Produkts mit Mehrwert' },
    { key: 'trend', icon: '📰', name: 'Trend & News', desc: 'Aktuelles aus der Branche' },
    { key: 'knowledge', icon: '🧠', name: 'Wissens-Post', desc: 'Inhaltsstoffe, Hintergründe, Herstellung' },
    { key: 'story', icon: '💬', name: 'Story / Testimonial', desc: 'Gründergeschichte oder Kundenstimme' },
    { key: 'tip', icon: '💡', name: 'Tipp & Tutorial', desc: 'Konkreter Mehrwert, fördert Saves & Shares' },
  ];

  const enabledPostTypes = localConfig.enabledPostTypes || ['spotlight', 'trend', 'knowledge', 'story', 'tip'];
  const styleOverrides = localConfig.styleOverrides || { tonality: 'auto', targetAudience: 'auto', ageRange: 'auto', language: 'auto', emojiUsage: 'auto', hashtags: 'auto' };

  const togglePostType = (key: string) => {
    const current = [...enabledPostTypes];
    const idx = current.indexOf(key);
    if (idx >= 0 && current.length > 1) current.splice(idx, 1);
    else if (idx < 0) current.push(key);
    set({ enabledPostTypes: current });
  };

  const toggleStyleOverride = (key: keyof typeof styleOverrides) => {
    set({ styleOverrides: { ...styleOverrides, [key]: styleOverrides[key] === 'auto' ? 'manual' : 'auto' } });
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Einstellungen</h1>
        <button className="save-button-large" onClick={handleSave}>💾 Einstellungen speichern</button>
      </div>

      <div className="settings-tabs">
        {([['text', '✍️ Textgenerierung'], ['image', '🎨 Bildgenerierung'], ['schedule', '📅 Zeitplan']] as const).map(([key, label]) => (
          <button key={key} className={`settings-tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>{label}</button>
        ))}
      </div>

      {/* ====== TAB 1: TEXTGENERIERUNG ====== */}
      {activeTab === 'text' && (
        <div className="settings-tab-content">
          <div className="settings-section">
            <h2>Über dein Unternehmen</h2>

            <div className="setting-group">
              <label>Unternehmen & Produkte</label>
              <textarea
                className="setting-textarea"
                value={localConfig.topic}
                onChange={e => set({ topic: e.target.value })}
                rows={4}
                placeholder="Wir sind... Unsere Produkte... Unsere Zielgruppe..."
              />
            </div>

            <div className="setting-group">
              <label>Website</label>
              <div className="scrape-row">
                <input
                  type="url"
                  value={localConfig.websiteUrl}
                  onChange={e => set({ websiteUrl: e.target.value })}
                  placeholder="https://www.example.com"
                />
                <button className="action-button secondary" onClick={scrapeWebsite} disabled={scrapingLoading}>
                  {scrapingLoading ? <><span className="spin">🔄</span> Liest...</> : '🔍 Auslesen'}
                </button>
              </div>
              {localConfig.brandContext && (
                <div className="scrape-result">
                  <div className="scrape-result-header">
                    <span>✓ Kontext vorhanden · {localConfig.brandContext.length} Zeichen</span>
                    {localConfig.brandContextUpdatedAt && (
                      <span> · Zuletzt: {new Date(localConfig.brandContextUpdatedAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                  </div>
                  <div className="scrape-actions">
                    <details className="scrape-details">
                      <summary>Zusammenfassung anzeigen</summary>
                    <p className="scrape-context-text">{localConfig.brandContext}</p>
                    </details>
                    <button className="scrape-delete-btn" onClick={() => set({ brandContext: '', brandContextUpdatedAt: '' })}>Zusammenfassung löschen</button>
                  </div>
                </div>
              )}
            </div>

            <div className="setting-group">
              <label>USPs & Besonderheiten (ergänzend)</label>
              <textarea
                className="setting-textarea"
                value={localConfig.brandKeywords}
                onChange={e => set({ brandKeywords: e.target.value })}
                rows={2}
                placeholder="made in Germany, vegan, 30 Jahre Expertise..."
              />
            </div>
          </div>

          <div className="settings-section">
            <h2>Produkt-Portfolio</h2>
            <p className="section-subtitle">Der Agent rotiert automatisch zwischen den Produkten.</p>
            <ProductManager showToast={showToast} nextProductId={nextProductId} />
          </div>

          <div className="settings-section">
            <h2>Content-Varianten</h2>
            <p className="section-subtitle">Der Agent wechselt automatisch zwischen diesen Post-Typen – kein Post gleicht dem vorherigen.</p>
            <div className="post-types-grid">
              {postTypes.map(pt => (
                <div key={pt.key} className={`post-type-card ${enabledPostTypes.includes(pt.key) ? '' : 'post-type-disabled'} ${nextPostType === pt.key ? 'post-type-next' : ''}`} onClick={() => togglePostType(pt.key)} style={{ cursor: 'pointer' }}>
                  <span className="post-type-icon">{pt.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div className="post-type-name">
                      {pt.name}
                      {nextPostType === pt.key && enabledPostTypes.includes(pt.key) && (
                        <span className="post-type-next-badge">als nächstes dran</span>
                      )}
                    </div>
                    <div className="post-type-desc">{pt.desc}</div>
                  </div>
                  <div className={`post-type-toggle ${enabledPostTypes.includes(pt.key) ? 'active' : ''}`}>
                    <div className="post-type-toggle-dot" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <h2>Textlänge</h2>
            <div className="setting-group">
              <label>{localConfig.textLength <= 25 ? 'Kurz' : localConfig.textLength <= 50 ? 'Mittel' : localConfig.textLength <= 75 ? 'Lang' : 'Sehr lang'}</label>
              <div className="text-length-slider">
                <input type="range" min="0" max="100" value={localConfig.textLength} onChange={e => set({ textLength: parseInt(e.target.value) })} />
                <div className="text-length-labels">
                  <span>Kurz</span><span>Mittel</span><span>Lang</span><span>Sehr lang</span>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h2>Erweiterte Stiloptionen</h2>
            <p className="section-subtitle">Schalte einzelne Optionen auf „Manuell", um sie selbst festzulegen – sonst wählt die KI automatisch.</p>

            <div className="style-options-list">
              {/* Tonalität */}
              <div className="style-option-item">
                <div className="style-option-header" onClick={() => toggleStyleOverride('tonality')}>
                  <div><div className="style-option-name">Tonalität</div><div className="style-option-desc">{styleOverrides.tonality === 'auto' ? 'KI wählt passend zum Post-Typ' : tonalities.find(t => t.key === localConfig.tonality)?.label || 'Professionell'}</div></div>
                  <div className={`post-type-toggle ${styleOverrides.tonality === 'manual' ? 'active' : ''}`}><div className="post-type-toggle-dot" /></div>
                </div>
                {styleOverrides.tonality === 'manual' && (
                  <div className="style-option-body">
                    <div className="tone-buttons">
                      {tonalities.map(t => (
                        <button key={t.key} className={`tone-button ${localConfig.tonality === t.key ? 'active' : ''}`} onClick={() => set({ tonality: t.key })}>{t.label}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Zielgruppe */}
              <div className="style-option-item">
                <div className="style-option-header" onClick={() => toggleStyleOverride('targetAudience')}>
                  <div><div className="style-option-name">Zielgruppe</div><div className="style-option-desc">{styleOverrides.targetAudience === 'auto' ? 'KI wählt passend zum Produkt' : localConfig.targetAudience === 'b2b' ? 'B2B – Geschäftskunden' : localConfig.targetAudience === 'b2c' ? 'B2C – Endverbraucher' : 'Gemischt'}</div></div>
                  <div className={`post-type-toggle ${styleOverrides.targetAudience === 'manual' ? 'active' : ''}`}><div className="post-type-toggle-dot" /></div>
                </div>
                {styleOverrides.targetAudience === 'manual' && (
                  <div className="style-option-body">
                    <select value={localConfig.targetAudience} onChange={e => set({ targetAudience: e.target.value })}>
                      <option value="b2b">B2B – Geschäftskunden</option>
                      <option value="b2c">B2C – Endverbraucher</option>
                      <option value="mixed">Gemischt</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Altersgruppe */}
              <div className="style-option-item">
                <div className="style-option-header" onClick={() => toggleStyleOverride('ageRange')}>
                  <div><div className="style-option-name">Altersgruppe</div><div className="style-option-desc">{styleOverrides.ageRange === 'auto' ? 'KI schätzt passend zur Zielgruppe' : `${localConfig.ageRange.min} – ${localConfig.ageRange.max} Jahre`}</div></div>
                  <div className={`post-type-toggle ${styleOverrides.ageRange === 'manual' ? 'active' : ''}`}><div className="post-type-toggle-dot" /></div>
                </div>
                {styleOverrides.ageRange === 'manual' && (
                  <div className="style-option-body">
                    <div className="range-inputs">
                      <div className="range-label-row"><span>Min</span><span>{localConfig.ageRange.min}</span></div>
                      <input type="range" min="18" max="65" value={localConfig.ageRange.min} onChange={e => {
                        const v = Math.min(parseInt(e.target.value), localConfig.ageRange.max);
                        set({ ageRange: { ...localConfig.ageRange, min: v } });
                      }} />
                      <div className="range-label-row"><span>Max</span><span>{localConfig.ageRange.max}</span></div>
                      <input type="range" min="18" max="65" value={localConfig.ageRange.max} onChange={e => {
                        const v = Math.max(parseInt(e.target.value), localConfig.ageRange.min);
                        set({ ageRange: { ...localConfig.ageRange, max: v } });
                      }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Sprache */}
              <div className="style-option-item">
                <div className="style-option-header" onClick={() => toggleStyleOverride('language')}>
                  <div><div className="style-option-name">Sprache</div><div className="style-option-desc">{styleOverrides.language === 'auto' ? 'Deutsch (Standard)' : localConfig.language === 'de' ? 'Deutsch' : 'Englisch'}</div></div>
                  <div className={`post-type-toggle ${styleOverrides.language === 'manual' ? 'active' : ''}`}><div className="post-type-toggle-dot" /></div>
                </div>
                {styleOverrides.language === 'manual' && (
                  <div className="style-option-body">
                    <select value={localConfig.language} onChange={e => set({ language: e.target.value })}>
                      <option value="de">Deutsch</option>
                      <option value="en">Englisch</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Emoji-Nutzung */}
              <div className="style-option-item">
                <div className="style-option-header" onClick={() => toggleStyleOverride('emojiUsage')}>
                  <div><div className="style-option-name">Emoji-Nutzung</div><div className="style-option-desc">{styleOverrides.emojiUsage === 'auto' ? 'KI wählt passend zum Stil' : localConfig.emojiUsage === 'none' ? 'Keine' : localConfig.emojiUsage === 'minimal' ? 'Wenige' : localConfig.emojiUsage === 'moderate' ? 'Moderat' : 'Viele'}</div></div>
                  <div className={`post-type-toggle ${styleOverrides.emojiUsage === 'manual' ? 'active' : ''}`}><div className="post-type-toggle-dot" /></div>
                </div>
                {styleOverrides.emojiUsage === 'manual' && (
                  <div className="style-option-body">
                    <select value={localConfig.emojiUsage} onChange={e => set({ emojiUsage: e.target.value })}>
                      <option value="none">Keine Emojis</option>
                      <option value="minimal">Wenige (1–2 pro Post)</option>
                      <option value="moderate">Moderat (3–5 pro Post)</option>
                      <option value="extensive">Viele Emojis</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Hashtags */}
              <div className="style-option-item">
                <div className="style-option-header" onClick={() => toggleStyleOverride('hashtags')}>
                  <div><div className="style-option-name">Hashtags</div><div className="style-option-desc">{styleOverrides.hashtags === 'auto' ? 'KI wählt 3–5 passende Hashtags' : localConfig.hashtags.join(', ') || 'Keine gesetzt'}</div></div>
                  <div className={`post-type-toggle ${styleOverrides.hashtags === 'manual' ? 'active' : ''}`}><div className="post-type-toggle-dot" /></div>
                </div>
                {styleOverrides.hashtags === 'manual' && (
                  <div className="style-option-body">
                    <input type="text" value={localConfig.hashtags.join(', ')} onChange={e => set({ hashtags: e.target.value.split(',').map(h => h.trim()) })} placeholder="#hashtag1, #hashtag2, ..." />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== TAB 2: BILDGENERIERUNG ====== */}
      {activeTab === 'image' && (
        <div className="settings-tab-content">
          <div className="settings-section">
            <h2>Bildstil</h2>
            <div className="setting-group">
              <div className="tone-buttons">
                {([
                  { key: 'realistic', label: '📷 Realistisch' },
                  { key: 'comic', label: '💬 Comic' },
                  { key: 'art', label: '🎨 Kunst' },
                  { key: 'fantasy', label: '🌌 Fantasie' }
                ] as const).map(s => (
                  <button key={s.key} className={`tone-button ${localConfig.imageStyle === s.key ? 'active' : ''}`} onClick={() => set({ imageStyle: s.key })}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h2>Bildprompt-Modus</h2>
            <div className="setting-group">
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
                  onChange={e => set({ imagePrompt: e.target.value })}
                  rows={4}
                  placeholder="z.B.: Ein modernes Büro mit natürlichem Licht, diverse Teammitglieder bei einem Meeting, helle und positive Atmosphäre..."
                />
              )}
            </div>
          </div>

          <div className="settings-section">
            <h2>Fallback</h2>
            <div className="setting-hint" style={{ marginTop: 0 }}>
              Falls zu einem Produkt noch keine Bilder hinterlegt sind, generiert
              der Agent automatisch ein passendes Bild zum Thema und zur
              Produktbeschreibung mit Flux AI.
            </div>
          </div>
        </div>
      )}

      {/* ====== TAB 3: ZEITPLAN ====== */}
      {activeTab === 'schedule' && (
        <div className="settings-tab-content">
          <div className="settings-section">
            <h2>Posting-Frequenz</h2>
            <div className="setting-group">
              <div className="view-toggle" style={{ marginBottom: 12 }}>
                <button className={`view-toggle-btn ${localConfig.postFrequencyUnit === 'week' ? 'active' : ''}`} onClick={() => set({ postFrequencyUnit: 'week' })}>Pro Woche</button>
                <button className={`view-toggle-btn ${localConfig.postFrequencyUnit === 'day' ? 'active' : ''}`} onClick={() => set({ postFrequencyUnit: 'day' })}>Pro Tag</button>
              </div>
              <label>
                {localConfig.postFrequency} Posts pro {localConfig.postFrequencyUnit === 'week' ? 'Woche' : 'Tag'}
              </label>
              <input
                type="range"
                min="1"
                max={localConfig.postFrequencyUnit === 'week' ? 14 : 5}
                value={localConfig.postFrequency}
                onChange={e => set({ postFrequency: parseInt(e.target.value) })}
              />
              <p className="setting-hint">Der Agent hält immer 3 Posts in der Queue.</p>
            </div>
          </div>

          <div className="settings-section">
            <h2>Veröffentlichungszeitraum</h2>
            <div className="setting-group">
              <div className="time-inputs">
                <input type="time" value={localConfig.publishWindow.start} onChange={e => set({ publishWindow: { ...localConfig.publishWindow, start: e.target.value } })} />
                <span>bis</span>
                <input type="time" value={localConfig.publishWindow.end} onChange={e => set({ publishWindow: { ...localConfig.publishWindow, end: e.target.value } })} />
              </div>
              <p className="setting-hint">Posts werden zufällig in diesem Zeitfenster verteilt – wirkt natürlicher.</p>
            </div>
          </div>
        </div>
      )}

      <div className="settings-footer">
        <button className="save-button-large" onClick={handleSave}>💾 Einstellungen speichern</button>
      </div>
    </div>
  );
}
