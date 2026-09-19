import process from 'node:process';

try { process.loadEnvFile('.env'); } catch { /* .env is optional for mock mode */ }

const bool = (value: string | undefined, fallback: boolean) => value === undefined ? fallback : value.toLowerCase() === 'true';
const number = (value: string | undefined, fallback: number) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export interface Config {
  connectorId: string; churchId: string; version: string; host: string; port: number;
  supabaseUrl?: string; supabaseAnonKey?: string; connectorEmail?: string; connectorPassword?: string;
  holyricsBaseUrl: string; holyricsToken?: string; holyricsDuration: number; holyricsTimeout: number; holyricsMock: boolean;
  reconciliationMs: number; maxAttempts: number;
}

export function loadConfig(): Config {
  const config: Config = {
    connectorId: process.env.CONNECTOR_ID || 'midia-local', churchId: process.env.CHURCH_ID || '', version: process.env.CONNECTOR_VERSION || '0.1.0',
    host: process.env.CONNECTOR_HOST || '127.0.0.1', port: number(process.env.CONNECTOR_PORT, 3090),
    supabaseUrl: process.env.SUPABASE_URL, supabaseAnonKey: process.env.SUPABASE_ANON_KEY, connectorEmail: process.env.SUPABASE_CONNECTOR_EMAIL, connectorPassword: process.env.SUPABASE_CONNECTOR_PASSWORD,
    holyricsBaseUrl: process.env.HOLYRICS_BASE_URL || 'http://127.0.0.1:8091', holyricsToken: process.env.HOLYRICS_TOKEN,
    holyricsDuration: Math.min(120, Math.max(5, number(process.env.HOLYRICS_ALERT_DURATION, 20))), holyricsTimeout: number(process.env.HOLYRICS_TIMEOUT_MS, 10000), holyricsMock: bool(process.env.HOLYRICS_MOCK, true),
    reconciliationMs: Math.max(10000, number(process.env.RECONCILIATION_INTERVAL_MS, 30000)), maxAttempts: Math.min(10, Math.max(1, number(process.env.MAX_ATTEMPTS, 4)))
  };
  if (!config.holyricsMock && !config.holyricsToken) throw new Error('HOLYRICS_TOKEN é obrigatório no modo real.');
  return config;
}
