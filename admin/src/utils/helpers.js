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
  bg: '#F5F7FA',              // Warm light gray background
  bgCard: '#FFFFFF',          // Clean white for cards
  bgCardHover: '#FAFCFF',
  bgGlass: 'rgba(255,255,255,0.9)',
  border: '#E2E8F0',          // Soft light gray border
  text: '#1F2937',            // Dark charcoal text
  textSecondary: '#4B5563',   // Medium slate text
  textMuted: '#9CA3AF',       // Soft gray text
  accent: '#FF6B35',          // Signature Plato Orange
  accentLight: '#FF8C42',     // Signature Plato Orange Light
  accentGlow: 'rgba(255,107,53,0.08)',
  success: '#10B981',         // Green
  successBg: '#E6F4EA',       // Soft green bg
  danger: '#EF4444',          // Red
  dangerBg: '#FCE8E6',        // Soft red bg
  warning: '#F59E0B',         // Yellow
  warningBg: '#FEF3C7',       // Soft yellow bg
  info: '#3B82F6',            // Blue
  infoBg: '#E8F0FE',          // Soft blue bg
  purple: '#8B5CF6',          // Purple
  purpleBg: '#F3E8FF',        // Soft purple bg
};
