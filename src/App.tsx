import { Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DashboardLayout } from './components/DashboardLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { HomePage } from './pages/HomePage'
import { LandingPage } from './pages/LandingPage'
import { AuthPage } from './pages/AuthPage'
import { InviteAcceptPage } from './pages/InviteAcceptPage'
import { ChatPage } from './pages/ChatPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { HistoryPage } from './pages/HistoryPage'
import { KnowledgePage } from './pages/KnowledgePage'
import { SettingsPage } from './pages/SettingsPage'
import { CompanyProfilePage } from './pages/CompanyProfilePage'
import { CompanyDashboardPage } from './pages/CompanyDashboardPage'
import { BillingPage } from './pages/BillingPage'
import { TeamPage } from './pages/TeamPage'
import { TermsPage } from './pages/TermsPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { CookiePage } from './pages/CookiePage'

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/intro" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/invite" element={<InviteAcceptPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/cookies" element={<CookiePage />} />

        {/* Protected dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="chat" replace />} />
          <Route path="chat" element={<ErrorBoundary><ChatPage /></ErrorBoundary>} />
          <Route path="company" element={<ErrorBoundary><CompanyProfilePage /></ErrorBoundary>} />
          <Route path="settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
          <Route path="history" element={<ErrorBoundary><HistoryPage /></ErrorBoundary>} />
          <Route path="documents" element={<ErrorBoundary><DocumentsPage /></ErrorBoundary>} />
          <Route path="knowledge" element={<ErrorBoundary><KnowledgePage /></ErrorBoundary>} />
          <Route path="files" element={<Navigate to="documents" replace />} />
          <Route path="company-dashboard" element={<ErrorBoundary><CompanyDashboardPage /></ErrorBoundary>} />
          <Route path="billing" element={<ErrorBoundary><BillingPage /></ErrorBoundary>} />
          <Route path="team" element={<ErrorBoundary><TeamPage /></ErrorBoundary>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App
