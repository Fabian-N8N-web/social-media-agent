import { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import type { Post } from '../types';
import { CHART_COLORS, WEEKDAYS, WEEKDAYS_SHORT, WEBHOOK_ENGAGEMENT } from '../constants';
import StatCard from './StatCard';

export default function Analytics({ posts, showToast, onReload }: { posts: Post[]; showToast: (msg: string, type: 'success' | 'error' | 'info') => void; onReload: () => void }) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('all');
  const [trackingEngagement, setTrackingEngagement] = useState(false);
  const postedPosts = posts.filter(p => p.status === 'posted');

  const triggerEngagement = async () => {
    setTrackingEngagement(true);
    try {
      const res = await fetch(WEBHOOK_ENGAGEMENT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual: true })
      });
      if (res.ok) {
        showToast('Engagement-Daten werden aktualisiert...', 'success');
        setTimeout(() => { onReload(); setTrackingEngagement(false); }, 5000);
      } else {
        showToast('Fehler beim Engagement-Tracking', 'error');
        setTrackingEngagement(false);
      }
    } catch {
      showToast('Verbindungsfehler', 'error');
      setTrackingEngagement(false);
    }
  };

  const filteredPosts = useMemo(() => {
    if (timeRange === 'all') return postedPosts;
    const days = timeRange === '7d' ? 7 : 30;
    const cutoff = new Date(Date.now() - days * 86400000);
    return postedPosts.filter(p => new Date(p.timestamp) >= cutoff);
  }, [postedPosts, timeRange]);

  const totalLikes = filteredPosts.reduce((s, p) => s + (p.engagement?.likes || 0), 0);
  const totalComments = filteredPosts.reduce((s, p) => s + (p.engagement?.comments || 0), 0);
  const totalShares = filteredPosts.reduce((s, p) => s + (p.engagement?.shares || 0), 0);
  const totalEngagement = totalLikes + totalComments + totalShares;
  const avgEngagement = filteredPosts.length > 0 ? Math.round(totalEngagement / filteredPosts.length) : 0;

  const engagementOverTime = useMemo(() => {
    const grouped: Record<string, any> = {};
    filteredPosts.forEach(p => {
      const date = new Date(p.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      if (!grouped[date]) grouped[date] = { date, likes: 0, comments: 0, shares: 0 };
      grouped[date].likes += p.engagement?.likes || 0;
      grouped[date].comments += p.engagement?.comments || 0;
      grouped[date].shares += p.engagement?.shares || 0;
    });
    return Object.values(grouped).reverse();
  }, [filteredPosts]);

  const platformData = useMemo(() => {
    const platforms: Record<string, any> = {};
    filteredPosts.forEach(p => {
      const name = p.platform || 'Unbekannt';
      if (!platforms[name]) platforms[name] = { name, posts: 0, likes: 0, comments: 0, shares: 0 };
      platforms[name].posts += 1;
      platforms[name].likes += p.engagement?.likes || 0;
      platforms[name].comments += p.engagement?.comments || 0;
      platforms[name].shares += p.engagement?.shares || 0;
    });
    return Object.values(platforms);
  }, [filteredPosts]);

  const platformPieData = platformData.map(p => ({ name: p.name, value: p.posts }));

  const bestPosts = useMemo(() => {
    return [...filteredPosts]
      .map(p => ({ ...p, totalEngagement: (p.engagement?.likes || 0) + (p.engagement?.comments || 0) + (p.engagement?.shares || 0) }))
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, 5);
  }, [filteredPosts]);

  const weekdayData = useMemo(() => {
    const days = Array(7).fill(null).map((_, i) => ({ day: WEEKDAYS_SHORT[i], dayFull: WEEKDAYS[i], posts: 0, engagement: 0 }));
    filteredPosts.forEach(p => {
      const idx = new Date(p.timestamp).getDay();
      days[idx].posts += 1;
      days[idx].engagement += (p.engagement?.likes || 0) + (p.engagement?.comments || 0) + (p.engagement?.shares || 0);
    });
    return [...days.slice(1), days[0]];
  }, [filteredPosts]);

  const PIE_COLORS = [CHART_COLORS.facebook, CHART_COLORS.instagram, CHART_COLORS.primary, CHART_COLORS.warning];

  if (postedPosts.length === 0) {
    return <div className="analytics"><h1>Analytics</h1><p className="info-text">Noch keine Daten vorhanden.</p></div>;
  }

  return (
    <div className="analytics">
      <div className="analytics-header">
        <h1>Analytics</h1>
        <div className="analytics-header-actions">
          <div className="time-range-buttons">
            {([['7d', '7 Tage'], ['30d', '30 Tage'], ['all', 'Gesamt']] as const).map(([val, label]) => (
              <button key={val} className={`time-range-btn ${timeRange === val ? 'active' : ''}`} onClick={() => setTimeRange(val)}>{label}</button>
            ))}
          </div>
          <button className="action-button secondary" onClick={triggerEngagement} disabled={trackingEngagement}>
            {trackingEngagement ? <><span className="spin">🔄</span> Lädt...</> : <><span>📊</span> Engagement aktualisieren</>}
          </button>
        </div>
      </div>
      <div className="stats-grid">
        <StatCard title="Likes" value={totalLikes} icon="❤️" color={CHART_COLORS.likes} />
        <StatCard title="Kommentare" value={totalComments} icon="💬" color={CHART_COLORS.comments} />
        <StatCard title="Shares" value={totalShares} icon="🔄" color={CHART_COLORS.shares} />
        <StatCard title="Ø Engagement" value={avgEngagement} icon="📊" color={CHART_COLORS.primary} />
      </div>
      <div className="analytics-grid">
        <div className="analytics-card full-width">
          <h2>Engagement über Zeit</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Line type="monotone" dataKey="likes" stroke={CHART_COLORS.likes} strokeWidth={2} dot={{ r: 4 }} name="Likes" />
                <Line type="monotone" dataKey="comments" stroke={CHART_COLORS.comments} strokeWidth={2} dot={{ r: 4 }} name="Kommentare" />
                <Line type="monotone" dataKey="shares" stroke={CHART_COLORS.shares} strokeWidth={2} dot={{ r: 4 }} name="Shares" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="analytics-card">
          <h2>Plattform-Engagement</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={platformData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Bar dataKey="likes" fill={CHART_COLORS.likes} name="Likes" radius={[4, 4, 0, 0]} />
                <Bar dataKey="comments" fill={CHART_COLORS.comments} name="Kommentare" radius={[4, 4, 0, 0]} />
                <Bar dataKey="shares" fill={CHART_COLORS.shares} name="Shares" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="analytics-card">
          <h2>Posts nach Plattform</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={platformPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {platformPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="analytics-card">
          <h2>Aktivität pro Wochentag</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weekdayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip formatter={(val: any, name: any) => [val, name === 'posts' ? 'Posts' : 'Engagement']} labelFormatter={(l: any) => weekdayData.find(d => d.day === String(l))?.dayFull || String(l)} />
                <Bar dataKey="posts" fill={CHART_COLORS.primary} name="Posts" radius={[4, 4, 0, 0]} />
                <Bar dataKey="engagement" fill={CHART_COLORS.warning} name="Engagement" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="analytics-card full-width">
          <h2>Top 5 Posts nach Engagement</h2>
          <div className="best-posts-list">
            {bestPosts.map((post, idx) => (
              <div key={idx} className="best-post-item">
                <div className="best-post-rank">#{idx + 1}</div>
                <div className="best-post-content">
                  <div className="best-post-platform">
                    <span className={`platform-tag ${(post.platform || 'facebook').toLowerCase().includes('&') ? 'both' : (post.platform || 'facebook').toLowerCase()}`}>{post.platform || 'Facebook'}</span>
                    <span className="best-post-date">{new Date(post.timestamp).toLocaleDateString('de-DE')}</span>
                  </div>
                  <p className="best-post-text">{post.content}</p>
                </div>
                <div className="best-post-stats">
                  <span className="bp-stat likes">❤️ {post.engagement?.likes || 0}</span>
                  <span className="bp-stat comments">💬 {post.engagement?.comments || 0}</span>
                  <span className="bp-stat shares">🔄 {post.engagement?.shares || 0}</span>
                  <span className="bp-stat total">Σ {post.totalEngagement}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
