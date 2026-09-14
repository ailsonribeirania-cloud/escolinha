import { useEffect, useState } from 'react';
import { Download, Share, Smartphone, PlusSquare } from 'lucide-react';
import { Modal } from './ui';

interface InstallEvent extends Event { prompt:()=>Promise<void>; userChoice:Promise<{outcome:'accepted'|'dismissed'}>; }

function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone);}
function isAppleMobile(){return /iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}

export function InstallPrompt(){
 const [installEvent,setInstallEvent]=useState<InstallEvent|null>(null);const [open,setOpen]=useState(false);const [ios,setIos]=useState(false);
 useEffect(()=>{
  if(isStandalone()||localStorage.getItem('escolinha-install-prompt-dismissed')==='1')return;
  const apple=isAppleMobile();setIos(apple);
  const listener=(event:Event)=>{event.preventDefault();setInstallEvent(event as InstallEvent);setOpen(true);};
  window.addEventListener('beforeinstallprompt',listener);if(apple)setOpen(true);
  return()=>window.removeEventListener('beforeinstallprompt',listener);
 },[]);
 const close=()=>{localStorage.setItem('escolinha-install-prompt-dismissed','1');setOpen(false);};
 const install=async()=>{if(!installEvent)return;await installEvent.prompt();const choice=await installEvent.userChoice;if(choice.outcome==='accepted')close();else setInstallEvent(null);};
 if(!open)return null;
 return <Modal title="Leve a Escolinha com você" description="Acesse mais rápido pela tela inicial do celular." onClose={close}>
  {ios?<><div className="install-modal-icon"><Smartphone size={34}/></div><p>Para instalar no iPhone ou iPad:</p><ol className="install-steps"><li>Abra a Escolinha pelo <strong>Safari</strong>.</li><li>Toque em <Share size={15}/> <strong>Compartilhar</strong>.</li><li>Escolha <PlusSquare size={15}/> <strong>Adicionar à Tela de Início</strong>.</li><li>Confirme em <strong>Adicionar</strong>.</li></ol><p className="small-note">Depois, abra o ícone instalado para receber notificações e acessar o sistema como aplicativo.</p><button className="button secondary full-width" onClick={close}>Entendi</button></>:<><div className="install-modal-icon"><Download size={34}/></div><p>Instale o aplicativo no Android para abrir a Escolinha com um toque, mesmo sem procurar pelo navegador.</p><div className="form-notice">Toque em “Instalar agora” e confirme a instalação na janela do navegador.</div><div className="form-actions"><button className="button secondary" onClick={close}>Agora não</button><button className="button" onClick={()=>void install()}><Download size={17}/>Instalar agora</button></div></>}
 </Modal>;
}
