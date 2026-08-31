import crypto from 'crypto';

export const generateOrderCode = (): string => {
  // Generates something like "LN-8842-A3B9" or similar
  const prefix = 'LN';
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 chars
  return `${prefix}-${randomPart.slice(0, 4)}-${randomPart.slice(4)}`;
};
