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

export const getReliabilityBadge = (rating) => {
  if (rating >= 4.8) return { label: 'Top Chef', color: '#FFD700' };
  if (rating >= 4.5) return { label: 'Trusted', color: '#4CAF50' };
  if (rating >= 4.0) return { label: 'Good', color: '#2196F3' };
  return { label: 'New', color: '#9E9E9E' };
};