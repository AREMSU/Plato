export const formatCurrency = (amount) => `Rs. ${Number(amount || 0).toLocaleString()}`;

export const timeAgo = (dateStr) => {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const COLORS = {
  bg: '#0a0a0f',
  bgCard: '#16161f',
  bgCardHover: '#1e1e2a',
  bgGlass: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.08)',
  text: '#f0f0f5',
  textSecondary: '#8b8b9e',
  textMuted: '#55556a',
  accent: '#FF6B35',
  accentLight: '#ff8a5c',
  accentGlow: 'rgba(255,107,53,0.2)',
  success: '#22c55e',
  successBg: 'rgba(34,197,94,0.12)',
  danger: '#ef4444',
  dangerBg: 'rgba(239,68,68,0.12)',
  warning: '#f59e0b',
  warningBg: 'rgba(245,158,11,0.12)',
  info: '#3b82f6',
  infoBg: 'rgba(59,130,246,0.12)',
  purple: '#a855f7',
  purpleBg: 'rgba(168,85,247,0.12)',
};
