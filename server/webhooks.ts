import { Webhook } from 'svix';
import { z } from 'zod';
import { secret } from './security.js';
export function verifyEmailWebhook(raw:string,headers:Headers){
 new Webhook(secret('RESEND_WEBHOOK_SECRET')).verify(raw,{'svix-id':headers.get('svix-id')??'','svix-timestamp':headers.get('svix-timestamp')??'','svix-signature':headers.get('svix-signature')??''});
 return z.object({type:z.string(),created_at:z.string(),data:z.object({email_id:z.string()})}).parse(JSON.parse(raw));
}
