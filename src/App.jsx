import React, { useState } from "react";

// Import utilities
import { PAGES, TZ } from "./utils/constants.js";
import { baseStyles } from "./utils/styles.js";
import { initOnce, sampleFAQs, sampleHomestays, writeLS, STORAGE_KEYS } from "./services/storage.js";

// Import hooks
import { useAuth } from "./hooks/useAuth.js";
import { useToast } from "./hooks/useToast.jsx";

// Import components
import { LoginPage } from "./components/pages/LoginPage.jsx";
import { Dashboard } from "./components/pages/Dashboard.jsx";
import { MessagesPage } from "./components/pages/MessagesPage.jsx";
import { HomestayData } from "./components/pages/HotelData.jsx";
import { FAQPage } from "./components/pages/FAQPage.jsx";

// Import remaining components
import { ChatTester } from "./components/pages/ChatTester.jsx";
import { UserManagementPage } from "./components/pages/UserManagementPage.jsx";
import { SettingsPage } from "./components/pages/SettingsPage.jsx";
import { LogsPage } from "./components/pages/LogsPage.jsx";
import { LegalPage } from "./components/pages/LegalPage.jsx";
import { Footer } from "./components/Footer.jsx";

export default function App() {
  // Initialize sample data if needed
  React.useEffect(() => {
    initOnce();
    
    // Load sample FAQs if none exist
    const existingFAQs = JSON.parse(localStorage.getItem(STORAGE_KEYS.faqs) || '[]');
    if (existingFAQs.length === 0) {
      writeLS(STORAGE_KEYS.faqs, sampleFAQs);
    }
    
    // Load sample homestays if none exist
    const existingHomestays = JSON.parse(localStorage.getItem(STORAGE_KEYS.homestays) || '[]');
    if (existingHomestays.length === 0) {
      writeLS(STORAGE_KEYS.homestays, sampleHomestays);
    }
  }, []);
  
  return <AppShell />;
}

/*************************
 * Top-level Application
 *************************/
function AppShell() {
  const { session, login, logout } = useAuth();
  const [active, setActive] = useState("Dashboard");
  const { show, node: toast } = useToast();

  // Handle navigation from footer links
  React.useEffect(() => {
    const handleNavigateToLegal = () => {
      setActive("Legal");
    };

    window.addEventListener('navigateToLegal', handleNavigateToLegal);
    return () => window.removeEventListener('navigateToLegal', handleNavigateToLegal);
  }, []);
  
  if (!session) return <LoginPage onLogin={login} />;
  
  return (
    <div className="app-container">
      <aside className="sidebar">
        <div style={baseStyles.brand}>🤖 Customer Service Assistant Console</div>
        <div className="sidebar-nav">
          {PAGES.map(p => (
            <div 
              key={p} 
              className="nav-item"
              style={baseStyles.navItem(active === p)} 
              onClick={() => setActive(p)}
            >
              {p}
            </div>
          ))}
        </div>
        <div className="sidebar-nav-mobile">
          {PAGES.map(p => (
            <div 
              key={p} 
              className="nav-item"
              style={baseStyles.navItem(active === p)} 
              onClick={() => setActive(p)}
            >
              {p}
            </div>
          ))}
        </div>
        <div style={{ height: 16 }} />
        <button style={baseStyles.btnGhost} onClick={logout}>Logout</button>
        <div style={{ 
          marginTop: 12, 
          fontSize: 12, 
          opacity: 0.9
        }}>
          Logged in: {session.email} ({session.role})
        </div>
      </aside>
      <main className="content">
        <div style={baseStyles.header}>
          <div style={{ fontWeight: 700 }}>{active}</div>
          <div style={baseStyles.badge}>Timezone: {TZ}</div>
        </div>
        <div style={baseStyles.page}>
          {active === "Dashboard" && <Dashboard />}
          {active === "Messages" && <MessagesPage />}
          {active === "Homestay Data" && <HomestayData onSaved={() => show("Saved")} />}
          {active === "FAQ" && <FAQPage onSaved={() => show("Saved")} />}
          {active === "Chat Tester" && <ChatTester onLogged={() => show("Test Recorded")} />}
          {active === "User Management" && <UserManagementPage onSaved={() => show("User Saved")} />}
          {active === "Settings" && <SettingsPage onSaved={() => show("Settings Saved")} />}
          {active === "Logs" && <LogsPage />}
          {active === "Legal" && <LegalPage />}
        </div>
        <Footer />
      </main>
      {toast}
    </div>
  );
}
