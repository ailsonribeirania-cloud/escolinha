
export async function sendPasswordResetEmail(recipient:string, resetLink:string, key:string, from:string, transport:typeof fetch=fetch):Promise<boolean>{
 try{
  const response=await transport('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'password-reset-'+idempotencyKey(key,recipient)},body:JSON.stringify({from,to:[recipient],subject:'Recuperação de acesso · Escolinha',text:'Recebemos uma solicitação para redefinir sua senha.\n\nAcesse este link para criar uma nova senha:\n'+resetLink+'\n\nSe você não solicitou isso, ignore esta mensagem. O link expira em breve.'}),signal:AbortSignal.timeout(10000),redirect:'error'});
  return response.ok;
 }catch{return false;}
}
function idempotencyKey(key:string,recipient:string){return key.slice(0,8)+'-'+recipient.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,32);}
export interface SendResult {status:'accepted'|'failed'|'unknown';retry:boolean;code?:string;provider_id?:string;}
export interface EmailProvider {send(recipient:string,idempotencyKey:string):Promise<SendResult>;}
export class ResendProvider implements EmailProvider {
 constructor(private key:string,private from:string,private appOrigin:string,private transport:typeof fetch=fetch){}
 async send(recipient:string,idempotencyKey:string):Promise<SendResult>{
  try{const response=await this.transport('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${this.key}`,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify({from:this.from,to:[recipient],subject:'Uma mensagem da Escolinha',text:`A equipe da Escolinha solicita sua presença. Por favor, dirija-se até a recepção.\n\nAcesse sua conta: ${this.appOrigin}/chamados`}),signal:AbortSignal.timeout(10000),redirect:'error'});
   if(!response.ok)return {status:'failed',retry:response.status===429||response.status>=500,code:`EMAIL_HTTP_${response.status}`};
   const data=await response.json() as {id?:string};return {status:'accepted',retry:false,provider_id:data.id};
  }catch{return {status:'unknown',retry:true,code:'EMAIL_TIMEOUT_OR_NETWORK'};}
 }
}
