// This Edge Function is a scheduled authenticated dispatcher to the same-domain
// Node worker (web-push uses Node crypto). Neither endpoint is callable by users.
Deno.serve(async (request: Request) => {
 const key=Deno.env.get('WORKER_SECRET');
 if(!key || request.method!=='POST' || request.headers.get('authorization')!==`Bearer ${key}`) return new Response('Unauthorized',{status:401});
 const origin=Deno.env.get('APP_ORIGIN');
 if(!origin?.startsWith('https://'))return new Response('Worker origin not configured',{status:503});
 const response=await fetch(`${origin}/api/worker`,{method:'POST',headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(45000)});
 return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
});
