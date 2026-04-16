import { useState, useEffect, useRef } from 'react';
import { SupabaseService, supabase } from '../supabaseClient';
import type { Product, ProductImage, BusinessType } from '../types';

interface Props {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  nextProductId?: string | null;
  businessType?: BusinessType;
}

export default function ProductManager({ showToast, nextProductId, businessType = 'products' }: Props) {
  // Adaptive Labels je nach Business-Typ
  const entity = businessType === 'services' ? 'Dienstleistung' : businessType === 'mixed' ? 'Eintrag' : 'Produkt';
  const entityPlural = businessType === 'services' ? 'Dienstleistungen' : businessType === 'mixed' ? 'Einträge' : 'Produkte';
  const entityPlaceholder = businessType === 'services' ? 'z. B. Steildachsanierung' : businessType === 'mixed' ? 'z. B. Angebot …' : 'z. B. Omega-3 Kapseln';
  const entityDescPlaceholder = businessType === 'services'
    ? 'Umfang, Zielkunden, Besonderheiten …'
    : 'Kurzbeschreibung für den AI-Kontext…';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags]               = useState('');
  // Bei mixed waehlt der User pro Eintrag ob Produkt oder Dienstleistung.
  // Bei products/services ist der Typ implizit (wird beim Speichern gesetzt).
  const [entryType, setEntryType]     = useState<'product' | 'service'>('product');

  const [productImages, setProductImages] = useState<Record<string, ProductImage[]>>({});
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadImagesForProduct = async (productId: string) => {
    try {
      const images = await SupabaseService.getProductImages(productId);
      setProductImages(prev => ({ ...prev, [productId]: images }));
    } catch {
      showToast('Bilder konnten nicht geladen werden', 'error');
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      const data = await SupabaseService.getProducts();
      setProducts(data);
      // Bilder für alle Produkte parallel vorladen, damit der Foto-Counter korrekt angezeigt wird
      const imagesEntries = await Promise.all(
        data.map(async (p: Product) => {
          try {
            const imgs = await SupabaseService.getProductImages(p.id);
            return [p.id, imgs] as const;
          } catch {
            return [p.id, []] as const;
          }
        })
      );
      setProductImages(Object.fromEntries(imagesEntries));
    } catch { showToast(`${entityPlural} konnten nicht geladen werden`, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = (productId: string) => {
    if (expandedProduct === productId) {
      setExpandedProduct(null);
    } else {
      setExpandedProduct(productId);
      if (!productImages[productId]) {
        loadImagesForProduct(productId);
      }
    }
  };

  const resetForm = () => {
    setName(''); setDescription(''); setTags('');
    setEntryType(businessType === 'services' ? 'service' : 'product');
    setEditingId(null); setShowForm(false);
  };

  const startEdit = (p: Product) => {
    setName(p.name);
    setDescription(p.description || '');
    setTags((p.tags || []).join(', '));
    setEntryType(effectiveEntryType(p));
    setEditingId(p.id);
    setShowForm(true);
  };

  // Effektiver Typ eines Produkts: explizit gesetzt oder aus businessType abgeleitet.
  const effectiveEntryType = (p: Product): 'product' | 'service' =>
    p.entry_type ?? (businessType === 'services' ? 'service' : 'product');

  const handleSave = async () => {
    if (!name.trim()) { showToast(`${entity}sname ist erforderlich`, 'error'); return; }
    const payload: any = {
      name: name.trim(),
      description: description.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      // Nur bei mixed explizit speichern - sonst implizit aus businessType
      entry_type: businessType === 'mixed' ? entryType : null
    };
    try {
      if (editingId) {
        await SupabaseService.updateProduct(editingId, payload);
        showToast(`${entity} aktualisiert`, 'success');
      } else {
        await SupabaseService.createProduct(payload);
        showToast(`${entity} hinzugefuegt`, 'success');
      }
      resetForm();
      await load();
    } catch { showToast('Fehler beim Speichern', 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`${entity === 'Produkt' ? 'Dieses Produkt' : entity === 'Dienstleistung' ? 'Diese Dienstleistung' : 'Diesen Eintrag'} loeschen?`)) return;
    try {
      await SupabaseService.deleteProduct(id);
      showToast(`${entity} geloescht`, 'info');
      await load();
    } catch { showToast('Fehler beim Loeschen', 'error'); }
  };

  const handleImageUpload = async (productId: string, file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Nur JPG, PNG oder WebP erlaubt', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Maximale Dateigröße: 10 MB', 'error');
      return;
    }

    setUploadingFor(productId);
    try {
      const originalUrl = await SupabaseService.uploadProductImage(file);
      await SupabaseService.createProductImage({
        product_id: productId,
        original_url: originalUrl,
        mode: 'original',
        processing_status: 'done'
      });
      showToast('Bild hochgeladen!', 'success');
      await loadImagesForProduct(productId);
    } catch (err: any) {
      showToast(`Upload fehlgeschlagen: ${err.message}`, 'error');
    } finally {
      setUploadingFor(null);
    }
  };

  const handleDeleteImage = async (image: ProductImage) => {
    if (!window.confirm('Dieses Bild loeschen?')) return;
    try {
      const urlsToDelete = [image.original_url, image.processed_url].filter(Boolean) as string[];
      for (const url of urlsToDelete) {
        const path = url.split('/product-images/').pop();
        if (path) {
          await supabase.storage.from('product-images').remove([path]);
        }
      }
      await SupabaseService.deleteProductImage(image.id);
      showToast('Bild geloescht', 'info');
      await loadImagesForProduct(image.product_id);
    } catch {
      showToast('Fehler beim Loeschen', 'error');
    }
  };

  return (
    <div className="product-manager">
      {loading ? (
        <p className="pm-loading">Lade {entityPlural}...</p>
      ) : (
        <>
          {showForm ? (
            <div className="pm-form">
              {businessType === 'mixed' && (
                <div className="setting-group">
                  <label>Typ</label>
                  <div className="tone-buttons">
                    <button
                      type="button"
                      className={`tone-button ${entryType === 'product' ? 'active' : ''}`}
                      onClick={() => setEntryType('product')}
                    >
                      📦 Produkt
                    </button>
                    <button
                      type="button"
                      className={`tone-button ${entryType === 'service' ? 'active' : ''}`}
                      onClick={() => setEntryType('service')}
                    >
                      🔧 Dienstleistung
                    </button>
                  </div>
                </div>
              )}
              <div className="setting-group">
                <label>{businessType === 'mixed' ? (entryType === 'service' ? 'Dienstleistungs' : 'Produkt') + 'name *' : `${entity}sname *`}</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={businessType === 'mixed' ? (entryType === 'service' ? 'z. B. Steildachsanierung' : 'z. B. Omega-3 Kapseln') : entityPlaceholder} />
              </div>
              <div className="setting-group">
                <label>Beschreibung</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder={entityDescPlaceholder} className="setting-textarea" />
              </div>
              <div className="setting-group">
                <label>Tags (kommagetrennt)</label>
                <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="#omega3, #herzgesundheit" />
              </div>
              <div className="pm-form-actions">
                <button className="action-button secondary" onClick={resetForm}>Abbrechen</button>
                <button className="action-button primary" onClick={handleSave}>{editingId ? 'Aktualisieren' : 'Hinzufügen'}</button>
              </div>
            </div>
          ) : (
            <button className="pm-add-btn" onClick={() => setShowForm(true)}>+ {entity} hinzufügen</button>
          )}

          <div className="pm-list">
            {products.map(p => (
              <div key={p.id} className={`pm-item ${expandedProduct === p.id ? 'pm-item-expanded' : ''} ${nextProductId === p.id ? 'pm-item-next' : ''}`}>
                <div className="pm-item-header" onClick={() => toggleExpand(p.id)}>
                  <div className="pm-item-info">
                    <div className="pm-item-name">
                      {businessType === 'mixed' && (
                        <span className={`pm-type-badge pm-type-${effectiveEntryType(p)}`}>
                          {effectiveEntryType(p) === 'service' ? '🔧 Dienstleistung' : '📦 Produkt'}
                        </span>
                      )}
                      {p.name}
                      {nextProductId === p.id && <span className="post-type-next-badge">als nächstes dran</span>}
                    </div>
                    {p.description && <div className="pm-item-desc">{p.description}</div>}
                    {p.tags && p.tags.length > 0 && (
                      <div className="pm-item-tags">
                        {p.tags.map((t, i) => <span key={i} className="pm-tag">{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="pm-item-actions">
                    <button className="pm-btn edit" onClick={e => { e.stopPropagation(); startEdit(p); }}>✏️</button>
                    <button className="pm-btn delete" onClick={e => { e.stopPropagation(); handleDelete(p.id); }}>🗑️</button>
                    <button
                      className="product-expand-btn"
                      onClick={e => { e.stopPropagation(); toggleExpand(p.id); }}
                    >
                      {expandedProduct === p.id
                        ? '▲ Fotos ausblenden'
                        : `▼ Fotos anzeigen (${(productImages[p.id] || []).length})`}
                    </button>
                  </div>
                </div>

                {expandedProduct === p.id && (
                  <div className="pm-expanded-content">
                    <div className="pi-section">
                      <h4 className="pi-section-title">Bilder</h4>
                      <p className="pi-hint">Bilder werden unverändert in Posts verwendet. Bei mehreren Bildern rotiert der Agent automatisch.</p>
                      <div className="pi-grid">
                        {(productImages[p.id] || []).map(img => (
                          <div key={img.id} className="pi-card">
                            <div
                              className="pi-image-wrapper"
                              onClick={() => setLightboxUrl(img.original_url)}
                              style={{ cursor: 'zoom-in' }}
                            >
                              <img
                                src={img.original_url}
                                alt="Produktbild"
                                className="pi-image"
                              />
                            </div>
                            <div className="pi-card-actions">
                              <button className="pi-action-btn pi-action-delete" title="Loeschen" onClick={() => handleDeleteImage(img)}>
                                <span>🗑️</span><span className="pi-action-label">Loeschen</span>
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Upload-Kachel */}
                        <div
                          className="pi-card pi-upload-card"
                          onClick={() => !uploadingFor && fileInputRefs.current[p.id]?.click()}
                        >
                          {uploadingFor === p.id ? (
                            <span className="spin">🔄</span>
                          ) : (
                            <>
                              <span className="pi-upload-icon">+</span>
                              <span className="pi-upload-text">Bild hochladen</span>
                            </>
                          )}
                          <input
                            ref={el => { fileInputRefs.current[p.id] = el; }}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            style={{ display: 'none' }}
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(p.id, file);
                              e.target.value = '';
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="pm-info-box">
        <p>Der Agent wählt bei jedem neuen Post automatisch {entity === 'Dienstleistung' ? 'eine Dienstleistung' : entity === 'Eintrag' ? 'einen Eintrag' : 'ein Produkt'} aus und kombiniert {entity === 'Dienstleistung' ? 'sie' : 'es'} mit dem passenden Post-Typ. Bei mehreren Bildern rotiert er automatisch.</p>
      </div>

      {lightboxUrl && (
        <div className="pi-lightbox" onClick={() => setLightboxUrl(null)}>
          <button className="pi-lightbox-close" onClick={() => setLightboxUrl(null)}>✕</button>
          <img src={lightboxUrl} alt="Produktbild groß" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
