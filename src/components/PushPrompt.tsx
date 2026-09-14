import { useEffect, useState } from 'react';
import { Bell, ShieldCheck } from 'lucide-react';
import { api, isDemo, useApp } from '../lib/app';
import { Modal } from './ui';

const seenKey=(userId:string)=>`push-prompt-seen:${userId}`;

export function PushPrompt({userId}:{userId:string}){
 const {toast}=useApp();
 const [open,setOpen]=useState(false);
 const [status,setStatus]=useState<'checking'|'ready'|'denied'|'unsupported'>('checking');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  if(isDemo||sessionStorage.getItem(seenKey(userId)))return;
  if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window)){setStatus('unsupported');setOpen(true);return;}
  if(Notification.permission==='denied'){setStatus('denied');setOpen(true);return;}
  void navigator.serviceWorker.ready.then(registration=>registration.pushManager.getSubscription()).then(subscription=>{
   if(!subscription){setStatus('ready');setOpen(true);}else sessionStorage.setItem(seenKey(userId),'1');
  }).catch(()=>{setStatus('ready');setOpen(true);});
 },[userId]);
 const close=()=>{sessionStorage.setItem(seenKey(userId),'1');setOpen(false);};
 const enable=async()=>{
  setBusy(true);
  try{
   const permission=await Notification.requestPermission();
   if(permission!=='granted'){setStatus(permission==='denied'?'denied':'ready');return;}
   const config=await api<{publicKey:string}>('push-config');
   const registration=await navigator.serviceWorker.ready;
   const current=await registration.pushManager.getSubscription();
   const key=Uint8Array.from(atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
   const subscription=current??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
   await api('push-subscribe',{subscription:subscription.toJSON()});
   sessionStorage.setItem(seenKey(userId),'1');setOpen(false);toast('Notificações ativadas neste dispositivo.');
  }catch(error){toast(error instanceof Error?error.message:'Não foi possível habilitar as notificações.',true);}
  finally{setBusy(false);}
 };
 if(!open)return null;
 return <Modal title="Fique por perto" description="Receba um aviso discreto quando a equipe precisar falar com você." onClose={close}>
  <div className="padded">
   <div className="form-notice"><Bell size={20}/> As notificações ajudam você a chegar rapidamente quando houver um chamado.</div>
   <p>Você receberá apenas um aviso breve. Os detalhes ficam protegidos dentro da Escolinha.</p>
   {status==='denied'?<><p className="small-note">As notificações estão bloqueadas neste navegador. Para ativá-las, abra as configurações do site, permita notificações e entre novamente.</p><button className="button secondary full-width" onClick={close}>Entendi</button></>:status==='unsupported'?<><p className="small-note">Este navegador não oferece Web Push. No iPhone ou iPad, instale a Escolinha pela opção “Adicionar à Tela de Início” e abra o aplicativo instalado.</p><button className="button secondary full-width" onClick={close}>Entendi</button></>:<><div className="form-notice"><ShieldCheck size={18}/> A permissão só será solicitada depois que você tocar no botão.</div><div className="form-actions"><button className="button secondary" onClick={close}>Agora não</button><button className="button" disabled={busy} onClick={()=>void enable()}><Bell size={17}/>{busy?'Ativando…':'Ativar notificações'}</button></div></>}
  </div>
 </Modal>;
}
