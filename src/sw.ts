/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute, matchPrecache } from 'workbox-precaching';
declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{url:string;revision:string|null}> };
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')void self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 // Never intercept APIs, Auth, private files or non-navigation requests here.
 if(event.request.mode==='navigate'&&url.origin===self.location.origin&&!url.pathname.startsWith('/api/')){
  event.respondWith(fetch(event.request).catch(async()=>await matchPrecache('/offline.html')??new Response('Sem conexão. Procure a recepção.',{headers:{'Content-Type':'text/plain; charset=utf-8'}})));
 }
});
self.addEventListener('push',event=>{
 // No user-controlled sensitive text on a lock screen.
 event.waitUntil(self.registration.showNotification('Escolinha',{body:'A equipe da Escolinha solicita sua presença. Por favor, dirija-se até a recepção.',icon:'/icon-192.png',badge:'/icon-192.png',tag:'escolinha-call',data:{url:'/chamados'}}));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const client=windows.find(c=>new URL(c.url).origin===self.location.origin) as WindowClient|undefined;if(client){await client.navigate('/chamados');await client.focus();}else await self.clients.openWindow('/chamados');})());});
