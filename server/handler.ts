import { z } from 'zod';
import { timingSafeEqual } from 'node:crypto';
import { processNotifications } from './worker.js';
import { verifyEmailWebhook } from './webhooks.js';
import { commandSchema, MIN_PASSWORD_LENGTH } from '../shared/domain.js';
import { createSession, cookie, getSession, service, serviceClient, userClient } from './backend.js';
import { allowedOrigin, hash, issuePickup, pickupDigest, secret, validPushEndpoint } from './security.js';
import { sendPasswordResetEmail } from './integrations/email.js';
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const json=(body:unknown,status=200,extra:Record<string,string>={})=>new Response(JSON.stringify(body),{status,headers:{...headers,...extra}});
const credentials=z.object({email:z.string().email().max(254),password:z.string().min(MIN_PASSWORD_LENGTH).max(128)});
const uuid=z.string().uuid();
function signupErrorMessage(error:{code?:string;message?:string}){
 const code=error.code??'';const message=(error.message??'').toLowerCase();
 if(code==='email_address_invalid')return 'Informe um endereço de e-mail válido.';
 if(code==='user_already_exists'||code==='email_exists')return 'Este e-mail já está cadastrado. Tente entrar ou recuperar a senha.';
 if(code==='weak_password'||message.includes('password'))return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
 if(code==='redirect_url_not_allowed'||message.includes('redirect'))return 'A URL de confirmação do cadastro não está autorizada no Supabase.';
 if(message.includes('documentos institucionais'))return 'Os documentos institucionais ainda não estão publicados.';
 if(message.includes('unidade inválida'))return 'A unidade informada não está disponível.';
 return 'Não foi possível criar a conta. Confira os dados e tente novamente.';
}
export async function handler(request:Request):Promise<Response>{
 try{
  const path=new URL(request.url).pathname.replace(/^\/api\//,'');
  if(path==='webhooks/resend'){if(request.method!=='POST')return json({message:'Método não permitido.'},405);const raw=await request.text();if(raw.length>20000)return json({message:'Payload muito grande.'},413);try{const event=verifyEmailWebhook(raw,request.headers);const result=await serviceClient().rpc('email_receipt',{p_id:request.headers.get('svix-id'),p_provider_id:event.data.email_id,p_type:event.type,p_at:event.created_at});if(result.error)return json({message:'Reprocessar evento.'},503);return json({ok:true});}catch{return json({message:'Assinatura ou evento inválido.'},400);}}
  if(path==='worker'){const expected=process.env.WORKER_SECRET;const received=request.headers.get('authorization')??'';if(request.method!=='POST'||!expected||Buffer.byteLength(received)!==Buffer.byteLength(`Bearer ${expected}`)||!timingSafeEqual(Buffer.from(received),Buffer.from(`Bearer ${expected}`)))return json({message:'Não autorizado.'},401);return json(await processNotifications());}
  if(path==='health')return json({configured:!!process.env.SUPABASE_URL,notifications:process.env.NOTIFICATIONS_ENABLED==='true',holyrics:false});
  if(!['GET','POST'].includes(request.method))return json({message:'Método não permitido.'},405);
  if(request.method==='POST'&&(!allowedOrigin(request.headers.get('origin'))||request.headers.get('x-requested-with')!=='Escolinha'))return json({message:'Origem não autorizada.'},403);
  let body:Record<string,unknown>={};if(request.method==='POST'){const text=await request.text();if(text.length>(path==='child-photo'?4000000:20000))return json({message:'Solicitação muito grande.'},413);body=JSON.parse(text);}
  if(path.startsWith('auth/')){
   if(request.method!=='POST')return json({message:'Método não permitido.'},405);
   const limit=await service<{allowed:boolean}>('rate_limit',{key:`auth:${hash(String(body.email??'')+request.headers.get('x-real-ip'))}`,limit:8});if(!limit.allowed)return json({message:'Muitas tentativas. Aguarde um minuto.'},429);
   const auth=userClient().auth;
   if(path==='auth/signup'){
    const values=credentials.extend({name:z.string().trim().min(2).max(120),unit_slug:z.string().regex(/^[a-z0-9-]{1,80}$/),terms:z.literal(true),privacy:z.literal(true)}).parse(body);
    const result=await serviceClient().auth.admin.createUser({email:values.email,password:values.password,email_confirm:true,user_metadata:{name:values.name,unit_slug:values.unit_slug,terms:true,privacy:true}});
    if(result.error||!result.data.user){console.error('auth.signup failed',{code:result.error?.code,status:result.error?.status,message:result.error?.message});return json({message:signupErrorMessage(result.error??{})},400);}
    const login=await userClient().auth.signInWithPassword({email:values.email,password:values.password});
    if(login.error||!login.data.session)return json({message:'Conta criada, mas não foi possível iniciar sua sessão. Tente entrar novamente.'},503);
    const member=await userClient(login.data.session.access_token).from('memberships').select('unit_id').eq('user_id',result.data.user.id).eq('active',true).limit(1).single();
    if(member.error)return json({message:'Conta criada, mas sua unidade ainda não foi vinculada.'},503);
    const session=await createSession({access_token:login.data.session.access_token,refresh_token:login.data.session.refresh_token,expires_at:login.data.session.expires_at!,unit_id:member.data.unit_id,user_id:result.data.user.id});
    return json({ok:true},200,{'Set-Cookie':cookie(session)});
   }
   if(path==='auth/recover'){
    const email=z.string().email().parse(body.email);
    const generated=await serviceClient().auth.admin.generateLink({type:'recovery',email,options:{redirectTo:`${secret('APP_ORIGIN')}/redefinir`}});
    if(generated.error||!generated.data.properties?.hashed_token)return json({ok:true});
    const resetLink=`${secret('APP_ORIGIN')}/redefinir?token_hash=${encodeURIComponent(generated.data.properties.hashed_token)}`;
    const sent=await sendPasswordResetEmail(email,resetLink,secret('RESEND_API_KEY'),secret('EMAIL_FROM'));
    if(!sent)throw new Error('Não foi possível enviar o e-mail de recuperação.');
    return json({ok:true});
   }
   if(path==='auth/reset'){
    const input=z.object({token_hash:z.string().min(10).max(2048),password:z.string().min(MIN_PASSWORD_LENGTH).max(128)}).parse(body);const verified=await auth.verifyOtp({token_hash:input.token_hash,type:'recovery'});if(verified.error||!verified.data.session)return json({message:'Link inválido ou expirado. Solicite outro.'},400);const changed=await auth.updateUser({password:input.password});await auth.signOut({scope:'global'});if(changed.error)throw new Error('Não foi possível atualizar a senha.');return json({ok:true});
   }
   if(path==='auth/login'){
    const input=credentials.parse(body);const login=await auth.signInWithPassword(input);if(login.error||!login.data.session)return json({message:'E-mail ou senha inválidos.'},401);
    const client=userClient(login.data.session.access_token);const member=await client.from('memberships').select('unit_id').eq('user_id',login.data.user.id).eq('active',true).limit(1).single();if(member.error)return json({message:'Sua conta não tem uma unidade ativa.'},403);
    const session=await createSession({access_token:login.data.session.access_token,refresh_token:login.data.session.refresh_token,expires_at:login.data.session.expires_at!,unit_id:member.data.unit_id,user_id:login.data.user.id});return json({ok:true},200,{'Set-Cookie':cookie(session)});
   }
   return json({message:'Rota não encontrada.'},404);
  }
  const session=await getSession(request);const {client,tokens,sessionHash}=session;
  const rate=await service<{allowed:boolean}>('rate_limit',{key:`user:${tokens.user_id}`,limit:90});if(!rate.allowed)return json({message:'Muitas solicitações. Aguarde um minuto.'},429);
  if(path==='child-photo'&&request.method==='POST'){const input=z.object({photo_id:z.string().uuid(),data:z.string().regex(/^data:image\/(jpeg|png|webp);base64,/).max(3800000)}).parse(body);const encoded=input.data.slice(input.data.indexOf(',')+1);const bytes=Buffer.from(encoded,'base64');if(bytes.length>2800000)return json({message:'A foto deve ter no máximo 2 MB.'},413);const pathName=`${tokens.user_id}/${input.photo_id}.jpg`;const uploaded=await serviceClient().storage.from('child-photos').upload(pathName,bytes,{contentType:'image/jpeg',upsert:true});if(uploaded.error){console.error('child-photo upload failed',{status:uploaded.error.statusCode,message:uploaded.error.message});return json({message:'Não foi possível armazenar a foto com segurança.'},503);}return json({path:pathName});}
  if(path==='logout'&&request.method==='POST'){await service('session_delete',{hash:sessionHash});return json({ok:true},200,{'Set-Cookie':cookie('',true)});}
  if(path==='snapshot'&&request.method==='GET'){const result=await client.rpc('app_snapshot',{p_unit:tokens.unit_id});if(result.error)throw new Error('Não foi possível carregar a unidade ou seu acesso foi revogado.');const snapshot=result.data as {children?:Array<{photo_path?:string;photo_url?:string}>};if(snapshot.children){await Promise.all(snapshot.children.map(async child=>{if(!child.photo_path)return;const signed=await serviceClient().storage.from('child-photos').createSignedUrl(child.photo_path,3600);if(signed.error)console.error('child-photo sign failed',{path:child.photo_path,status:signed.error.statusCode,message:signed.error.message});if(signed.data?.signedUrl)child.photo_url=signed.data.signedUrl;}));}return json(result.data);}
  if(path==='command'&&request.method==='POST'){
   const command=commandSchema.parse(body.command);const key=uuid.parse(body.idempotency_key);let payload:unknown=command;
   if(command.type==='checkout')payload={type:command.type,data:{attendance_id:command.data.attendance_id,person_id:command.data.person_id,credential_digest:await pickupDigest(command.data.credential,command.data.attendance_id)}};
   const result=await client.rpc('app_command',{p_unit:tokens.unit_id,p_command:payload,p_key:key});if(result.error){const safe=result.error.code==='P0001'?result.error.message:'Operação não autorizada ou dados inválidos.';return json({message:safe},400);}if(result.data?.error)return json({message:result.data.error},400);
   if(command.type==='save_child'&&command.data.photo_path){const photo=await client.rpc('set_child_photo',{p_unit:tokens.unit_id,p_child:result.data?.id??command.data.id,p_photo_path:command.data.photo_path});if(photo.error)return json({message:photo.error.code==='P0001'?photo.error.message:'Não foi possível associar a foto ao cadastro.'},400);}
   if(command.type==='create_call'&&process.env.NOTIFICATIONS_ENABLED==='true'){try{await processNotifications();}catch(error){console.error('push dispatch failed',{message:error instanceof Error?error.message:'unknown'});}}
   return json(result.data);
  }
  if(path==='credential'&&request.method==='POST'){const id=uuid.parse(body.attendance_id);const generated=await issuePickup(id);const result=await client.rpc('issue_credential',{p_unit:tokens.unit_id,p_attendance:id,p_digest:generated.digest,p_numeric_digest:generated.numeric_digest});if(result.error)return json({message:'Não é possível emitir a credencial para esta criança.'},403);return json({token:generated.token,numeric:generated.numeric,expires_at:result.data.expires_at});}
  if(path==='realtime'&&request.method==='GET')return json({url:secret('SUPABASE_URL'),key:secret('SUPABASE_ANON_KEY'),token:tokens.access_token});
  if(path==='push-config'&&request.method==='GET')return json({publicKey:secret('VAPID_PUBLIC_KEY')});
  if(path==='push-subscribe'&&request.method==='POST'){const subscription=z.object({endpoint:z.string().url().refine(validPushEndpoint),keys:z.object({auth:z.string().regex(/^[A-Za-z0-9_-]+$/).max(200),p256dh:z.string().regex(/^[A-Za-z0-9_-]+$/).max(300)}),expirationTime:z.number().nullable().optional()}).parse(body.subscription);await service('subscribe',{user_id:tokens.user_id,session_hash:sessionHash,subscription});const preference=await client.rpc('app_command',{p_unit:tokens.unit_id,p_command:{type:'settings',data:{email_delay_minutes:2,phone_delay_minutes:5,sound:false,email:false,push:true}},p_key:crypto.randomUUID()});if(preference.error)console.error('push preference update failed',{code:preference.error.code});return json({ok:true});}
  return json({message:'Rota não encontrada.'},404);
 }catch(e){if(e instanceof z.ZodError)return json({message:e.issues[0]?.message??'Dados inválidos.'},400);const msg=e instanceof Error?e.message:'';if(msg.includes('e-mail de recuperação'))return json({message:'O envio de recuperação não está configurado. Defina EMAIL_FROM com um remetente verificado no Resend e reinicie o servidor.'},503);if(msg.startsWith('Configuração')||msg.includes('serviço seguro'))return json({message:'O ambiente funcional ainda não está configurado. Consulte a documentação de implantação.'},503);if(/sessão|Sessão|Entre novamente/.test(msg))return json({message:msg},401);return json({message:'Não foi possível concluir com segurança. Confira os dados e tente novamente.'},400);}
}
