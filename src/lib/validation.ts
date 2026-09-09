export const isEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

export const isPhone = (value: string) => /^\+?\d{10,15}$/.test(value.replace(/[\s()-]/g, ''));

export const normalisePhone = (value: string) => value.replace(/[\s()-]/g, '');

export function normaliseNigerianPhone(value: string) {
  const phone = normalisePhone(value);
  if (phone.startsWith('+234')) return phone;
  if (phone.startsWith('234')) return `+${phone}`;
  if (phone.startsWith('0')) return `+234${phone.slice(1)}`;
  return `+234${phone}`;
}

export function passwordError(value: string) {
  if (value.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Z]/.test(value)) return 'Add at least one uppercase letter.';
  if (!/[a-z]/.test(value)) return 'Add at least one lowercase letter.';
  if (!/\d/.test(value)) return 'Add at least one number.';
  return undefined;
}
