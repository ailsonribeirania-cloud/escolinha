import { z } from 'zod';
export type Role = 'administrator' | 'teacher' | 'guardian';
export const MIN_PASSWORD_LENGTH = 8;
export type AttendanceStatus = 'pending_reception' | 'present' | 'pickup_requested' | 'checked_out' | 'cancelled';
export type CallStatus = 'open' | 'viewed' | 'acknowledged' | 'on_the_way' | 'finalized' | 'cancelled';
export interface Profile { id: string; name: string; email: string; phone: string; roles: Role[]; active: boolean }
export interface Child { id: string; name: string; birth_date: string; guardian_id: string; guardian_name: string; allergies: string; medication: string; needs: string; notes: string; photo_path?: string; photo_url?: string; active: boolean }
export interface AuthorizedPerson { id: string; child_id: string; name: string; relationship: string; phone: string; active: boolean }
export interface ChurchEvent { id: string; name: string; starts_at: string; status: 'open' | 'closed' | 'draft'; }
export interface Classroom { id: string; name: string; room: string; min_months: number; max_months: number; capacity: number; teacher_ids: string[]; color: string; active: boolean }
export interface Attendance { id: string; child_id: string; event_id: string; class_id: string; guardian_id: string; status: AttendanceStatus; public_code: string; requested_at: string; received_at?: string; received_by?: string; checked_out_at?: string; pickup_person?: string; validated_by?: string }
export interface Call { id: string; attendance_id: string; child_id: string; guardian_id: string; created_by: string; reason: string; note: string; status: CallStatus; created_at: string; viewed_at?: string; acknowledged_at?: string; on_the_way_at?: string; finalized_at?: string }
export interface Incident { id: string; attendance_id: string; child_id: string; category: string; description: string; shared: boolean; created_by: string; created_at: string }
export interface Delivery { id: string; call_id: string; channel: 'internal' | 'push' | 'email'; status: 'pending' | 'accepted' | 'delivered' | 'failed' | 'unknown' | 'cancelled'; attempts: number; created_at: string; error?: string }
export interface Audit { id: string; action: string; entity_id: string; actor: string; created_at: string }
export interface Settings { email_delay_minutes: number; phone_delay_minutes: number; holyrics_enabled: boolean; sound: boolean; email: boolean; push: boolean }
export interface CallReason {id:string;label:string;active:boolean;}
export interface Snapshot {call_reasons:CallReason[]; unit_id: string; unit_name: string; current_user: Profile; profiles: Profile[]; children: Child[]; people: AuthorizedPerson[]; events: ChurchEvent[]; classes: Classroom[]; attendance: Attendance[]; calls: Call[]; incidents: Incident[]; deliveries: Delivery[]; audit: Audit[]; settings: Settings; }
export const reasons = ['A criança está chorando', 'A criança está pedindo pelo responsável', 'A criança não está se sentindo bem', 'Precisa ir ao banheiro', 'Precisa trocar a fralda', 'Houve uma pequena ocorrência', 'Favor comparecer à Escolinha', 'Recado geral', 'Outro motivo'];
export const activeAttendance = (a: Attendance) => ['pending_reception','present','pickup_requested'].includes(a.status);
export const activeCall = (c: Call) => !['finalized','cancelled'].includes(c.status);
export const ageMonths = (birth: string, at = new Date()) => { const [year,month,day] = birth.split('-').map(Number); return (at.getFullYear()-year)*12 + at.getMonth()+1-month - (at.getDate()<day?1:0); };
export const ageLabel = (birth: string) => { const months=ageMonths(birth); return months < 24 ? `${months} meses` : `${Math.floor(months/12)} anos`; };
export const statusLabel: Record<string,string> = { pending_reception:'Aguardando chegada', present:'Na Escolinha', pickup_requested:'Retirada solicitada', checked_out:'Retirada concluída', cancelled:'Cancelado', open:'Aguardando resposta', viewed:'Visualizado', acknowledged:'Confirmado', on_the_way:'A caminho', finalized:'Finalizado', pending:'Pendente', accepted:'Enviado', delivered:'Entregue', failed:'Falha no envio', unknown:'Sem confirmação', closed:'Encerrado', draft:'Rascunho' };
const text = z.string().trim().min(2, 'Informe pelo menos 2 caracteres.').max(120);
const id = z.string().min(1).max(100);
export const childSchema = z.object({ id: id.optional(), name: text, birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Informe uma data válida.').refine(v => { const d = new Date(`${v}T12:00:00`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === v && ageMonths(v)>=0 && ageMonths(v)<216; }, 'Informe uma data de nascimento válida, de menor de 18 anos.'), allergies: z.string().max(1000).default(''), medication: z.string().max(1000).default(''), needs: z.string().max(1000).default(''), notes: z.string().max(2000).default(''), photo_path: z.string().max(300).default('') });
export const personSchema = z.object({ child_id:id, name:text, relationship:text, phone:z.string().trim().max(25).default('') });
export const commandSchema = z.discriminatedUnion('type', [
 z.object({type:z.literal('save_child'),data:childSchema}),
 z.object({type:z.literal('add_person'),data:personSchema}),
 z.object({type:z.literal('revoke_person'),data:z.object({id})}),
 z.object({type:z.literal('check_in'),data:z.object({child_id:id,event_id:id,class_id:id})}),
 z.object({type:z.enum(['receive','request_pickup','cancel_check_in']),data:z.object({id})}),
 z.object({type:z.literal('create_call'),data:z.object({attendance_id:id,reason:text,note:z.string().max(2000).default('')})}),
 z.object({type:z.literal('respond_call'),data:z.object({id,status:z.enum(['viewed','acknowledged','on_the_way','finalized'])})}),
 z.object({type:z.literal('resend_call'),data:z.object({id})}),
 z.object({type:z.literal('incident'),data:z.object({attendance_id:id,category:text,description:z.string().trim().min(5).max(3000),shared:z.boolean().default(false)})}),
 z.object({type:z.literal('checkout'),data:z.object({attendance_id:id,credential:z.string().min(6).max(4096),person_id:id})}),
 z.object({type:z.literal('save_event'),data:z.object({id:id.optional(),name:text,starts_at:z.string().datetime(),status:z.enum(['open','closed','draft'])})}),
 z.object({type:z.literal('save_class'),data:z.object({id:id.optional(),name:text,room:text,min_months:z.number().int().min(0).max(216),max_months:z.number().int().min(1).max(217),capacity:z.number().int().min(1).max(200),teacher_ids:z.array(id).max(20),color:z.enum(['green','purple','orange','blue']).default('green')}).refine(v=>v.max_months>v.min_months,'Faixa etária inválida.')}),
 z.object({type:z.literal('save_profile'),data:z.object({name:text,phone:z.string().max(25)})}),
 z.object({type:z.literal('settings'),data:z.object({email_delay_minutes:z.number().int().min(1).max(60),phone_delay_minutes:z.number().int().min(1).max(120),sound:z.boolean(),email:z.boolean(),push:z.boolean()}).refine(v=>v.phone_delay_minutes>v.email_delay_minutes,'O aviso de ligação deve ocorrer depois do e-mail.')}),
 z.object({type:z.literal('save_reason'),data:z.object({id:id.optional(),label:text,active:z.boolean()})}),
 z.object({type:z.literal('revise_incident'),data:z.object({id,description:z.string().trim().min(5).max(3000),reason:z.string().trim().min(5).max(200)})}),
 z.object({type:z.literal('privacy_request'),data:z.object({kind:z.enum(['access','correction','deletion'])})}),
 z.object({type:z.literal('set_member'),data:z.object({id,roles:z.array(z.enum(['guardian','teacher','administrator'])).min(1),active:z.boolean()})}),
 z.object({type:z.literal('deactivate_child'),data:z.object({id})})
]);
export type Command = z.infer<typeof commandSchema>;
export class DomainError extends Error { constructor(public code:string, message:string) { super(message); } }
export const requireRule = (value:unknown,code:string,message:string): asserts value => { if (!value) throw new DomainError(code,message); };
