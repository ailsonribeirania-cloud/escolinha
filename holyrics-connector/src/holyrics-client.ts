import type { Config } from './config.js';
import { logger } from './logger.js';

export type HolyricsResult = { ok: true; mock: boolean; displayId?: string } | { ok: false; kind: 'timeout' | 'disconnected' | 'invalid_token' | 'rejected' | 'unexpected'; message: string };
export class HolyricsClient {
  constructor(private config: Config, private transport: typeof fetch = fetch) {}
  private url(action: string) { const base = this.config.holyricsBaseUrl.replace(/\/$/, ''); return `${base}/api/${action}?token=${encodeURIComponent(this.config.holyricsToken || '')}`; }
  async check(): Promise<HolyricsResult> {
    if (this.config.holyricsMock) return { ok: true, mock: true };
    return this.request('GetAPIServerInfo', {});
  }
  async sendAlert(text: string, duration = this.config.holyricsDuration): Promise<HolyricsResult> {
    if (!text || text.length > 300) return { ok: false, kind: 'rejected', message: 'Mensagem pública inválida.' };
    if (this.config.holyricsMock) { logger.info('Holyrics mock request', { action: 'SetAlert', text, duration }); return { ok: true, mock: true }; }
    return this.request('SetAlert', { text, show: true, display_ahead: true, close_after_seconds: duration });
  }
  private async request(action: string, body: unknown): Promise<HolyricsResult> {
    try {
      const response = await this.transport(this.url(action), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(this.config.holyricsTimeout), redirect: 'error' });
      const data = await response.json().catch(() => null) as { status?: string; error?: { key?: string; message?: string }; data?: { display_id?: string } } | null;
      if (data?.error?.key === 'device_disconnected') return { ok: false, kind: 'disconnected', message: 'Holyrics desconectado.' };
      if (data?.error?.key === 'invalid_token' || data?.error?.message?.toLowerCase().includes('invalid token')) return { ok: false, kind: 'invalid_token', message: 'Token do Holyrics inválido.' };
      if (!response.ok || data?.status !== 'ok') return { ok: false, kind: 'rejected', message: 'Holyrics rejeitou a requisição.' };
      return { ok: true, mock: false, displayId: data.data?.display_id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha de rede.';
      logger.error('Holyrics request failed', { action, message });
      return { ok: false, kind: message.toLowerCase().includes('timeout') ? 'timeout' : 'disconnected', message: message.toLowerCase().includes('timeout') ? 'Tempo esgotado.' : 'Holyrics indisponível.' };
    }
  }
}
