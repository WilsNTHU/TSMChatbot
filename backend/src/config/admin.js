export const ADMIN_EMAILS = ["henrychiu412@gmail.com"];

export function isAdminUser(email) {
  return ADMIN_EMAILS.includes(email);
}
