import type { MediaAlert } from './types.js';
export class AlertQueue {
  private alerts = new Map<string, MediaAlert>();
  replace(alerts: MediaAlert[]) { for (const alert of alerts) this.alerts.set(alert.id, alert); }
  upsert(alert: MediaAlert) { this.alerts.set(alert.id, alert); }
  get(id: string) { return this.alerts.get(id); }
  all() { return [...this.alerts.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)); }
  active() { return this.all().filter(a => ['pending', 'received_by_connector', 'awaiting_approval', 'approved', 'sending', 'failed'].includes(a.status)); }
}
