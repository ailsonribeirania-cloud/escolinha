import { z } from 'zod';
export const publicAlertSchema=z.object({publicCode:z.string().regex(/^E-[A-Z0-9]{3,32}$/),expiresAt:z.string().datetime(),durationSeconds:z.number().int().min(5).max(120),mode:z.enum(['automatic','media_approval'])}).strict();
export type PublicAlert=z.infer<typeof publicAlertSchema>;
export type IntegrationStatus='disabled'|'pending'|'awaiting_approval'|'sent'|'failed'|'unknown'|'expired'|'hidden';
export interface IntegrationResult { status:IntegrationStatus;connectionStatus:'unknown'|'connected'|'disconnected';errorCode?:string;observedAt?:string; }
export interface PublicAlertIntegration {publish(alert:PublicAlert):Promise<IntegrationResult>;hide():Promise<IntegrationResult>;}
