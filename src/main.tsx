import React, { Component, Suspense, lazy, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AppProvider, useApp } from './lib/app';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
const Families=lazy(()=>import('./pages/Families').then(module=>({default:module.Families})));
const CheckIn=lazy(()=>import('./pages/Families').then(module=>({default:module.CheckIn})));
const Receipt=lazy(()=>import('./pages/Families').then(module=>({default:module.Receipt})));
const AttendancePage=lazy(()=>import('./pages/Operations').then(module=>({default:module.AttendancePage})));
const CallsPage=lazy(()=>import('./pages/Operations').then(module=>({default:module.CallsPage})));
const HistoryPage=lazy(()=>import('./pages/Operations').then(module=>({default:module.HistoryPage})));
const IncidentsPage=lazy(()=>import('./pages/Operations').then(module=>({default:module.IncidentsPage})));
const ClassesPage=lazy(()=>import('./pages/Admin').then(module=>({default:module.ClassesPage})));
const EventsPage=lazy(()=>import('./pages/Admin').then(module=>({default:module.EventsPage})));
const TeamPage=lazy(()=>import('./pages/Admin').then(module=>({default:module.TeamPage})));
const NotificationsPage=lazy(()=>import('./pages/Admin').then(module=>({default:module.NotificationsPage})));
const ReportsPage=lazy(()=>import('./pages/Admin').then(module=>({default:module.ReportsPage})));
const SettingsPage=lazy(()=>import('./pages/Admin').then(module=>({default:module.SettingsPage})));
const AuthPage=lazy(()=>import('./pages/Public').then(module=>({default:module.AuthPage})));
const WelcomePage=lazy(()=>import('./pages/Public').then(module=>({default:module.WelcomePage})));
const LegalPage=lazy(()=>import('./pages/Public').then(module=>({default:module.LegalPage})));
const InstallPage=lazy(()=>import('./pages/Public').then(module=>({default:module.InstallPage})));
import { Empty, Loading } from './components/ui';
import './styles.css';
class ErrorBoundary extends Component<{children:ReactNode},{error:boolean}>{state={error:false};static getDerivedStateFromError(){return {error:true};}render(){return this.state.error?<div className="auth-page"><h1>Algo não saiu como esperado.</h1><p>Atualize a página. Se uma operação estava em andamento, confira seu estado antes de repetir.</p><button className="button" onClick={()=>window.location.reload()}>Tentar novamente</button></div>:this.props.children;}}
function Guard({children,admin=false}:{children:ReactNode;admin?:boolean}){const {role}=useApp();return admin&&role!=='administrator'||!admin&&role==='guardian'?<Navigate to="/" replace/>:children;}
function UpdateNotice(){const {busy,toast}=useApp();const {needRefresh:[needRefresh,setNeedRefresh],updateServiceWorker}=useRegisterSW();if(!needRefresh)return null;return <div className="update-notice" role="status"><strong>Uma nova versão está disponível.</strong><p>Atualize depois de concluir a operação atual.</p><button className="button small-button" disabled={busy} onClick={()=>{if(document.querySelector('dialog[open]')){toast('Conclua ou feche a operação antes de atualizar.');return;}void updateServiceWorker(true);}}>Atualizar agora</button><button className="text-link" onClick={()=>setNeedRefresh(false)}>Depois</button></div>;}
const client=new QueryClient({defaultOptions:{queries:{staleTime:10000,retry:false,gcTime:60000}}});
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><QueryClientProvider client={client}><BrowserRouter><AppProvider><Suspense fallback={<Loading/>}><Routes><Route path="/boas-vindas" element={<WelcomePage/>}/><Route path="/login" element={<AuthPage/>}/><Route path="/cadastro" element={<AuthPage mode="signup"/>}/><Route path="/recuperar" element={<AuthPage mode="recover"/>}/><Route path="/redefinir" element={<AuthPage mode="reset"/>}/><Route path="/termos" element={<LegalPage/>}/><Route path="/privacidade" element={<LegalPage privacy/>}/><Route element={<Layout/>}><Route index element={<Dashboard/>}/><Route path="criancas" element={<Families/>}/><Route path="check-in" element={<CheckIn/>}/><Route path="retirada/:id" element={<Receipt/>}/><Route path="presencas" element={<Guard><AttendancePage/></Guard>}/><Route path="turmas" element={<Guard><ClassesPage/></Guard>}/><Route path="chamados" element={<CallsPage/>}/><Route path="ocorrencias" element={<IncidentsPage/>}/><Route path="historico" element={<HistoryPage/>}/><Route path="eventos" element={<Guard admin><EventsPage/></Guard>}/><Route path="equipe" element={<Guard admin><TeamPage/></Guard>}/><Route path="notificacoes" element={<Guard admin><NotificationsPage/></Guard>}/><Route path="relatorios" element={<Guard admin><ReportsPage/></Guard>}/><Route path="configuracoes" element={<SettingsPage/>}/><Route path="instalar" element={<InstallPage/>}/><Route path="*" element={<Empty title="Página não encontrada" description="Use o menu para voltar à Escolinha."/>}/></Route></Routes></Suspense><UpdateNotice/></AppProvider></BrowserRouter></QueryClientProvider></ErrorBoundary></React.StrictMode>);
