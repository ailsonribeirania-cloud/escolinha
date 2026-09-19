import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AlertService } from './alert-service.js';
import { logger } from './logger.js';

const json = (res: ServerResponse, body: unknown, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
export function startApprovalServer(host: string, port: number, service: AlertService) {
  const publicDir = join(process.cwd(), 'public');
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url || '/', `http://${host}:${port}`);
      if (url.pathname === '/api/state') return json(res, { state: service.state, alerts: service.alerts });
      const match = url.pathname.match(/^\/api\/alerts\/([^/]+)\/(approve|reject|cancel|retry)$/);
      if (match && req.method === 'POST') { const id = decodeURIComponent(match[1]); const result = match[2] === 'approve' ? await service.approve(id) : match[2] === 'reject' ? await service.reject(id) : match[2] === 'cancel' ? await service.cancel(id) : await service.retry(id); const failed = result === false || (typeof result === 'object' && 'ok' in result && !result.ok); return json(res, result, failed ? 409 : 200); }
      if (req.method !== 'GET') return json(res, { error: 'Método não permitido.' }, 405);
      const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      if (!['index.html', 'app.js', 'styles.css'].includes(file)) return json(res, { error: 'Não encontrado.' }, 404);
      const content = await readFile(join(publicDir, file)); const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html'; res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }); res.end(content);
    } catch (error) { logger.error('Approval server error', { message: error instanceof Error ? error.message : 'unknown' }); json(res, { error: 'Erro interno.' }, 500); }
  });
  server.listen(port, host, () => logger.info('Painel local iniciado', { host, port }));
  return server;
}
