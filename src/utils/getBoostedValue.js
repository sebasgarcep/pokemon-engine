function getBoostedValue(key, boost, value) {
  const base = key === 'accuracy' ? 3 : 2;
  const num = Math.max(base, base + boost);
  const den = Math.max(base, base - boost);
  return Math.floor(value * num / den);
}

module.exports = getBoostedValue;
