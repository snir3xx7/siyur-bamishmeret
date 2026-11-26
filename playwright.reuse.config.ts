import base from './playwright.config';
// הרצה על build קיים (בלי בנייה מחדש) – לשימוש מקומי כשהבנייה איטית
export default { ...base, webServer: { ...(base.webServer as object), command: 'node scripts/serve-subpath.mjs', reuseExistingServer: true } };
