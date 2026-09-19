export type MediaStatus = 'pending' | 'received_by_connector' | 'awaiting_approval' | 'approved' | 'sending' | 'sent_to_holyrics' | 'rejected' | 'failed' | 'cancelled' | 'expired';
export type Priority = 'normal' | 'urgent';

export interface MediaAlert {
  id: string;
  unit_id: string;
  event_id: string;
  call_id: string;
  public_code: string;
  public_message: string;
  priority: Priority;
  status: MediaStatus;
  connector_id?: string | null;
  received_at?: string | null;
  approved_at?: string | null;
  displayed_at?: string | null;
  rejected_at?: string | null;
  attempts: number;
  last_error?: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConnectorState {
  supabase: 'connected' | 'disconnected' | 'not_configured';
  holyrics: 'connected' | 'disconnected' | 'mock' | 'not_configured';
  lastConnection?: string;
  lastAlert?: string;
  lastError?: string;
}

export const publicMessage = (code: string) => `ESCOLINHA — Responsável pelo código ${code}, favor comparecer à recepção.`;

export function isValidPublicAlert(alert: MediaAlert): boolean {
  return /^E-[A-Z0-9]{3,32}$/.test(alert.public_code) &&
    alert.public_message === publicMessage(alert.public_code) &&
    new Date(alert.expires_at).getTime() > Date.now() &&
    !['cancelled', 'expired', 'sent_to_holyrics', 'rejected'].includes(alert.status);
}
