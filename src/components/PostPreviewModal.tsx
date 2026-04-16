function parsePostContent(content: string | undefined): string {
  if (!content) return '';
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  if (cleaned.startsWith('{') && cleaned.includes('"text"')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.text) return parsed.text;
    } catch {
      const m = cleaned.match(/"text"\s*:\s*"([\s\S]+?)"\s*,\s*"image_concept"\s*:\s*"/);
      if (m) return m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
  }
  return content;
}

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
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container modal-container-preview" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Post-Vorschau</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body modal-body-preview">
          <div className="preview-section">
            <span className="platform-tag facebook">Facebook</span>
            <div className="fb-mockup fb-mockup-large">
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
              <div className="fb-content">{parsePostContent(post.content)}</div>
              {post.image_url && <img src={post.image_url} alt="Post" className="fb-image" />}
              <div className="fb-reactions">
                <span>👍 Gefällt mir</span>
                <span>💬 Kommentieren</span>
                <span>↗️ Teilen</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
