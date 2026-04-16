import { useState } from 'react';
import { SupabaseService } from '../supabaseClient';
import { WEBHOOK_SCRAPE, WEBHOOK_GENERATE_STYLE } from '../constants';
import type { Config, BusinessType } from '../types';

interface Props {
  config: Config;
  onComplete: () => Promise<void> | void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

type StepId = 1 | 2 | 3 | 4;
const TOTAL_STEPS = 4;

const buildPostTypes = (businessType: BusinessType) => {
  const spotlightName = businessType === 'services'
    ? 'Dienstleistungs-Spotlight'
    : businessType === 'mixed'
      ? 'Produkt- / Dienstleistungs-Spotlight'
      : 'Produkt-Spotlight';
  const spotlightDesc = businessType === 'services'
    ? 'Vorstellung einer Dienstleistung mit Mehrwert'
    : businessType === 'mixed'
      ? 'Vorstellung eines Angebots (Produkt oder Dienstleistung) mit Mehrwert'
      : 'Vorstellung eines Produkts mit Mehrwert';
  return [
    { key: 'spotlight', icon: '🔦', name: spotlightName,       desc: spotlightDesc },
    { key: 'trend',     icon: '📰', name: 'Trend & News',      desc: 'Aktuelles aus der Branche' },
    { key: 'knowledge', icon: '🧠', name: 'Wissens-Post',      desc: 'Inhaltsstoffe, Hintergründe, Herstellung' },
    { key: 'story',     icon: '💬', name: 'Story / Testimonial', desc: 'Gründergeschichte oder Kundenstimme' },
    { key: 'tip',       icon: '💡', name: 'Tipp & Tutorial',   desc: 'Konkreter Mehrwert, fördert Saves & Shares' },
  ];
};

export default function OnboardingWizard({ config, onComplete, showToast }: Props) {
  const [step, setStep] = useState<StepId>(1);

  // Step 1 – Unternehmen
  const [businessType, setBusinessType] = useState<BusinessType>(config.businessType || 'products');
  const [industry, setIndustry] = useState(config.industry || '');
  const [topic, setTopic] = useState(config.topic && config.topic !== 'Business & Erfolg' ? config.topic : '');
  const [brandKeywords, setBrandKeywords] = useState(config.brandKeywords || '');

  // Step 2 – Website
  const [websiteUrl, setWebsiteUrl] = useState(config.websiteUrl || '');
  const [brandContext, setBrandContext] = useState(config.brandContext || '');
  const [brandContextUpdatedAt, setBrandContextUpdatedAt] = useState(config.brandContextUpdatedAt || '');
  const [scraping, setScraping] = useState(false);

  // Step 3 – Erstes Produkt
  const [addProductLater, setAddProductLater] = useState(false);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productImageLater, setProductImageLater] = useState(true);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);

  // Step 4 – Content-Varianten
  const [enabledPostTypes, setEnabledPostTypes] = useState<string[]>(
    config.enabledPostTypes?.length ? config.enabledPostTypes : ['trend', 'knowledge', 'story', 'tip', 'spotlight']
  );

  // Finish
  const [finishing, setFinishing] = useState(false);
  const [finishProgress, setFinishProgress] = useState(0);
  const [finishStatus, setFinishStatus] = useState('');

  const scrapeWebsite = async () => {
    if (!websiteUrl.trim()) { showToast('Bitte URL eingeben', 'error'); return; }
    setScraping(true);
    try {
      const res = await fetch(WEBHOOK_SCRAPE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl, userId: 'admin' })
      });
      const data = await res.json();
      if (data.success && data.brand_context) {
        setBrandContext(data.brand_context);
        setBrandContextUpdatedAt(new Date().toISOString());
        showToast('Website erfolgreich ausgelesen!', 'success');
      } else {
        showToast('Scraping fehlgeschlagen', 'error');
      }
    } catch {
      showToast('Verbindungsfehler beim Scraping', 'error');
    } finally {
      setScraping(false);
    }
  };

  const togglePostType = (key: string) => {
    setEnabledPostTypes(prev => {
      if (prev.includes(key) && prev.length > 1) return prev.filter(k => k !== key);
      if (!prev.includes(key)) return [...prev, key];
      return prev;
    });
  };

  // Schreibt alle Daten aus dem Wizard + ruft N8N → setup_completed = true
  const finish = async (skip = false) => {
    setFinishing(true);
    try {
      // 1) Config speichern (Schritt-Daten)
      setFinishStatus('Speichere Unternehmensdaten …');
      setFinishProgress(15);
      const cfgPatch: Record<string, unknown> = { user_id: 'admin' };
      if (!skip) {
        cfgPatch.business_type = businessType;
        cfgPatch.industry = industry.trim();
        cfgPatch.topic = topic || config.topic;
        cfgPatch.brand_keywords = brandKeywords;
        cfgPatch.website_url = websiteUrl;
        if (brandContext) {
          cfgPatch.brand_context = brandContext;
          cfgPatch.brand_context_updated_at = brandContextUpdatedAt || new Date().toISOString();
        }
        cfgPatch.enabled_post_types = enabledPostTypes;
        // Sinnvolle Defaults – können nachträglich in den Einstellungen angepasst werden
        cfgPatch.text_length = 50;              // Mittel
        cfgPatch.post_frequency = 1;            // 1 Post pro Tag
        cfgPatch.post_frequency_unit = 'day';
        cfgPatch.publish_platform = 'both';     // Facebook & Instagram
      }
      await SupabaseService.updateConfig(cfgPatch);

      // 2) Produkt anlegen (optional)
      if (!skip && !addProductLater && productName.trim()) {
        setFinishStatus('Lege Produkt an …');
        setFinishProgress(35);
        const product = await SupabaseService.createProduct({
          name: productName.trim(),
          description: productDescription.trim() || undefined,
        });
        if (!productImageLater && productImageFile) {
          setFinishStatus('Lade Produktbild hoch …');
          setFinishProgress(45);
          try {
            const url = await SupabaseService.uploadProductImage(productImageFile);
            await SupabaseService.createProductImage({
              product_id: product.id,
              original_url: url,
              mode: 'original',
              processing_status: 'done',
            });
          } catch (e) {
            console.warn('Produktbild-Upload fehlgeschlagen:', e);
          }
        }
      }

      // 3) Stiloptionen per KI generieren
      setFinishStatus('KI analysiert dein Business …');
      setFinishProgress(60);
      try {
        const res = await fetch(WEBHOOK_GENERATE_STYLE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'admin' })
        });
        if (res.ok) {
          // Webhook schreibt idealerweise direkt in config; Response optional
          await res.json().catch(() => null);
        } else {
          console.warn('Style-Webhook nicht erreichbar:', res.status);
        }
      } catch (e) {
        // Webhook darf fehlen – Setup trotzdem abschließen
        console.warn('Style-Webhook Fehler:', e);
      }

      // 4) setup_completed = true
      setFinishStatus('Schließe Setup ab …');
      setFinishProgress(90);
      await SupabaseService.updateConfig({ setup_completed: true });

      setFinishProgress(100);
      setFinishStatus('Fertig!');
      showToast(skip ? 'Setup übersprungen' : 'Setup abgeschlossen', 'success');

      // Kurz stehen lassen, damit User den 100%-Balken sieht
      setTimeout(() => { onComplete(); }, 400);
    } catch (e) {
      console.error(e);
      showToast('Fehler beim Abschluss des Setups', 'error');
      setFinishing(false);
      setFinishProgress(0);
    }
  };

  const canNextStep1 = topic.trim().length > 0 && industry.trim().length > 0;
  const canNextStep4 = enabledPostTypes.length > 0;

  // Adaptive Labels je nach Business-Typ
  const entity = businessType === 'services' ? 'Dienstleistung' : businessType === 'mixed' ? 'Angebot' : 'Produkt';
  const entityPlural = businessType === 'services' ? 'Dienstleistungen' : businessType === 'mixed' ? 'Angebote' : 'Produkte';
  const entityStepLabel = businessType === 'services' ? 'Erste Dienstleistung' : businessType === 'mixed' ? 'Erstes Angebot' : 'Erstes Produkt';
  const entityPlaceholder = businessType === 'services' ? 'z. B. Steildachsanierung' : businessType === 'mixed' ? 'z. B. Dachdeckerei-Leistung …' : 'z. B. Menopause-Komplex';
  const entityDescPlaceholder = businessType === 'services'
    ? 'Was umfasst die Dienstleistung, für wen ist sie, Besonderheiten …'
    : 'Was macht das Produkt, für wen ist es, welche Inhaltsstoffe / Besonderheiten …';

  // ============ RENDER ============
  if (finishing) {
    return (
      <div className="wizard-overlay">
        <div className="wizard-container wizard-finishing">
          <div className="wizard-finish-icon">✨</div>
          <h2>Dein Social-Media-Agent wird eingerichtet</h2>
          <p className="wizard-finish-status">{finishStatus}</p>
          <div className="wizard-progress-bar wizard-progress-bar-large">
            <div className="wizard-progress-fill" style={{ width: `${finishProgress}%` }} />
          </div>
          <p className="setting-hint" style={{ textAlign: 'center' }}>
            Das kann einen Moment dauern – die KI wählt gerade passende Stiloptionen für dein Business.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-overlay">
      <div className="wizard-container">
        <div className="wizard-header">
          <div>
            <h1>Willkommen beim Social-Media-Agent</h1>
            <p className="section-subtitle" style={{ margin: 0 }}>Richte in {TOTAL_STEPS} Schritten dein Business ein – danach generiert die KI passende Stiloptionen.</p>
          </div>
          <button className="wizard-skip-btn" onClick={() => finish(true)}>Überspringen</button>
        </div>

        <div className="wizard-progress">
          <div className="wizard-progress-bar">
            <div className="wizard-progress-fill" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
          <div className="wizard-steps">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className={`wizard-step-indicator ${step === n ? 'active' : ''} ${step > n ? 'done' : ''}`}>
                <span className="wizard-step-number">{n}</span>
                <span className="wizard-step-label">
                  {n === 1 ? 'Unternehmen' : n === 2 ? 'Website' : n === 3 ? entityStepLabel : 'Content-Varianten'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="wizard-body">
          {step === 1 && (
            <div className="settings-section">
              <h2>Über dein Unternehmen</h2>
              <p className="section-subtitle">Beschreibe kurz, was du anbietest und für wen. Diese Infos sind die Grundlage für alle späteren KI-Vorschläge und Bild-Generierungen.</p>

              <div className="setting-group">
                <label>Business-Typ *</label>
                <div className="tone-buttons">
                  {([
                    { key: 'products', label: '📦 Produkte' },
                    { key: 'services', label: '🔧 Dienstleistungen' },
                    { key: 'mixed',    label: '🔀 Beides' },
                  ] as const).map(b => (
                    <button
                      key={b.key}
                      className={`tone-button ${businessType === b.key ? 'active' : ''}`}
                      onClick={() => setBusinessType(b.key)}
                      type="button"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-group">
                <label>Branche *</label>
                <input
                  type="text"
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  placeholder="z. B. Dachdeckerei & Fertighausbau, Nahrungsergänzung, Gastronomie, IT-Beratung …"
                />
                <p className="setting-hint">Wichtig für die Bilder: Bei Handwerk wählt die KI automatisch passende Arbeitskleidung und Sicherheitsausrüstung.</p>
              </div>

              <div className="setting-group">
                <label>Unternehmen &amp; {businessType === 'services' ? 'Dienstleistungen' : businessType === 'mixed' ? 'Angebot' : 'Produkte'} *</label>
                <textarea
                  className="setting-textarea"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  rows={5}
                  placeholder={
                    businessType === 'services'
                      ? 'Wir sind … Unsere Leistungen … Unsere Kunden …'
                      : businessType === 'mixed'
                        ? 'Wir sind … Unser Angebot … Unsere Zielgruppe …'
                        : 'Wir sind … Unsere Produkte … Unsere Zielgruppe …'
                  }
                />
              </div>

              <div className="setting-group">
                <label>USPs &amp; Besonderheiten (optional)</label>
                <textarea
                  className="setting-textarea"
                  value={brandKeywords}
                  onChange={e => setBrandKeywords(e.target.value)}
                  rows={3}
                  placeholder="made in Germany, Meisterbetrieb, 30 Jahre Expertise …"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="settings-section">
              <h2>Website auslesen</h2>
              <p className="section-subtitle">Optional: Wir lesen deine Website aus, damit die KI deinen Tonfall, Claims und Produkte kennt.</p>

              <div className="setting-group">
                <label>Website-URL</label>
                <div className="scrape-row">
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={e => setWebsiteUrl(e.target.value)}
                    placeholder="https://www.example.com"
                    disabled={scraping}
                  />
                  <button className="action-button primary wizard-scrape-btn" onClick={scrapeWebsite} disabled={scraping || !websiteUrl.trim()}>
                    {scraping ? <><span className="spin">🔄</span> Liest …</> : '🔍 Auslesen'}
                  </button>
                </div>

                {scraping && (
                  <div className="scrape-loading-info">
                    <span className="spin">⏳</span>
                    <div>
                      <strong>Einen Moment bitte …</strong>
                      <p>Deine Website wird ausgelesen und zusammengefasst. Das kann bis zu einer Minute dauern – bitte nicht abbrechen und auch nicht mehrfach klicken.</p>
                    </div>
                  </div>
                )}

                {brandContext && (
                  <div className="scrape-result">
                    <div className="scrape-result-header">
                      <span>✓ Kontext vorhanden · {brandContext.length} Zeichen</span>
                      {brandContextUpdatedAt && (
                        <span> · Zuletzt: {new Date(brandContextUpdatedAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                    <div className="scrape-actions">
                      <details className="scrape-details">
                        <summary>Zusammenfassung anzeigen</summary>
                        <p className="scrape-context-text">{brandContext}</p>
                      </details>
                    </div>
                  </div>
                )}
              </div>
              <p className="setting-hint">Kein Problem, wenn du keine Website hast – einfach leer lassen und weiter.</p>
            </div>
          )}

          {step === 3 && (
            <div className="settings-section">
              <h2>{entityStepLabel}</h2>
              <p className="section-subtitle">Lege optional {businessType === 'services' ? 'deine erste Dienstleistung' : businessType === 'mixed' ? 'dein erstes Angebot' : 'dein erstes Produkt'} an. Kann auch jederzeit in den Einstellungen ergänzt werden.</p>

              <div className="setting-group">
                <div className="wizard-toggle-row" onClick={() => setAddProductLater(v => !v)}>
                  <div>
                    <div className="style-option-name">{entityPlural} später anlegen</div>
                    <div className="style-option-desc">Du kannst {entityPlural} jederzeit in den Einstellungen hinzufügen.</div>
                  </div>
                  <div className={`post-type-toggle ${addProductLater ? 'active' : ''}`}><div className="post-type-toggle-dot" /></div>
                </div>
              </div>

              {!addProductLater && (
                <>
                  <div className="setting-group">
                    <label>{entity}sname</label>
                    <input
                      type="text"
                      value={productName}
                      onChange={e => setProductName(e.target.value)}
                      placeholder={entityPlaceholder}
                    />
                  </div>

                  <div className="setting-group">
                    <label>Kurzbeschreibung</label>
                    <textarea
                      className="setting-textarea"
                      value={productDescription}
                      onChange={e => setProductDescription(e.target.value)}
                      rows={3}
                      placeholder={entityDescPlaceholder}
                    />
                  </div>

                  <div className="setting-group">
                    <div className="wizard-toggle-row" onClick={() => setProductImageLater(v => !v)}>
                      <div>
                        <div className="style-option-name">Bilder später hinzufügen</div>
                        <div className="style-option-desc">Du kannst Bilder jederzeit im Portfolio hochladen.</div>
                      </div>
                      <div className={`post-type-toggle ${productImageLater ? 'active' : ''}`}><div className="post-type-toggle-dot" /></div>
                    </div>
                  </div>

                  {!productImageLater && (
                    <div className="setting-group">
                      <label>Bild (optional)</label>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={e => setProductImageFile(e.target.files?.[0] || null)}
                      />
                      {productImageFile && (
                        <p className="setting-hint">Ausgewählt: {productImageFile.name}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="settings-section">
              <h2>Content-Varianten</h2>
              <p className="section-subtitle">Welche Post-Typen soll der Agent erzeugen? Er rotiert automatisch zwischen den aktivierten Varianten.</p>

              <div className="post-types-grid">
                {buildPostTypes(businessType).map(pt => (
                  <div
                    key={pt.key}
                    className={`post-type-card ${enabledPostTypes.includes(pt.key) ? '' : 'post-type-disabled'}`}
                    onClick={() => togglePostType(pt.key)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="post-type-icon">{pt.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div className="post-type-name">{pt.name}</div>
                      <div className="post-type-desc">{pt.desc}</div>
                    </div>
                    <div className={`post-type-toggle ${enabledPostTypes.includes(pt.key) ? 'active' : ''}`}>
                      <div className="post-type-toggle-dot" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="wizard-footer">
          <button
            className="action-button secondary"
            onClick={() => setStep(s => Math.max(1, (s - 1)) as StepId)}
            disabled={step === 1}
          >
            ← Zurück
          </button>

          {step < TOTAL_STEPS ? (
            <button
              className="save-button-large"
              onClick={() => setStep(s => (s + 1) as StepId)}
              disabled={(step === 1 && !canNextStep1)}
            >
              Weiter →
            </button>
          ) : (
            <button
              className="save-button-large"
              onClick={() => finish(false)}
              disabled={!canNextStep4}
            >
              ✨ Setup abschließen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
