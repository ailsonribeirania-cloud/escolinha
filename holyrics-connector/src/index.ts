import { loadConfig } from './config.js';
import { AlertService } from './alert-service.js';
import { HolyricsClient } from './holyrics-client.js';
import { AlertQueue } from './queue.js';
import { connectSupabase } from './supabase-client.js';
import { startApprovalServer } from './approval-server.js';
import { logger } from './logger.js';

const config = loadConfig();
const queue = new AlertQueue();
const holyrics = new HolyricsClient(config);
const service = new AlertService(config, queue, holyrics);
startApprovalServer(config.host, config.port, service);
const health = await holyrics.check();
service.state.holyrics = health.ok ? health.mock ? 'mock' : 'connected' : 'disconnected';
try {
  const supabase = await connectSupabase(config, alert => void service.receive(alert));
  if (supabase) { service.setSupabase(supabase); service.state.supabase = 'connected'; }
  else service.state.supabase = 'not_configured';
  await service.reconcile();
} catch (error) { service.state.supabase = 'disconnected'; service.state.lastError = error instanceof Error ? error.message : 'Supabase indisponível.'; logger.error('Supabase connection failed', { message: service.state.lastError }); }
setInterval(() => void service.reconcile(), config.reconciliationMs);
