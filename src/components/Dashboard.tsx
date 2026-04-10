import { useMemo } from 'react';
import type { Config, Post } from '../types';
import StatCard from './StatCard';

export default function Dashboard({ config, posts, botStatus, onToggleBot }: { config: Config; posts: Post[]; botStatus: boolean; onToggleBot: () => void }) {
  const postedPosts = posts.filter(p => p.status === 'posted');
  const scheduledCount = posts.filter(p => p.status === 'scheduled').length;

  const groupedPosts = useMemo(() => {
    const groups: Record<string, { platforms: string[]; post: Post; totalLikes: number; totalComments: number; totalShares: number }> = {};
    postedPosts.forEach(p => {
      const key = (p.content || '').substring(0, 80).trim();
      if (!key) return;
      if (!groups[key]) {
        groups[key] = {
          platforms: [p.platform || 'Facebook'],
          post: p,
          totalLikes: p.engagement?.likes || 0,
          totalComments: p.engagement?.comments || 0,
          totalShares: p.engagement?.shares || 0
        };
      } else {
        const plat = p.platform || 'Facebook';
        if (!groups[key].platforms.includes(plat)) groups[key].platforms.push(plat);
        groups[key].totalLikes += p.engagement?.likes || 0;
        groups[key].totalComments += p.engagement?.comments || 0;
        groups[key].totalShares += p.engagement?.shares || 0;
        if (p.imageUrl && !groups[key].post.imageUrl) groups[key].post = p;
      }
    });
    return Object.values(groups).sort((a, b) =>
      new Date(b.post.timestamp).getTime() - new Date(a.post.timestamp).getTime()
    );
  }, [postedPosts]);

  const totalUnique = groupedPosts.length;
  const totalEngagement = groupedPosts.reduce((s, g) => s + g.totalLikes + g.totalComments + g.totalShares, 0);
  const avgEngagement = totalUnique > 0 ? Math.round(totalEngagement / totalUnique) : 0;

  const recentPosts = groupedPosts.slice(0, 6);

  return (
    <div className="dashboard">
      <div className="dashboard-header"><h1>Dashboard</h1></div>
      <div className="stats-grid">
        <StatCard title="Veröffentlicht" value={totalUnique} icon="📝" color="#3b82f6" />
        <StatCard title="Geplant" value={scheduledCount} icon="📅" color="#f59e0b" />
        <StatCard title="Ø Engagement" value={avgEngagement} icon="❤️" color="#ec4899" />
        <StatCard title="Frequenz" value={`${config.postFrequency}x/Woche`} icon="⏰" color="#10b981" />
      </div>

      <div className={`bot-control-panel ${botStatus ? '' : 'bot-inactive'}`}>
        <div className="bot-status-header">
          <h2>{botStatus ? '🟢 Agent aktiv' : '🔴 Agent deaktiviert'}</h2>
          <div className={`bot-toggle-button ${botStatus ? 'active' : ''}`} onClick={onToggleBot}>
            <div className="toggle-slider"></div>
            <span className="toggle-label">{botStatus ? 'AN' : 'AUS'}</span>
          </div>
        </div>
        <div className="bot-info">
          {botStatus ? (
            <p>Der Agent generiert automatisch {config.postFrequency}x pro Woche Posts und hält immer 3 geplante Posts bereit. Veröffentlichung zwischen {config.publishWindow.start} und {config.publishWindow.end} Uhr.</p>
          ) : (
            <p>Der Agent ist pausiert. Es werden keine neuen Posts generiert und keine geplanten Posts automatisch veröffentlicht. Manuelles Posten über „Jetzt posten" ist weiterhin möglich.</p>
          )}
        </div>
      </div>

      <div className="recent-posts">
        <h2>Letzte Posts</h2>
        <div className="posts-grid">
          {recentPosts.length > 0 ? recentPosts.map((group, idx) => (
            <div key={idx} className="post-card">
              <div className="post-header">
                <div className="post-platforms">
                  {group.platforms.map(p => <span key={p} className={`platform-tag ${p.toLowerCase().includes('&') ? 'both' : p.toLowerCase()}`}>{p}</span>)}
                </div>
                <span className="status-badge posted">✓ Gepostet</span>
              </div>
              {group.post.imageUrl && <img src={group.post.imageUrl} alt="Post" className="post-image" />}
              <div className="post-content">{group.post.content}</div>
              <div className="post-footer">
                <div className="post-date">{new Date(group.post.timestamp).toLocaleString('de-DE')}</div>
                <div className="post-engagement">
                  <span>❤️ {group.totalLikes}</span>
                  <span>💬 {group.totalComments}</span>
                  <span>🔄 {group.totalShares}</span>
                </div>
              </div>
            </div>
          )) : <p className="no-posts">Noch keine veröffentlichten Posts vorhanden.</p>}
        </div>
      </div>
    </div>
  );
}
