/**
 * Admin configuration (Math Lab tutor management, hardcoded admin checks).
 * Matches brhs; extended with Code4Community admin email.
 */

export const ADMIN_CONFIG = {
  ADMIN_EMAILS: ["1021676@lcps.org", "shail40926@gmail.com"],
  PERMISSIONS: {
    MANAGE_TUTORS: "manage_tutors",
    VIEW_ALL_SESSIONS: "view_all_sessions",
    MANAGE_USERS: "manage_users",
  },
};

/** @param {string | null | undefined} email */
export const isAdminEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  return ADMIN_CONFIG.ADMIN_EMAILS.includes(email);
};

export const getAdminConfig = () => ADMIN_CONFIG;
