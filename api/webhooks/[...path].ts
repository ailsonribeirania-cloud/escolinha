import type { IncomingMessage, ServerResponse } from 'node:http';
import { handler } from '../../server/handler.js';

export const config={api:{bodyParser:false}};

export default async function endpoint(req:IncomingMessage & {body?:unknown},res:ServerResponse){
 const origin=process.env.APP_ORIGIN??'http://localhost';
 let body:string|undefined;
 if(!['GET','HEAD'].includes(req.method??'GET')){
  const chunks:Buffer[]=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>20000){res.writeHead(413,{'Content-Type':'application/json'});res.end(JSON.stringify({message:'Solicitação muito grande.'}));return;}chunks.push(Buffer.from(chunk));}
  body=Buffer.concat(chunks).toString('utf8');
 }
 const request=new Request(`${origin}${req.url}`,{method:req.method,headers:req.headers as Record<string,string>,body});
 const response=await handler(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
}
