export const environment = {
  // Use same-origin API base in production; rely on reverse proxy (e.g., Nginx) to route /api to the backend.
  // For local dev with Angular proxy, keep this empty so requests go to "/api/..." and are proxied per proxy.conf.json.
  apiBase: 'https://api.fortsontheair.com'
};
