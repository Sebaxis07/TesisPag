import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/AuthStore';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ProjectDetail } from './pages/ProjectDetail';
import { TeamMembers } from './pages/TeamMembers';
import { Methodology } from './pages/Methodology';
import { Meetings } from './pages/Meetings';
import { Requirements } from './pages/Requirements';
import { TechnicalSolution } from './pages/TechnicalSolution';
import { Diagrams } from './pages/Diagrams';
import { Reports } from './pages/Reports';
import { StackComparer } from './pages/StackComparer';
import { AuditLogs } from './pages/AuditLogs';
import { AcceptInvite } from './pages/AcceptInvite';
import { Observations } from './pages/Observations';
import { Approvals } from './pages/Approvals';
import { Roadmap } from './pages/Roadmap';
import { Deliverables } from './pages/Deliverables';
import { PresentationAssistant } from './pages/PresentationAssistant';
import { UserManagement } from './pages/UserManagement';
import { ProposalManagement } from './pages/ProposalManagement';
import { EvaluationRubricPanel } from './pages/EvaluationRubricPanel';
import { Profile } from './pages/Profile';
import { SSOCallback } from './pages/SSOCallback';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  const { initializeSession, isLoading } = useAuthStore();

  React.useEffect(() => {
    initializeSession();
    
    // Silent refresh every 14 minutes (Access Token expires in 15 minutes)
    const interval = setInterval(() => {
      initializeSession();
    }, 14 * 60 * 1000);

    return () => clearInterval(interval);
  }, [initializeSession]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-zinc-500">Iniciando sesión segura...</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={<Login />} />
        <Route path="/sso-callback" element={<SSOCallback />} />
        <Route path="/invites/accept/:token" element={<AcceptInvite />} />

        {/* Protected Dashboard Workspace Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="proyecto" element={<ProjectDetail />} />
          <Route path="equipo" element={<TeamMembers />} />
          <Route path="metodologia" element={<Methodology />} />
          <Route path="reuniones" element={<Meetings />} />
          <Route path="requerimientos" element={<Requirements />} />
          <Route path="arquitectura" element={<TechnicalSolution />} />
          <Route path="diagramas" element={<Diagrams />} />
          <Route path="informes" element={<Reports />} />
          <Route path="stack-comparer" element={<StackComparer />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="observaciones" element={<Observations />} />
          <Route path="aprobaciones" element={<Approvals />} />
          <Route path="propuestas" element={<ProposalManagement />} />
          <Route path="evaluaciones" element={<EvaluationRubricPanel />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="entregables" element={<Deliverables />} />
          <Route path="defensa" element={<PresentationAssistant />} />
          <Route path="usuarios" element={<UserManagement />} />
          <Route path="perfil" element={<Profile />} />
        </Route>

        {/* Catch-all Fallback redirection */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
