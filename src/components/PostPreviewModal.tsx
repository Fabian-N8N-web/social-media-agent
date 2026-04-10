interface Props {
  post: {
    content: string;
    image_url?: string;
    platform?: string;
    scheduled_at?: string;
  };
  onClose: () => void;
}

export default function PostPreviewModal({ post, onClose }: Props) {
  const plat          = (post.platform || '').toLowerCase();
  const showFacebook  = plat === '' || plat.includes('facebook') || plat.includes('&');
  const showInstagram = plat === '' || plat.includes('instagram') || plat.includes('&');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Post-Vorschau</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">

          {showFacebook && (
            <div className="preview-section">
              <span className="platform-tag facebook">Facebook</span>
              <div className="fb-mockup">
                <div className="fb-header">
                  <div className="fb-avatar">SM</div>
                  <div className="fb-meta">
                    <div className="fb-name">Social Agent</div>
                    <div className="fb-time">
                      {post.scheduled_at
                        ? new Date(post.scheduled_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : 'Jetzt'} · 🌐
                    </div>
                  </div>
                </div>
                <div className="fb-content">{post.content}</div>
                {post.image_url && <img src={post.image_url} alt="Post" className="fb-image" />}
                <div className="fb-reactions">
                  <span>👍 Gefällt mir</span>
                  <span>💬 Kommentieren</span>
                  <span>↗️ Teilen</span>
                </div>
              </div>
            </div>
          )}

          {showInstagram && (
            <div className="preview-section">
              <span className="platform-tag instagram">Instagram</span>
              <div className="ig-mockup">
                <div className="ig-header">
                  <div className="ig-avatar">SM</div>
                  <div className="ig-username">social_agent</div>
                </div>
                {post.image_url
                  ? <img src={post.image_url} alt="Post" className="ig-image" />
                  : <div className="ig-image-placeholder">🖼️ Kein Bild</div>
                }
                <div className="ig-actions"><span>🤍</span><span>💬</span><span>↗️</span></div>
                <div className="ig-caption">
                  <span className="ig-username-inline">social_agent</span> {post.content}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
