/**
 * Company contact details. PLACEHOLDERS ONLY: replace every value below before going live.
 * Nothing else in the site hard-codes an address, phone number or email address.
 */
export const COMPANY = {
  name: 'Apex Logistics',
  address: '[Company address — replace before launch]',
  phone: '[+00 000 000 0000]',
  email: '[contact@your-domain.com]',
  supportEmail: '[support@your-domain.com]',
  hours: '[Business hours — replace before launch]',
} as const;
export const isPlaceholder = (value: string) => value.startsWith('[');
