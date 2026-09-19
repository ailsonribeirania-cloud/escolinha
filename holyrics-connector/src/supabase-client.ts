import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Config } from './config.js';
import type { MediaAlert } from './types.js';
import { logger } from './logger.js';

export async function connectSupabase(config: Config, onAlert: (alert: MediaAlert) => void): Promise<SupabaseClient | undefined> {
  if (!config.supabaseUrl || !config.supabaseAnonKey || !config.connectorEmail || !config.connectorPassword || !config.churchId) return undefined;
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false } });
  const login = await client.auth.signInWithPassword({ email: config.connectorEmail, password: config.connectorPassword });
  if (login.error) throw new Error('Usuário técnico do conector não autenticado.');
  client.channel(`media-alerts-${config.churchId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'media_alerts', filter: `unit_id=eq.${config.churchId}` }, payload => { if (payload.new && 'id' in payload.new) onAlert(payload.new as MediaAlert); }).subscribe(status => { logger.info('Supabase Realtime status', { status }); });
  return client;
}
