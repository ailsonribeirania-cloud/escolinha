import { describe, expect, it } from 'vitest';
import { AlertService } from '../src/alert-service';
import { HolyricsClient } from '../src/holyrics-client';
import { AlertQueue } from '../src/queue';
import type { Config } from '../src/config';
import type { MediaAlert } from '../src/types';
const config: Config = { connectorId:'test',churchId:'unit',version:'test',host:'127.0.0.1',port:3090,holyricsBaseUrl:'http://127.0.0.1:8091',holyricsToken:'x',holyricsDuration:20,holyricsTimeout:10,holyricsMock:true,reconciliationMs:30000,maxAttempts:4 };
const alert = (overrides: Partial<MediaAlert> = {}): MediaAlert => ({ id:'a1',unit_id:'unit',event_id:'e1',call_id:'c1',public_code:'E-TESTE01',public_message:'ESCOLINHA — Responsável pelo código E-TESTE01, favor comparecer à recepção.',priority:'normal',status:'pending',attempts:0,expires_at:new Date(Date.now()+60000).toISOString(),created_at:new Date().toISOString(),updated_at:new Date().toISOString(),...overrides });
describe('fila e aprovação',()=>{
  it('deduplica por id e não permite aprovação duplicada',async()=>{const queue=new AlertQueue();const service=new AlertService(config,queue,new HolyricsClient(config));await service.receive(alert());await service.receive(alert());expect(service.alerts).toHaveLength(1);expect((await service.approve('a1'))).toMatchObject({ok:true,mock:true});expect((await service.approve('a1'))).toMatchObject({ok:false});});
  it('não envia cancelado, expirado ou com mensagem inválida',async()=>{const service=new AlertService(config,new AlertQueue(),new HolyricsClient(config));await service.receive(alert({id:'cancel',status:'cancelled'}));await service.receive(alert({id:'expired',expires_at:new Date(Date.now()-1).toISOString()}));await service.receive(alert({id:'bad',public_message:'nome da criança'}));expect((await service.approve('cancel')).ok).toBe(false);expect((await service.approve('expired')).ok).toBe(false);expect((await service.approve('bad')).ok).toBe(false);});
  it('limita tentativas',async()=>{const service=new AlertService(config,new AlertQueue(),new HolyricsClient(config));await service.receive(alert({id:'limit',attempts:4}));expect((await service.approve('limit')).ok).toBe(false);});
});
