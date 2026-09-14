import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
export function QrScanner({onScan}:{onScan:(value:string)=>void}){
 const [active,setActive]=useState(false);const [error,setError]=useState('');const video=useRef<HTMLVideoElement>(null);const callback=useRef(onScan);callback.current=onScan;
 useEffect(()=>{if(!active)return;let stopped=false;let stop=()=>{};let timeout:ReturnType<typeof setTimeout>;
 void import('@zxing/browser').then(async({BrowserQRCodeReader})=>{if(stopped||!video.current)return;const reader=new BrowserQRCodeReader();const controls=await reader.decodeFromConstraints({video:{facingMode:{ideal:'environment'}},audio:false},video.current,(result,_error,controls)=>{if(result&&!stopped){controls.stop();callback.current(result.getText());setActive(false);}});stop=()=>controls.stop();if(stopped)stop();else timeout=setTimeout(()=>setActive(false),60000);}).catch(()=>{if(!stopped){setError('Não foi possível abrir a câmera. Autorize o acesso ou digite o código.');setActive(false);}});
 return()=>{stopped=true;stop();clearTimeout(timeout);};},[active]);
 return <div className="qr-scanner">{active?<><video ref={video} muted playsInline aria-label="Câmera para ler QR de retirada"/><button type="button" className="button secondary" onClick={()=>setActive(false)}>Fechar câmera</button></>:<button type="button" className="button secondary" onClick={()=>{setError('');setActive(true);}}><Camera size={17}/>Ler QR com a câmera</button>}{error&&<p className="field-error" role="alert">{error}</p>}</div>;
}
