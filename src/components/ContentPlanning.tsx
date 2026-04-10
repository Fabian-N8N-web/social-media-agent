import { useState, useEffect } from 'react';
import { SupabaseService } from '../supabaseClient';
import { WEBHOOK_REGEN_TEXT, WEBHOOK_REGEN_IMAGE, WEBHOOK_TRIGGER_PLAN, WEBHOOK_PUBLISH_POST } from '../constants';
import PostPreviewModal from './PostPreviewModal';

export default function ContentPlanning({ showToast, onReload, botStatus, onToggleBot, generating, setGenerating }: { showToast: (msg: string, type: 'success' | 'error' | 'info') => void; onReload: () => void; botStatus: boolean; onToggleBot: () => void; generating: boolean; setGenerating: (v: boolean) => void }) {
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<Record<string, boolean>>({});
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
  const [viewMode, setViewMode] = useState<'cards' | 'calendar'>('cards');
  const [previewPost, setPreviewPost] = useState<any | null>(null);
  const [cardPage, setCardPage] = useState(0);

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
      const sorted = data.sort((a: any, b: any) => {
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

  const handleImageUpload = async (postId: string, file: File) => {
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
    showToast('Post wird generiert... Das kann 1-2 Minuten dauern.', 'info');
    try {
      const res = await fetch(WEBHOOK_TRIGGER_PLAN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual: true })
      });
      if (res.ok) {
        showToast('Generierung gestartet! Post erscheint in ca. 1-2 Minuten.', 'success');
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          const data = await SupabaseService.getScheduledPosts();
          if (data.length > scheduledPosts.length || attempts >= 8) {
            clearInterval(poll);
            const sorted = data.sort((a: any, b: any) => {
              const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Infinity;
              const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Infinity;
              return ta - tb;
            });
            setScheduledPosts(sorted);
            setGenerating(false);
            if (data.length > scheduledPosts.length) {
              showToast('Neuer Post generiert! 🎉', 'success');
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

  const anyRegenerating = Object.values(regenerating).some(Boolean);
  const emptySlots = Math.max(0, 3 - scheduledPosts.length);

  return (
    <div className="content-planning">
      <div className="planning-header">
        <div>
          <h1>Content-Planung</h1>
          <p className="planning-subtitle">Die nächsten 3 geplanten Posts – prüfe, bearbeite oder generiere neu.</p>
        </div>
        <div className="planning-header-actions">
          <div className="view-toggle">
            <button className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`} onClick={() => setViewMode('cards')}>📋 Kacheln</button>
            <button className={`view-toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`} onClick={() => setViewMode('calendar')}>📅 Kalender</button>
          </div>
          <button className="action-button secondary" onClick={loadScheduled} disabled={loading}>
            <span className={loading ? 'spin' : ''}>🔄</span> Aktualisieren
          </button>
        </div>
      </div>

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
      ) : viewMode === 'calendar' ? (
        <MiniCalendar
          posts={scheduledPosts}
          generating={generating}
          onGenerateForDate={async (date) => {
            setGenerating(true);
            showToast('Post wird für den gewählten Tag generiert...', 'info');
            try {
              const res = await fetch(WEBHOOK_TRIGGER_PLAN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ manual: true, scheduled_date: date })
              });
              if (res.ok) {
                showToast('Generierung gestartet! Post erscheint in ca. 1-2 Minuten.', 'success');
                let attempts = 0;
                const poll = setInterval(async () => {
                  attempts++;
                  const data = await SupabaseService.getScheduledPosts();
                  if (data.length > scheduledPosts.length || attempts >= 8) {
                    clearInterval(poll);
                    const sorted = data.slice(0, 20).sort((a: any, b: any) => {
                      const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Infinity;
                      const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Infinity;
                      return ta - tb;
                    });
                    setScheduledPosts(sorted);
                    setGenerating(false);
                    if (data.length > scheduledPosts.length) {
                      showToast('Post generiert! 🎉', 'success');
                    }
                    onReload();
                  }
                }, 15000);
              } else {
                showToast('Fehler beim Starten der Generierung', 'error');
                setGenerating(false);
              }
            } catch {
              showToast('Verbindungsfehler zum Agent', 'error');
              setGenerating(false);
            }
          }}
          onSelectPost={(postId) => {
            const idx = scheduledPosts.findIndex(p => p.id === postId);
            if (idx >= 0) setCardPage(Math.floor(idx / 3));
            setViewMode('cards');
          }}
        />
      ) : (
        <>
        {scheduledPosts.length > 3 && (
          <div className="card-pager">
            <button className="card-pager-btn" onClick={() => setCardPage(p => Math.max(0, p - 1))} disabled={cardPage === 0}>‹</button>
            <span className="card-pager-label">Posts {cardPage * 3 + 1}–{Math.min((cardPage + 1) * 3, scheduledPosts.length)} von {scheduledPosts.length}</span>
            <button className="card-pager-btn" onClick={() => setCardPage(p => Math.min(Math.ceil(scheduledPosts.length / 3) - 1, p + 1))} disabled={(cardPage + 1) * 3 >= scheduledPosts.length}>›</button>
          </div>
        )}
        <div className="planning-cards">
          {scheduledPosts.slice(cardPage * 3, cardPage * 3 + 3).map((post, idx) => (
            <div key={post.id} className="planning-card">
              <div className="pcard-header">
                <div className="pcard-number">#{cardPage * 3 + idx + 1}</div>
                <div className="pcard-schedule">
                  {post.post_type && (
                    <span className="pcard-post-type-badge">
                      {({ spotlight: '🔦', trend: '📰', knowledge: '🧠', story: '💬', tip: '💡' } as Record<string, string>)[post.post_type] || ''}{' '}
                      {({ spotlight: 'Spotlight', trend: 'Trend', knowledge: 'Wissen', story: 'Story', tip: 'Tipp' } as Record<string, string>)[post.post_type] || post.post_type}
                    </span>
                  )}
                  <span className={`pcard-countdown ${new Date(post.scheduled_at) < new Date() ? 'overdue' : ''}`}>
                    {post.scheduled_at ? getTimeUntil(post.scheduled_at) : 'Kein Datum'}
                  </span>
                  <span className={`platform-tag ${(post.platform || 'facebook').toLowerCase().includes('&') ? 'both' : (post.platform || 'facebook').toLowerCase()}`}>
                    {post.platform || 'Facebook'}
                  </span>
                </div>
              </div>

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

              {editingId !== post.id && (
                <div className="pcard-mid-actions">
                  <button
                    className="pcard-mid-btn"
                    onClick={() => regenerateImage(post.id)}
                    disabled={anyRegenerating || uploading[post.id]}
                  >
                    {regenerating[post.id + '_img'] ? <><span className="spin">🔄</span> Generiert...</> : '🎨 Neues Bild generieren'}
                  </button>
                  <button
                    className="pcard-mid-btn"
                    onClick={() => fileInputRefs[post.id]?.click()}
                    disabled={anyRegenerating || uploading[post.id]}
                  >
                    {uploading[post.id] ? <><span className="spin">🔄</span> Lädt hoch...</> : '📁 Eigenes Bild hochladen'}
                  </button>
                  <button
                    className="pcard-mid-btn"
                    onClick={() => regenerateText(post.id)}
                    disabled={anyRegenerating}
                  >
                    {regenerating[post.id + '_text'] ? <><span className="spin">🔄</span> Generiert...</> : '🤖 Neuen Text generieren'}
                  </button>
                  <button className="pcard-mid-btn" onClick={() => startEdit(post)}>
                    ✏️ Eigenen Text verfassen
                  </button>
                  <button className="pcard-mid-btn" onClick={() => setPreviewPost(post)}>
                    👁️ Vorschau
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

          {cardPage === 0 && Array.from({ length: emptySlots }).map((_, i) => (
            <div key={`empty-${i}`} className={`planning-card empty-card${generating && i > 0 ? ' locked' : ''}`}>
              <div className="empty-card-content">
                {generating && i === 0 ? (
                  <>
                    <div className="generating-spinner">
                      <div className="generating-ring"></div>
                    </div>
                    <h3>Post wird generiert...</h3>
                    <p>Der AI-Agent erstellt gerade Text und Bild. Das kann 1-2 Minuten dauern.</p>
                  </>
                ) : generating ? (
                  <>
                    <div className="empty-icon">🔒</div>
                    <h3>Warte auf Generierung...</h3>
                    <p>Ein Post wird gerade generiert. Dieser Slot ist erst danach verfügbar.</p>
                  </>
                ) : (
                  <>
                    <div className="empty-icon">⏳</div>
                    <h3>Kein Post geplant</h3>
                    <p>Klicke auf „Post generieren" um diesen Slot zu füllen.</p>
                    <button className="action-button primary" onClick={triggerPlanning}>
                      🚀 Post generieren
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      <div className="planning-info-box">
        <h3>💡 So funktioniert's</h3>
        <p>
          Klicke auf <strong>„Post generieren"</strong> um einen neuen Post mit AI-Text und AI-Bild zu erstellen.
          Es wird immer <strong>ein Post pro Klick</strong> generiert. Danach werden fällige Posts automatisch veröffentlicht.
          Du kannst jeden Post vorher prüfen und bei Bedarf Text oder Bild neu generieren lassen.
        </p>
        <p>
          Maximal 3 Posts können gleichzeitig in der Warteschlange sein.
          Sobald ein Post veröffentlicht wurde, wird ein Platz frei und du kannst einen neuen generieren.
        </p>
      </div>
      {previewPost && (
        <PostPreviewModal post={previewPost} onClose={() => setPreviewPost(null)} />
      )}
    </div>
  );
}

function MiniCalendar({ posts, generating, onGenerateForDate, onSelectPost }: {
  posts: any[];
  generating: boolean;
  onGenerateForDate: (date: string) => void;
  onSelectPost: (postId: string) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year       = currentMonth.getFullYear();
  const month      = currentMonth.getMonth();
  const firstDay   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const postsByDay: Record<number, any[]> = {};
  posts.forEach(p => {
    if (!p.scheduled_at) return;
    const d = new Date(p.scheduled_at);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!postsByDay[day]) postsByDay[day] = [];
      postsByDay[day].push(p);
    }
  });

  const prevMonth  = () => { setCurrentMonth(new Date(year, month - 1, 1)); setSelectedDay(null); };
  const nextMonth  = () => { setCurrentMonth(new Date(year, month + 1, 1)); setSelectedDay(null); };
  const monthName  = currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const offset     = firstDay === 0 ? 6 : firstDay - 1;

  const today = new Date();
  const isPast = (day: number) => {
    const d = new Date(year, month, day);
    d.setHours(23, 59, 59);
    return d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const selectedDayPosts = selectedDay ? (postsByDay[selectedDay] || []) : [];

  return (
    <div className="mini-calendar">
      <div className="cal-header">
        <button className="cal-nav" onClick={prevMonth}>‹</button>
        <span className="cal-month">{monthName}</span>
        <button className="cal-nav" onClick={nextMonth}>›</button>
      </div>
      <div className="cal-grid">
        {['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => (
          <div key={d} className="cal-weekday">{d}</div>
        ))}
        {Array(offset).fill(null).map((_, i) => (
          <div key={`e-${i}`} className="cal-day empty" />
        ))}
        {Array(daysInMonth).fill(null).map((_, i) => {
          const day      = i + 1;
          const dayPosts = postsByDay[day] || [];
          const isToday  = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
          const past     = isPast(day);
          const selected = selectedDay === day;
          return (
            <div
              key={day}
              className={`cal-day ${isToday ? 'today' : ''} ${dayPosts.length > 0 ? 'has-posts' : ''} ${selected ? 'selected' : ''} ${past ? 'past' : ''}`}
              onClick={() => !past && setSelectedDay(selected ? null : day)}
            >
              <span className="cal-day-num">{day}</span>
              {dayPosts.map((p, idx) => (
                <div key={idx} className="cal-post-dot" title={p.content?.substring(0, 60)}>
                  {new Date(p.scheduled_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {selectedDay && (
        <div className="cal-day-detail">
          <h3>{new Date(year, month, selectedDay).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}</h3>
          {selectedDayPosts.length > 0 ? (
            <div className="cal-day-posts">
              {selectedDayPosts.map((p, idx) => (
                <div key={idx} className="cal-day-post-item">
                  <div className="cal-day-post-time">
                    {new Date(p.scheduled_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                  </div>
                  <div className="cal-day-post-text">{p.content?.substring(0, 100)}{p.content?.length > 100 ? '...' : ''}</div>
                  <button className="action-button secondary cal-to-cards-btn" onClick={() => onSelectPost(p.id)}>
                    📋 Zur Kachel-Ansicht
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="cal-day-empty">Keine Posts an diesem Tag geplant.</p>
          )}
          <button
            className="action-button primary cal-generate-btn"
            onClick={() => {
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
              onGenerateForDate(dateStr);
            }}
            disabled={generating}
          >
            {generating ? <><span className="spin">🔄</span> Generiert...</> : <><span>🚀</span> Post für diesen Tag generieren</>}
          </button>
        </div>
      )}
    </div>
  );
}
