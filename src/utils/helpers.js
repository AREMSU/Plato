// ── Password validation ────────────────────────────────────────────
// Rules: 8–16 chars, at least one uppercase, one lowercase, one digit,
//        one special character.
export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 16,
  checks: [
    { id: 'length',  label: '8–16 characters',          test: (p) => p.length >= 8 && p.length <= 16 },
    { id: 'upper',   label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
    { id: 'lower',   label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
    { id: 'digit',   label: 'One number (0-9)',           test: (p) => /\d/.test(p) },
    { id: 'special', label: 'One special character (!@#…)', test: (p) => /[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\\/~`]/.test(p) },
  ],
};

export const validatePassword = (password) => {
  const results = PASSWORD_RULES.checks.map(rule => ({
    ...rule,
    passed: rule.test(password),
  }));
  const passed = results.filter(r => r.passed).length;
  const allPassed = results.every(r => r.passed);
  return { results, passed, total: results.length, isValid: allPassed };
};

export const getPasswordStrength = (passed) => {
  if (passed <= 1) return { label: 'Very Weak', color: '#FF5252', width: '20%' };
  if (passed === 2) return { label: 'Weak',      color: '#FF9800', width: '40%' };
  if (passed === 3) return { label: 'Fair',      color: '#FFC107', width: '60%' };
  if (passed === 4) return { label: 'Strong',    color: '#8BC34A', width: '80%' };
  return              { label: 'Very Strong', color: '#4CAF50', width: '100%' };
};
// ──────────────────────────────────────────────────────────────────

export const formatCurrency = (amount) => {
  return `Rs. ${amount}`;
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (timeString) => {
  return timeString;
};

export const calculateCancellationFee = (totalAmount) => {
  return Math.round(totalAmount * 0.3);
};

export const getRefundAmount = (totalAmount) => {
  const fee = calculateCancellationFee(totalAmount);
  return totalAmount - fee;
};

export const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export const getDisplayName = (user) => {
  const name = (user?.name || '').trim();
  if (name) {
    return name.includes('@') ? name.split('@')[0] : name;
  }
  const email = (user?.email || '').trim();
  if (!email) return '';
  return email.split('@')[0] || '';
};

export const getReliabilityBadge = (rating) => {
  if (rating >= 4.5) return { label: 'Top Chef', color: '#FFD700' };
  if (rating >= 4.0) return { label: 'Trusted', color: '#4CAF50' };
  if (rating >= 3.0) return { label: 'Good', color: '#2196F3' };
  return { label: 'New', color: '#9E9E9E' };
};

export const isMealOwner = (user, meal) => {
  const userId = user?.id;
  if (userId == null || !meal) return false;
  const sellerId = meal.seller?.id ?? meal.sellerId ?? meal.seller_id ?? meal.seller;
  return String(sellerId) === String(userId);
};