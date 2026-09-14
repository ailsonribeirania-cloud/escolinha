import { createContext, useCallback, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import type { Command, Role, Snapshot } from '../../shared/domain';
import { demo } from './demo';
import { playAlert } from './sound';
export const isDemo = import.meta.env.VITE_APP_MODE !== 'live';
export class ApiError extends Error {constructor(message:string,public status:number){super(message);}}
export async function api<T>(path:string,body?:unknown):Promise<T> {
 const response=await fetch(`/api/${path}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Requested-With':'Escolinha'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 const raw=await response.text();
 let data:Record<string,unknown>={};
 if(raw.trim()){
  try{const parsed=JSON.parse(raw);if(parsed&&typeof parsed==='object')data=parsed as Record<string,unknown>;}catch{if(!response.ok)throw new ApiError('O servidor retornou uma resposta inválida. Tente novamente.',response.status);}
 }
 if(!response.ok)throw new ApiError(typeof data.message==='string'?data.message:'Não foi possível concluir. Tente novamente.',response.status);
 return data as T;
}
interface AppContextValue { data:Snapshot|undefined; loading:boolean; error:Error|null; role:Role; setRole:(r:Role)=>void; run:(c:Command,message?:string)=>Promise<boolean>; refresh:()=>void; busy:boolean; online:boolean; toast:(message:string,error?:boolean)=>void; selectedEvent:string; setSelectedEvent:(id:string)=>void; logout:()=>Promise<void>; }
const Context=createContext<AppContextValue|null>(null);
export function AppProvider({children}:{children:ReactNode}) {
 const qc=useQueryClient();const pending=useRef(new Map<string,string>());const latch=useRef(false);const previousCalls=useRef('');const [role,setRoleState]=useState<Role>('administrator');const [busy,setBusy]=useState(false);const [online,setOnline]=useState(navigator.onLine);const [message,setMessage]=useState<{text:string,error:boolean}|null>(null);const [selectedEvent,setSelectedEvent]=useState('');
 const query=useQuery({queryKey:['snapshot'],queryFn:()=>isDemo?Promise.resolve(demo.snapshot()):api<Snapshot>('snapshot'),retry:false,refetchInterval:isDemo?false:30000,refetchOnWindowFocus:!isDemo});
 useEffect(()=>{const signature=query.data?.calls.map(c=>`${c.id}:${c.status}`).join('|')??'';if(previousCalls.current&&signature!==previousCalls.current&&role!=='guardian')playAlert();previousCalls.current=signature;},[query.data?.calls,role]);
 const toast=useCallback((text:string,error=false)=>setMessage({text,error}),[]);
 useEffect(()=>{if(message){const id=setTimeout(()=>setMessage(null),6000);return()=>clearTimeout(id);}},[message]);
 useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
 useEffect(()=>{if(query.data&&!selectedEvent)setSelectedEvent(query.data.events.find(e=>e.status==='open')?.id??query.data.events[0]?.id??'');if(query.data&&!isDemo&&!query.data.current_user.roles.includes(role))setRoleState(query.data.current_user.roles[0]??'guardian');},[query.data,selectedEvent,role]);
 useEffect(()=>{if(isDemo||!query.data)return;let stopped=false;let cleanup=()=>{};api<{url:string;key:string;token:string}>('realtime').then(config=>{if(stopped)return;const client=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});client.realtime.setAuth(config.token);const channel=client.channel('app-changes').on('postgres_changes',{event:'*',schema:'public',table:'change_signals',filter:`user_id=eq.${query.data!.current_user.id}`},()=>{void qc.invalidateQueries({queryKey:['snapshot']});}).subscribe();cleanup=()=>{void client.removeChannel(channel);};}).catch(()=>{});const interval=setInterval(()=>{void qc.invalidateQueries({queryKey:['snapshot']});},60000);return()=>{stopped=true;cleanup();clearInterval(interval);};},[query.data?.current_user.id,qc]);
 const setRole=(next:Role)=>{if(!isDemo&&!query.data?.current_user.roles.includes(next))return;if(isDemo){demo.switchRole(next);qc.setQueryData(['snapshot'],demo.snapshot());}setRoleState(next);};
 const run=async(command:Command,success='Alteração salva.')=>{if(!online){toast('Sem conexão. Procure a recepção para operações urgentes.',true);return false;}if(latch.current)return false;latch.current=true;setBusy(true);const signature=JSON.stringify(command);const key=pending.current.get(signature)??crypto.randomUUID();pending.current.set(signature,key);try{if(isDemo)demo.command(command,key);else await api('command',{command,idempotency_key:key});pending.current.delete(signature);await qc.invalidateQueries({queryKey:['snapshot']});toast(success);return true;}catch(e){if(isDemo||(e instanceof ApiError&&e.status<500))pending.current.delete(signature);toast(e instanceof Error?e.message:'Não foi possível concluir.',true);return false;}finally{setBusy(false);latch.current=false;}};
 const logout=async()=>{if(!isDemo)await api('logout',{});qc.clear();window.location.assign('/login');};
 return <Context.Provider value={{data:query.error&&!isDemo?undefined:query.data,loading:query.isLoading,error:query.error,role,setRole,run,refresh:()=>{void qc.invalidateQueries({queryKey:['snapshot']});},busy,online,toast,selectedEvent,setSelectedEvent,logout}}>{children}{message&&<div className={`toast ${message.error?'error':''}`} role={message.error?'alert':'status'}>{message.text}<button aria-label="Fechar aviso" onClick={()=>setMessage(null)}>×</button></div>}</Context.Provider>;
}
export function useApp(){const value=useContext(Context);if(!value)throw new Error('AppProvider ausente');return value;}
