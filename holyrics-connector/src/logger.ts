const redact = (value: unknown): unknown => {
  if (typeof value === 'string') return value.replace(/(token|password|api[_-]?key)=?[^&\s]+/gi, '$1=[REDACTED]');
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key.toLowerCase().includes('token') || key.toLowerCase().includes('password') || key.toLowerCase().includes('key') ? key : key, key.toLowerCase().includes('token') || key.toLowerCase().includes('password') || key.toLowerCase().includes('key') ? '[REDACTED]' : redact(item)]));
  return value;
};
export const logger = { info(message: string, data?: unknown) { console.log(JSON.stringify({ level: 'info', message, ...(data ? { data: redact(data) } : {}) })); }, error(message: string, data?: unknown) { console.error(JSON.stringify({ level: 'error', message, ...(data ? { data: redact(data) } : {}) })); } };
