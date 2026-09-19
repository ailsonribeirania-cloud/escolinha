import type { SupabaseClient } from '@supabase/supabase-js';
import type { Config } from './config.js';
import { HolyricsClient } from './holyrics-client.js';
import { logger } from './logger.js';
import { AlertQueue } from './queue.js';
import type { ConnectorState, MediaAlert } from './types.js';
import { isValidPublicAlert } from './types.js';

export class AlertService {
  state: ConnectorState = { supabase: 'not_configured', holyrics: 'not_configured' };
  private inFlight = new Set<string>();
  constructor(private config: Config, private queue: AlertQueue, private holyrics: HolyricsClient, private supabase?: SupabaseClient) {}
  get alerts() { return this.queue.all(); }
  setSupabase(client: SupabaseClient) { this.supabase = client; }
  async reconcile() { if (!this.supabase || !this.config.churchId) return; const { data, error } = await this.supabase.from('media_alerts').select('*').eq('unit_id', this.config.churchId).in('status', ['pending', 'received_by_connector', 'awaiting_approval', 'failed']).order('created_at', { ascending: false }); if (error) return this.fail(error.message); const alerts = (data || []) as MediaAlert[]; this.queue.replace(alerts); for (const alert of alerts) if (new Date(alert.expires_at).getTime() <= Date.now()) await this.transition(alert.id, 'expired', 'ALERTA_EXPIRADO'); this.state.supabase = 'connected'; this.state.lastConnection = new Date().toISOString(); }
  async receive(alert: MediaAlert) { if (alert.unit_id !== this.config.churchId) return; this.queue.upsert(alert); if (this.supabase) await this.transition(alert.id, 'received_by_connector'); }
  async approve(id: string) { if (this.inFlight.has(id)) return { ok: false, message: 'Este alerta já está sendo enviado.' }; const alert = this.queue.get(id); if (!alert || !isValidPublicAlert(alert)) return { ok: false, message: 'Chamado inválido, encerrado ou expirado.' }; if (alert.attempts >= this.config.maxAttempts) return { ok: false, message: 'Limite de tentativas atingido.' }; this.inFlight.add(id); try { if (!(await this.transition(id, 'approved'))) return { ok: false, message: 'Chamado não pôde ser aprovado.' }; if (!(await this.transition(id, 'sending'))) return { ok: false, message: 'Chamado não pôde iniciar o envio.' }; const result = await this.holyrics.sendAlert(alert.public_message); if (!result.ok) { this.state.holyrics = 'disconnected'; this.fail(result.message); await this.transition(id, 'failed', result.message); return result; } this.state.holyrics = result.mock ? 'mock' : 'connected'; this.state.lastAlert = id; await this.transition(id, 'sent_to_holyrics'); return result; } finally { this.inFlight.delete(id); } }
  async reject(id: string) { return this.transition(id, 'rejected'); }
  async cancel(id: string) { return this.transition(id, 'cancelled'); }
  async retry(id: string) { const alert = this.queue.get(id); if (!alert || alert.status !== 'failed') return false; return Boolean(await this.approve(id)); }
  private async transition(id: string, status: string, error?: string) { const alert = this.queue.get(id); if (!alert) return false; if (!this.supabase) { alert.status = status as MediaAlert['status']; alert.last_error = error || null; alert.attempts += status === 'sending' ? 1 : 0; this.queue.upsert(alert); return true; } const rpc = status === 'expired' ? 'media_alert_expire' : 'media_alert_transition'; const args = status === 'expired' ? { p_alert: id, p_connector: this.config.connectorId } : { p_alert: id, p_status: status, p_connector: this.config.connectorId, p_error: error || null }; const { data, error: rpcError } = await this.supabase.rpc(rpc, args); if (rpcError || data?.error) { this.fail(rpcError?.message || data?.error || 'Transição recusada.'); return false; } await this.reconcile(); return true; }
  private fail(message: string) { this.state.lastError = message; logger.error('Alert service error', { message }); }
}
