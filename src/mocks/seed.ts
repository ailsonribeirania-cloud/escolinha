import type { Snapshot } from '../../shared/domain';
export function seed(): Snapshot {
 const today = new Date(); const time = (h:number,m=0) => new Date(today.getFullYear(),today.getMonth(),today.getDate(),h,m).toISOString();
 const profiles = [
  {id:'admin',name:'Mariana Oliveira',email:'coordenacao@example.test',phone:'',roles:['administrator'] as const,active:true},
  {id:'teacher',name:'Ana Martins',email:'professora@example.test',phone:'',roles:['teacher'] as const,active:true},
  {id:'guardian',name:'Camila Santos',email:'responsavel@example.test',phone:'',roles:['guardian'] as const,active:true},
  {id:'teacher2',name:'Beatriz Lima',email:'professora.b@example.test',phone:'',roles:['teacher'] as const,active:true},
 ].map(p=>({...p,roles:[...p.roles]}));
 const names=['Sofia Santos','Miguel Santos','Alice Oliveira','Gabriel Costa','Helena Souza','Theo Almeida','Laura Ferreira','Davi Ribeiro','Isabella Lima','Arthur Gomes','Cecília Rocha','Noah Martins'];
 const children=names.map((name,i)=>({id:`child-${i}`,name,birth_date:`${today.getFullYear() - (i===1?2: i%3===0?4:i%3===1?7:5)}-02-10`,guardian_id:i<2?'guardian':`family-${i}`,guardian_name:i<2?'Camila Santos':['Juliana Oliveira','Rafael Costa','Fernanda Souza','Bruno Almeida'][i%4],allergies:i===0?'Alergia a amendoim':i===4?'Alergia à proteína do leite':'',medication:'',needs:i===7?'Precisa de apoio em ambientes com muito barulho.':'',notes:'',active:true}));
 return {call_reasons:[],unit_id:'demo-unit',unit_name:'Igreja · Unidade principal',current_user:profiles[0],profiles,children,
 people:children.map((c,i)=>({id:`person-${i}`,child_id:c.id,name:c.guardian_name,relationship:'Responsável',phone:'',active:true})),
 events:[{id:'event-1',name:'Culto da família',starts_at:time(19),status:'open'},{id:'event-2',name:'Escola bíblica dominical',starts_at:new Date(today.getFullYear(),today.getMonth(),today.getDate()+4,9).toISOString(),status:'draft'}],
 classes:[{id:'class-1',name:'Sementinhas',room:'Sala 01',min_months:0,max_months:36,capacity:12,teacher_ids:['teacher'],color:'orange',active:true},{id:'class-2',name:'Pequenos exploradores',room:'Sala 02',min_months:36,max_months:72,capacity:20,teacher_ids:['teacher'],color:'green',active:true},{id:'class-3',name:'Turma da descoberta',room:'Sala 03',min_months:72,max_months:144,capacity:18,teacher_ids:['teacher2'],color:'purple',active:true}],
 attendance:children.slice(0,10).map((c,i)=>({id:`attendance-${i}`,child_id:c.id,event_id:'event-1',class_id:i===1?'class-1':i%3===1?'class-3':'class-2',guardian_id:c.guardian_id,status:i===9?'checked_out':i===8?'pending_reception':'present',public_code:`E-${127+i}`,requested_at:time(18,30+i*2),received_at:i===8?undefined:time(18,32+i*2),checked_out_at:i===9?time(19,15):undefined,pickup_person:i===9?c.guardian_name:undefined})),
 calls:[{id:'call-1',attendance_id:'attendance-0',child_id:'child-0',guardian_id:'guardian',created_by:'teacher',reason:'A criança está pedindo pelo responsável',note:'Estamos na recepção da Escolinha.',status:'open',created_at:time(19,10)},{id:'call-2',attendance_id:'attendance-4',child_id:'child-4',guardian_id:'family-4',created_by:'teacher',reason:'Favor comparecer à Escolinha',note:'',status:'on_the_way',created_at:time(19,3),acknowledged_at:time(19,5),on_the_way_at:time(19,5)}],
 incidents:[],deliveries:[{id:'delivery-1',call_id:'call-1',channel:'push',status:'accepted',attempts:1,created_at:time(19,10)},{id:'delivery-2',call_id:'call-2',channel:'push',status:'accepted',attempts:1,created_at:time(19,3)}],
 audit:[{id:'audit-1',action:'Recebimento confirmado',entity_id:'attendance-7',actor:'Ana Martins',created_at:time(18,46)}],
 settings:{email_delay_minutes:2,phone_delay_minutes:5,holyrics_enabled:false,sound:false,email:true,push:false}};
}
