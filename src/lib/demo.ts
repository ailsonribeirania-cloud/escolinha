import { activeAttendance, activeCall, ageMonths, commandSchema, DomainError, type Command, type Role, type Snapshot } from '../../shared/domain';
import { seed } from '../mocks/seed';
const ensure = (condition:unknown,message:string) => { if(!condition) throw new DomainError('INVALID_OPERATION',message); };
export class DemoRepository {
 state=seed(); private completed = new Set<string>(); private credentials=new Map<string,string>();
 switchRole(role:Role) { const user=this.state.profiles.find(p=>p.roles.includes(role)); if(user)this.state.current_user=user; }
 snapshot(): Snapshot {
  const s=structuredClone(this.state), u=s.current_user;
  if(u.roles.includes('administrator')) return s;
  if(u.roles.includes('guardian')) {
   s.children=s.children.filter(c=>c.guardian_id===u.id); s.classes=s.classes.filter(c=>c.active);
  } else {s.classes=s.classes.filter(c=>c.teacher_ids.includes(u.id));const ids=new Set(s.classes.map(c=>c.id));s.children=s.children.filter(c=>s.attendance.some(a=>a.child_id===c.id&&ids.has(a.class_id)));}
  const ids=new Set(s.children.map(c=>c.id)); s.attendance=s.attendance.filter(a=>ids.has(a.child_id)); s.people=s.people.filter(p=>ids.has(p.child_id));s.calls=s.calls.filter(c=>ids.has(c.child_id));s.incidents=s.incidents.filter(i=>ids.has(i.child_id)&&(!u.roles.includes('guardian')||i.shared));s.deliveries=s.deliveries.filter(d=>s.calls.some(c=>c.id===d.call_id));s.profiles=s.profiles.filter(p=>p.id===u.id||s.classes.some(c=>c.teacher_ids.includes(p.id)));s.audit=[];return s;
 }
 credential(attendanceId:string) {const a=this.state.attendance.find(a=>a.id===attendanceId);ensure(a&&activeAttendance(a),'Presença não está ativa.');ensure(a?.guardian_id===this.state.current_user.id,'Apenas o responsável pode emitir o código.');const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%90000000+10000000);this.credentials.set(attendanceId,code);return {token:code,expires_at:new Date(Date.now()+10*60000).toISOString()};}
 command(input:Command,key:string) {
  const command=commandSchema.parse(input); if(this.completed.has(key))return;
  const s=this.state,u=s.current_user,admin=u.roles.includes('administrator'),teacher=u.roles.includes('teacher'),now=new Date().toISOString();
  const uid=()=>crypto.randomUUID(); const canChild=(id:string)=>admin||s.children.some(c=>c.id===id&&c.guardian_id===u.id);
  const attendance=(id:string)=>{const a=s.attendance.find(a=>a.id===id);ensure(a,'Presença não encontrada.');return a!;};
  const canStaff=(id:string)=>admin||(teacher&&s.classes.some(c=>c.id===attendance(id).class_id&&c.teacher_ids.includes(u.id)));
  switch(command.type) {
   case 'save_child': {const d=command.data; if(d.id){ensure(canChild(d.id),'Sem permissão.');Object.assign(s.children.find(c=>c.id===d.id)!,d);}else{s.children.push({...d,id:uid(),guardian_id:u.id,guardian_name:u.name,active:true});}break;}
   case 'add_person': ensure(canChild(command.data.child_id),'Sem permissão.');s.people.push({...command.data,id:uid(),active:true});break;
   case 'revoke_person': {const p=s.people.find(p=>p.id===command.data.id);ensure(p&&canChild(p.child_id),'Sem permissão.');p!.active=false;break;}
   case 'check_in': {const d=command.data;ensure(canChild(d.child_id),'Sem permissão.'); const child=s.children.find(c=>c.id===d.child_id);const event=s.events.find(e=>e.id===d.event_id);const room=s.classes.find(c=>c.id===d.class_id);ensure(child?.active&&event?.status==='open'&&room?.active,'Cadastro, evento ou turma indisponível.');ensure(!s.attendance.some(a=>a.child_id===d.child_id&&a.event_id===d.event_id&&activeAttendance(a)),'Esta criança já tem um check-in ativo.');const age=ageMonths(child!.birth_date,new Date(event!.starts_at));ensure(age>=room!.min_months&&age<room!.max_months,'A faixa etária não corresponde à turma.');ensure(s.attendance.filter(a=>a.class_id===d.class_id&&a.event_id===d.event_id&&activeAttendance(a)).length<room!.capacity,'A turma está lotada.');s.attendance.push({...d,id:uid(),guardian_id:child!.guardian_id,status:'pending_reception',public_code:`E-${uid().slice(0,8).toUpperCase()}`,requested_at:now});break;}
   case 'receive': {const a=attendance(command.data.id);ensure(canStaff(a.id)&&a.status==='pending_reception','Não é possível confirmar esse recebimento.');a.status='present';a.received_at=now;a.received_by=u.id;break;}
   case 'cancel_check_in': {const a=attendance(command.data.id);ensure((canChild(a.child_id)||canStaff(a.id))&&a.status==='pending_reception','Somente solicitações pendentes podem ser canceladas.');a.status='cancelled';break;}
   case 'request_pickup': {const a=attendance(command.data.id);ensure(canChild(a.child_id)&&a.status==='present','Não é possível solicitar retirada.');a.status='pickup_requested';break;}
   case 'create_call': {const d=command.data,a=attendance(d.attendance_id);ensure(canStaff(a.id)&&['present','pickup_requested'].includes(a.status),'Sem presença autorizada.');if(s.calls.some(c=>c.attendance_id===a.id&&activeCall(c)))throw new DomainError('CALL_EXISTS','Já existe um chamado ativo. Acompanhe ou reenvie o chamado existente.'); const id=uid();s.calls.unshift({...d,id,child_id:a.child_id,guardian_id:a.guardian_id,created_by:u.id,status:'open',created_at:now});s.deliveries.unshift({id:uid(),call_id:id,channel:'push',status:'accepted',attempts:1,created_at:now});break;}
   case 'respond_call': {const c=s.calls.find(c=>c.id===command.data.id);ensure(c,'Chamado não encontrado.');const next=command.data.status;ensure(next==='finalized'?canStaff(c!.attendance_id):c!.guardian_id===u.id,'Sem permissão.');ensure(activeCall(c!),'O chamado já foi encerrado.');const rank={open:0,viewed:1,acknowledged:2,on_the_way:3,finalized:4,cancelled:4};if(rank[next]>rank[c!.status])c!.status=next;if(next==='viewed')c!.viewed_at??=now;if(next==='acknowledged'||next==='on_the_way')c!.acknowledged_at??=now;if(next==='on_the_way')c!.on_the_way_at??=now;if(next==='finalized')c!.finalized_at=now;break;}
   case 'resend_call': {const c=s.calls.find(c=>c.id===command.data.id);ensure(c&&canStaff(c.attendance_id)&&activeCall(c),'Chamado indisponível.');const previous=s.deliveries.filter(d=>d.call_id===c!.id);ensure(!previous.some(d=>Date.now()-new Date(d.created_at).getTime()<60000),'Aguarde um minuto antes de reenviar.');s.deliveries.unshift({id:uid(),call_id:c!.id,channel:'push',status:'accepted',attempts:previous.length+1,created_at:now});break;}
   case 'incident': {const d=command.data,a=attendance(d.attendance_id);ensure(canStaff(a.id),'Sem permissão.');s.incidents.unshift({...d,id:uid(),child_id:a.child_id,created_by:u.id,created_at:now});break;}
   case 'checkout': {const d=command.data,a=attendance(d.attendance_id);ensure(canStaff(a.id)&&['present','pickup_requested'].includes(a.status),'A criança não está disponível para retirada.');ensure(this.credentials.get(a.id)===d.credential,'Código inválido. Emita o código na área do responsável.');const person=s.people.find(p=>p.id===d.person_id&&p.child_id===a.child_id&&p.active);ensure(person,'Pessoa não autorizada.');a.status='checked_out';a.checked_out_at=now;a.pickup_person=person!.name;a.validated_by=u.id;this.credentials.delete(a.id);s.calls.filter(c=>c.attendance_id===a.id&&activeCall(c)).forEach(c=>{c.status='finalized';c.finalized_at=now;});break;}
   case 'save_event': {ensure(admin,'Sem permissão.');const d=command.data;if(d.id&&d.status==='closed')ensure(!s.attendance.some(a=>a.event_id===d.id&&activeAttendance(a)),'Há crianças presentes ou aguardando recebimento.');if(d.id)Object.assign(s.events.find(e=>e.id===d.id)!,d);else s.events.push({...d,id:uid()});break;}
   case 'save_class': {ensure(admin,'Sem permissão.');const d=command.data;if(d.id)Object.assign(s.classes.find(c=>c.id===d.id)!,d);else s.classes.push({...d,id:uid(),active:true});break;}
   case 'save_profile': Object.assign(u,command.data);Object.assign(s.profiles.find(p=>p.id===u.id)!,command.data);break;
   case 'settings': {if(!admin){s.settings.sound=command.data.sound;s.settings.push=command.data.push;s.settings.email=command.data.email;}else Object.assign(s.settings,command.data);break;}
   case 'set_member': {ensure(admin&&command.data.id!==u.id,'Não é possível alterar sua própria permissão.');const p=s.profiles.find(p=>p.id===command.data.id);ensure(p,'Usuário não encontrado.');Object.assign(p!,command.data);break;}
   case 'deactivate_child': {ensure(canChild(command.data.id),'Sem permissão.');ensure(!s.attendance.some(a=>a.child_id===command.data.id&&activeAttendance(a)),'Conclua a presença antes de desativar.');s.children.find(c=>c.id===command.data.id)!.active=false;break;}
   case 'save_reason': {ensure(admin,'Sem permissão.');if(command.data.id)Object.assign(s.call_reasons.find(r=>r.id===command.data.id)!,command.data);else s.call_reasons.push({...command.data,id:uid()});break;}
   case 'revise_incident': {const incident=s.incidents.find(i=>i.id===command.data.id);ensure(incident&&canStaff(incident.attendance_id),'Sem permissão.');incident!.description=command.data.description;break;}
   case 'privacy_request': break;
  }
  s.audit.unshift({id:uid(),action:command.type,entity_id:'id' in command.data?String(command.data.id??''):command.type,actor:u.name,created_at:now});this.completed.add(key);
 }
}
export const demo = new DemoRepository();
