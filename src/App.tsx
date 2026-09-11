import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import EmergencyReportForm from './components/EmergencyReportForm';
import IncidentAnalysis from './components/IncidentAnalysis';
import SankatBrigadeAssistant from './components/SankatBrigadeAssistant';
import AssistantDock from './components/AssistantDock';
import AssistantPage from './components/AssistantPage';
import CommandCenter from './components/CommandCenter';
import ResourcesPage from './components/ResourcesPage';
import AboutPage from './components/AboutPage';
import IntroLoader from './components/IntroLoader';
import InstallPrompt from './components/InstallPrompt';
import FeaturesSection from './components/FeaturesSection';
import SafetyNotice from './components/SafetyNotice';
import Icon, { BrandMark } from './components/Icons';
import type { Incident } from './types/incident';
import { ROUTE_TITLE, useHashRoute, type Route } from './utils/router';
import {
  introAlreadySeen,
  loadIncidents,
  loadTheme,
  markIntroSeen,
  resetDemoData,
  saveIncidents,
  saveTheme,
  storageAvailable,
  type ThemeName,
} from './utils/storage';
import { analyseReport, type ReportInput } from './utils/incidentFactory';
import { useAssistant } from './hooks/useAssistant';

export default function App() {
  const [route, navigate] = useHashRoute();
  const [showIntro, setShowIntro] = useState(() => !introAlreadySeen());
  const [theme, setTheme] = useState<ThemeName>(() => loadTheme());
  const [incidents, setIncidents] = useState<Incident[]>(() => loadIncidents());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dockOpen, setDockOpen] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  /* ---- theme ---- */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b1120' : '#eef2fa');
    saveTheme(theme);
  }, [theme]);

  /* ---- connectivity ---- */
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  /* ---- toast auto-dismiss ---- */
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const persist = useCallback((next: Incident[]) => {
    setIncidents(next);
    saveIncidents(next);
  }, []);

  const handleSubmitReport = useCallback(
    (input: ReportInput) => {
      const incident = analyseReport(input);
      persist([incident, ...incidents]);
      setActiveId(incident.incident_id);
      setSelectedId(incident.incident_id);
      navigate('analysis');
    },
    [incidents, navigate, persist],
  );

  const handleUpdateIncident = useCallback(
    (updated: Incident) => {
      persist(incidents.map((item) => (item.incident_id === updated.incident_id ? updated : item)));
    },
    [incidents, persist],
  );

  const handleResetDemo = useCallback(() => {
    const seeded = resetDemoData();
    setIncidents(seeded);
    setSelectedId(null);
    setActiveId(null);
    setToast('Demo data reset. All locally stored reports were cleared from this browser.');
  }, []);

  const activeIncident = useMemo(
    () => incidents.find((incident) => incident.incident_id === activeId) ?? null,
    [incidents, activeId],
  );

  const criticalCount = useMemo(
    () => incidents.filter((incident) => incident.final_urgency === 'critical').length,
    [incidents],
  );

  const openResourceCount = useMemo(
    () =>
      incidents.filter(
        (incident) => incident.resource_needed !== 'none' && incident.lifecycle_status !== 'resolved',
      ).length,
    [incidents],
  );

  const goToCommand = useCallback(
    (incidentId?: string) => {
      if (incidentId) setSelectedId(incidentId);
      navigate('command');
    },
    [navigate],
  );

  // One assistant conversation, shared by the floating dock, the Assistant
  // screen and the panel beside an incident.
  const assistant = useAssistant({
    incident: activeIncident,
    onUpdateIncident: handleUpdateIncident,
    onCreateReport: (text) => {
      setDockOpen(false);
      handleSubmitReport({
        text,
        locationLabel: '',
        coords: null,
        photoDataUrl: null,
        photoName: null,
        usedVoice: false,
        video: null,
        audio: null,
        resourceNeed: 'auto',
        resourceQuantity: null,
      });
    },
    onNavigate: (next) => {
      setDockOpen(false);
      navigate(next);
    },
    onDetach: () => setActiveId(null),
  });

  if (showIntro) {
    return (
      <IntroLoader
        onDone={() => {
          markIntroSeen();
          setShowIntro(false);
        }}
      />
    );
  }

  return (
    <div className="sb-app">
      <div className="sb-backdrop" aria-hidden="true" />
      <a className="sb-skip-link" href="#sb-main">
        Skip to main content
      </a>

      <Header
        route={route}
        onNavigate={(next: Route) => navigate(next)}
        criticalCount={criticalCount}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
      />

      {!online && (
        <div className="sb-offline" role="status">
          You are offline. Limited prototype access is available offline — real-time coordination requires
          connectivity.
        </div>
      )}

      <main className="sb-main" id="sb-main">
        <div className="sb-container">
          <InstallPrompt />

          {!storageAvailable() && (
            <div className="sb-install" role="status">
              <Icon name="info" size={18} />
              <span className="sb-install__text">
                This browser is blocking local storage, so incidents will be kept in memory for this session
                only. Everything else works normally.
              </span>
            </div>
          )}

          {route === 'report' && (
            <div className="sb-grid">
              <Hero
                total={incidents.length}
                critical={criticalCount}
                resources={openResourceCount}
                onReport={() => {
                  document.getElementById('sb-report-text')?.focus();
                  document.getElementById('sb-report-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                onCommand={() => goToCommand()}
                onAssistant={() => navigate('assistant')}
              />
              <div id="sb-report-form" className="sb-section" style={{ marginTop: 4 }}>
                <EmergencyReportForm onSubmit={handleSubmitReport} />
              </div>
              <FeaturesSection onNavigate={navigate} />
            </div>
          )}

          {route === 'analysis' && activeIncident && (
            <div className="sb-grid">
              <div className="sb-section__head" style={{ marginBottom: 0 }}>
                <div>
                  <p className="sb-eyebrow">Incident analysis</p>
                  <h1 className="sb-section__title" style={{ fontSize: 'clamp(1.4rem, 1.1rem + 1.4vw, 2rem)' }}>
                    {activeIncident.incident_id} — structured from your report
                  </h1>
                </div>
              </div>
              <SafetyNotice compact />
              <div className="sb-command-layout">
                <IncidentAnalysis
                  incident={activeIncident}
                  onOpenCommand={() => goToCommand(activeIncident.incident_id)}
                  onNewReport={() => {
                    setActiveId(null);
                    navigate('report');
                  }}
                />
                <SankatBrigadeAssistant api={assistant} />
              </div>
            </div>
          )}

          {route === 'analysis' && !activeIncident && (
            <div className="sb-card">
              <h1 className="sb-card__title">No report selected</h1>
              <p className="sb-card__sub" style={{ marginTop: 8 }}>
                Submit an emergency report to see its structured analysis, or open the Command Center to review
                the incidents already in the queue.
              </p>
              <div className="sb-btn-row" style={{ marginTop: 14 }}>
                <button type="button" className="sb-btn sb-btn--primary" onClick={() => navigate('report')}>
                  Report an emergency
                </button>
                <button type="button" className="sb-btn sb-btn--ghost" onClick={() => goToCommand()}>
                  View Command Center
                </button>
              </div>
            </div>
          )}

          {route === 'command' && (
            <CommandCenter
              incidents={incidents}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onUpdateIncident={handleUpdateIncident}
              onResetDemo={handleResetDemo}
            />
          )}

          {route === 'assistant' && <AssistantPage api={assistant} />}
          {route === 'resources' && <ResourcesPage />}
          {route === 'about' && <AboutPage />}
        </div>
      </main>

      <footer className="sb-footer">
        <div className="sb-container">
          <div className="sb-footer__grid">
            <div>
              <div className="sb-footer__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BrandMark size={24} />
                SANKATBRIGADE
              </div>
              <p>
                From emergency reports to coordinated action. A student prototype for hyper-local emergency
                information handling.
              </p>
            </div>
            <div>
              <div className="sb-footer__title">Safety</div>
              <p>
                For immediate life-threatening danger, contact local emergency services now. Do not wait for
                SankatBrigade. This prototype does not contact any responder.
              </p>
            </div>
            <div>
              <div className="sb-footer__title">Screens</div>
              <p>
                {(['report', 'assistant', 'command', 'resources', 'about'] as Route[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="sb-nav-link"
                    style={{ padding: '4px 0', display: 'block' }}
                    onClick={() => navigate(item)}
                  >
                    {item === 'report' ? 'Report Emergency' : ROUTE_TITLE[item]}
                  </button>
                ))}
              </p>
            </div>
          </div>
          <div className="sb-footer__bottom">
            <span>Prototype only · No data leaves your device · No emergency service integration</span>
            <span>Made by Jaykrishna Navlani</span>
          </div>
        </div>
      </footer>

      {/* The assistant is reachable from every screen. It is hidden only where a
          full assistant panel is already on screen, so there is never a duplicate. */}
      {route !== 'assistant' && !(route === 'analysis' && activeIncident) && (
        <AssistantDock api={assistant} open={dockOpen} onOpenChange={setDockOpen} />
      )}

      {toast && (
        <div className="sb-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
