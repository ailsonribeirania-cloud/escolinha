import webpush from 'web-push';
import { service } from './backend.js';
import { secret, validPushEndpoint } from './security.js';
import { ResendProvider, type SendResult } from './integrations/email.js';
interface Job {job_id:string;lease_token:string;delivery_id:string;channel:'push'|'email';attempt:number;}
interface Payload {email:string;subscriptions:Array<{id:string;subscription:webpush.PushSubscription}>;}
export async function processNotifications(){
 if(process.env.NOTIFICATIONS_ENABLED!=='true')return {enabled:false,processed:0};
 const jobs=await service<Job[]>('claim_jobs',{});let processed=0;
 for(const job of jobs){let result:SendResult|{status:'cancelled';retry:boolean;code:string};
  const payload=await service<Payload|null>('job_payload',job);
  if(!payload)result={status:'cancelled',retry:false,code:'NO_LONGER_ELIGIBLE'};
  else if(job.channel==='email')result=await new ResendProvider(secret('RESEND_API_KEY'),secret('EMAIL_FROM'),secret('APP_ORIGIN')).send(payload.email,`escolinha-${job.delivery_id}`);
  else{
   webpush.setVapidDetails(secret('VAPID_SUBJECT'),secret('VAPID_PUBLIC_KEY'),secret('VAPID_PRIVATE_KEY'));
   const results:SendResult[]=[];
   for(const item of payload.subscriptions){
    if(!validPushEndpoint(item.subscription.endpoint)){results.push({status:'failed',retry:false,code:'PUSH_ENDPOINT_INVALID'});continue;}
    try{await webpush.sendNotification(item.subscription,JSON.stringify({type:'call'}),{TTL:120,urgency:'high',timeout:10000});results.push({status:'accepted',retry:false});}
    catch(e){const status=(e as {statusCode?:number}).statusCode;if(status===404||status===410)await service('invalidate_subscription',{id:item.id});results.push({status:status?'failed':'unknown',retry:!status||status===429||status>=500,code:status?`PUSH_HTTP_${status}`:'PUSH_TIMEOUT_OR_NETWORK'});}
   }
   result=results.some(r=>r.status==='accepted')?{status:'accepted',retry:false}:results.find(r=>r.retry)??results[0]??{status:'failed',retry:false,code:'NO_ACTIVE_DEVICE'};
  }
  await service('finish_job',{...job,...result});processed++;
 }
 return {enabled:true,processed};
}
