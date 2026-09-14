import { publicAlertSchema, type PublicAlert, type PublicAlertIntegration, type IntegrationResult } from '../../shared/integrations.js';
interface Config {enabled:boolean;apiKey?:string;token?:string;}
// Isolated backend adapter. No caller is registered while the feature flag is off.
export class HolyricsAdapter implements PublicAlertIntegration {
 constructor(private config:Config,private transport:typeof fetch=fetch){}
 private async request(action:'SetAlert'|'ShowCustomMessageStandalone',body:unknown):Promise<IntegrationResult>{
  if(!this.config.enabled)return {status:'disabled',connectionStatus:'unknown'};
  if(!this.config.apiKey||!this.config.token)return {status:'failed',connectionStatus:'unknown',errorCode:'NOT_CONFIGURED'};
  try{const response=await this.transport(`https://api.holyrics.com.br/request/${action}`,{method:'POST',headers:{'Content-Type':'application/json',api_key:this.config.apiKey,token:this.config.token},body:JSON.stringify(body),signal:AbortSignal.timeout(10000),redirect:'error'});
   const data=await response.json() as {status?:string;response_status?:string;error?:{key?:string};response?:{status?:string}};
   if(data.error?.key==='device_disconnected')return {status:'failed',connectionStatus:'disconnected',errorCode:'DEVICE_DISCONNECTED',observedAt:new Date().toISOString()};
   if(data.response_status==='timeout')return {status:'unknown',connectionStatus:'unknown',errorCode:'RESPONSE_TIMEOUT'};
   if(!response.ok||data.status!=='ok'||data.response_status!=='ok'||data.response?.status!=='ok')return {status:'failed',connectionStatus:'unknown',errorCode:'COMMAND_REJECTED'};
   return {status:'sent',connectionStatus:'connected',observedAt:new Date().toISOString()};
  }catch{return {status:'unknown',connectionStatus:'unknown',errorCode:'NETWORK_OR_TIMEOUT'};}
 }
 async publish(input:PublicAlert):Promise<IntegrationResult>{if(!this.config.enabled)return {status:'disabled',connectionStatus:'unknown'};const alert=publicAlertSchema.parse(input);if(new Date(alert.expiresAt).getTime()<=Date.now())return {status:'expired',connectionStatus:'unknown'};
  const message=`ESCOLINHA — Responsável pelo código ${alert.publicCode}, favor comparecer à recepção.`;
  const duration=Math.min(alert.durationSeconds,Math.max(1,Math.floor((new Date(alert.expiresAt).getTime()-Date.now())/1000)));
  const result=alert.mode==='automatic'?await this.request('SetAlert',{text:message,show:true,display_ahead:true,close_after_seconds:duration}):await this.request('ShowCustomMessageStandalone',{name:'Escolinha',message,note:'Confirme a validade do chamado na Escolinha antes de exibir.',params:[]});
  return result.status==='sent'&&alert.mode==='media_approval'?{...result,status:'awaiting_approval'}:result;
 }
 async hide(){const result=await this.request('SetAlert',{show:false});return result.status==='sent'?{...result,status:'hidden' as const}:result;}
}
