import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronsLeft,
  ChevronsRight,
  CircleAlert,
  ClipboardList,
  Clock3,
  FilePenLine,
  GraduationCap,
  Home,
  LayoutDashboard,
  ListChecks,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Upload,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  admissionsReducer,
  daysUntil,
  formatDate,
  getLinkedApplicationNames,
  loadAdmissionsState,
  resetAdmissionsState,
  saveAdmissionsState,
  selectors,
  sortDeadlines,
} from "./admissionsData.js";
import { getBackendMode } from "./services/backendClient.js";
import { applicationService } from "./services/applicationService.js";
import { calendarService } from "./services/calendarService.js";
import { deadlineService } from "./services/deadlineService.js";
import { documentService } from "./services/documentService.js";
import { essayService } from "./services/essayService.js";
import { recommenderService } from "./services/recommenderService.js";
import { settingsService } from "./services/settingsService.js";
import { taskService } from "./services/taskService.js";
import { universityService } from "./services/universityService.js";
import "./styles.css";

const AdmissionsContext = createContext(null);

function useAdmissions() {
  const value = useContext(AdmissionsContext);
  if (!value) throw new Error("useAdmissions must be used inside AdmissionsProvider");
  return value;
}

function AdmissionsProvider({ children }) {
  const [state, dispatch] = useReducer(admissionsReducer, undefined, loadAdmissionsState);

  useEffect(() => {
    let active = true;
    applicationService.loadInitialData().then((backendState) => {
      if (active && backendState) dispatch({ type: "HYDRATE_STATE", payload: backendState });
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    saveAdmissionsState(state);
  }, [state]);

  const actions = useMemo(
    () => ({
      addUniversity: async (payload) => {
        await applicationService.addUniversityApplication(payload);
        dispatch({ type: "ADD_UNIVERSITY", payload });
      },
      updateTaskStatus: async (taskId, status) => {
        await taskService.updateTaskStatus(taskId, status);
        dispatch({ type: "UPDATE_TASK_STATUS", taskId, status });
      },
      updateEssayStatus: async (essayId, status) => {
        await essayService.updateEssayStatus(essayId, status);
        dispatch({ type: "UPDATE_ESSAY_STATUS", essayId, status });
      },
      updateEssayContent: async (essayId, content) => {
        await essayService.updateEssayContent(essayId, content);
        dispatch({ type: "UPDATE_ESSAY_CONTENT", essayId, content });
      },
      updateDocumentStatus: async (documentId, status) => {
        await documentService.updateDocumentStatus(documentId, status);
        dispatch({ type: "UPDATE_DOCUMENT_STATUS", documentId, status });
      },
      uploadDocument: async (documentId, file) => {
        const fileMetadata = await documentService.uploadDocument(documentId, file);
        dispatch({ type: "UPLOAD_DOCUMENT", documentId, fileMetadata });
      },
      markDocumentNotRequired: async (documentId) => {
        await documentService.markNotRequired(documentId);
        dispatch({ type: "MARK_DOCUMENT_NOT_REQUIRED", documentId });
      },
      addCustomDocument: async (payload) => {
        await documentService.addCustomDocument(payload);
        dispatch({ type: "ADD_CUSTOM_DOCUMENT", payload });
      },
      updateRecommenderStatus: async (requirementId, status) => {
        await recommenderService.updateRecommenderStatus(requirementId, status);
        dispatch({ type: "UPDATE_RECOMMENDER_STATUS", requirementId, status });
      },
      markDeadlineSubmitted: async (deadlineId) => {
        await deadlineService.updateDeadlineStatus(deadlineId, "Submitted");
        dispatch({ type: "MARK_DEADLINE_SUBMITTED", deadlineId });
      },
      addDeadline: async (payload) => {
        await deadlineService.addCustomDeadline(payload);
        dispatch({ type: "ADD_DEADLINE", payload });
      },
      updateDeadlineDate: async (deadlineId, dueDate) => {
        await deadlineService.updateDeadlineDate(deadlineId, dueDate);
        dispatch({ type: "UPDATE_DEADLINE_DATE", deadlineId, dueDate });
      },
      deleteDeadline: async (deadlineId) => {
        await calendarService.deleteCustomEvent(deadlineId);
        dispatch({ type: "DELETE_DEADLINE", deadlineId });
      },
      updateSettings: async (payload) => {
        await settingsService.updateUserPreferences(payload);
        dispatch({ type: "UPDATE_SETTINGS", payload });
      },
      reset: () => dispatch({ type: "RESET", payload: resetAdmissionsState() }),
    }),
    [],
  );

  return <AdmissionsContext.Provider value={{ state, actions }}>{children}</AdmissionsContext.Provider>;
}

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const { state } = useAdmissions();
  const nextDeadline = selectors.getUpcomingDeadlines(state)[0];

  return (
    <main className={`appShell ${collapsed ? "sidebarCollapsed" : ""}`}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand">
          <div className="brandWordmark" aria-label="EdRizz">
            <span className="brandE">
              <GraduationCap size={21} strokeWidth={3} />
              e
            </span>
            <span>drizz</span>
          </div>
          <span className="brandTagline">Admissions OS</span>
        </div>

        <button type="button" className="sidebarToggle" onClick={() => setCollapsed((value) => !value)}>
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          <span>{collapsed ? "Expand" : "Minimize"}</span>
        </button>

        <nav>
          <NavButton page="dashboard" activePage={activePage} onClick={setActivePage} icon={LayoutDashboard} label="Dashboard" />
          <NavButton page="applications" activePage={activePage} onClick={setActivePage} icon={ListChecks} label="Applications" />
          <NavButton page="universities" activePage={activePage} onClick={setActivePage} icon={Search} label="Universities" />
          <NavButton page="essays" activePage={activePage} onClick={setActivePage} icon={FilePenLine} label="Essays" />
          <NavButton page="documents" activePage={activePage} onClick={setActivePage} icon={ClipboardList} label="Documents" />
          <NavButton page="recommenders" activePage={activePage} onClick={setActivePage} icon={UsersRound} label="Recommenders" />
          <NavButton page="scholarships" activePage={activePage} onClick={setActivePage} icon={WalletCards} label="Scholarships" />
          <NavButton page="deadlines" activePage={activePage} onClick={setActivePage} icon={CalendarDays} label="Deadlines" />
          <NavButton page="tasks" activePage={activePage} onClick={setActivePage} icon={Check} label="Tasks" />
          <NavButton page="calendar" activePage={activePage} onClick={setActivePage} icon={Clock3} label="Calendar" />
          <NavButton page="settings" activePage={activePage} onClick={setActivePage} icon={Settings} label="Settings" />
        </nav>

        <section className="deadlinePanel">
          <div>
            <CircleAlert size={18} />
            <strong>Next deadline</strong>
          </div>
          <p>{nextDeadline ? nextDeadline.title : "Add a university to begin"}</p>
          <span>{nextDeadline ? `${formatDate(nextDeadline.dueDate)} - ${displayConfidence(nextDeadline.confidenceLevel)}` : "No connected deadlines yet"}</span>
        </section>
      </aside>

      <section className="workspace">
        {activePage === "dashboard" && <DashboardPage onNavigate={setActivePage} />}
        {activePage === "applications" && <ApplicationsPage />}
        {activePage === "universities" && <UniversitiesPage />}
        {activePage === "essays" && <EssaysPage />}
        {activePage === "documents" && <DocumentsPage />}
        {activePage === "recommenders" && <RecommendersPage />}
        {activePage === "scholarships" && <ScholarshipsPage />}
        {activePage === "deadlines" && <DeadlinesPage />}
        {activePage === "tasks" && <TasksPage />}
        {activePage === "calendar" && <CalendarPage />}
        {activePage === "settings" && <SettingsPage />}
      </section>
    </main>
  );
}

function NavButton({ page, activePage, onClick, icon: Icon, label }) {
  return (
    <button title={label} className={`navItem ${activePage === page ? "active" : ""}`} onClick={() => onClick(page)}>
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

function PageHeader({ eyebrow, title, children }) {
  return (
    <header className="topbar connectedTopbar">
      <div>
        <p className="greeting">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <div className="topActions">{children}</div>
    </header>
  );
}

function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          <button type="button" disabled={!item.onClick} onClick={item.onClick}>
            {item.label}
          </button>
          {index < items.length - 1 && <span>&gt;</span>}
        </React.Fragment>
      ))}
    </nav>
  );
}

function ConfidenceBadge({ level }) {
  return <span className={`sourceBadge ${String(level || "NeedsVerification").replace(/\s+/g, "")}`}>{displayConfidence(level)}</span>;
}

function displayConfidence(level) {
  return {
    PlatformDefault: "Platform default",
    AIExtracted: "AI-extracted",
    UserEntered: "User-entered",
    NeedsVerification: "Needs verification",
  }[level] || level || "Needs verification";
}

function displayPlatform(platform) {
  return {
    CommonApp: "Common App",
    DirectPortal: "Direct portal",
    StudyLink: "StudyLink",
    NeedsVerification: "Platform needs verification",
  }[platform] || platform || "Platform needs verification";
}

function StatusPill({ value }) {
  return <span className="statusPill">{String(value || "NotStarted").replace(/([a-z])([A-Z])/g, "$1 $2")}</span>;
}

function RiskBadge({ value }) {
  return <span className={`riskBadge ${String(value || "Low").toLowerCase()}`}>{value || "Low"}</span>;
}

function ProgressBar({ value }) {
  return (
    <div className="progress">
      <span style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} />
    </div>
  );
}

function EmptyState({ title, action }) {
  return (
    <section className="panel emptyState">
      <Sparkles size={26} />
      <h2>{title}</h2>
      <p>Add a university and EdRizz will build the application roadmap, writing work, documents, recommendations, deadlines, scholarships, and tasks around it.</p>
      {action}
    </section>
  );
}

function DashboardPage({ onNavigate }) {
  const { state } = useAdmissions();
  const apps = selectors.getApplications(state);
  const groups = selectors.getGroups(state);
  const deadlines = selectors.getUpcomingDeadlines(state);
  const essays = selectors.getAllEssays(state);
  const docs = selectors.getAllDocuments(state);
  const recs = selectors.getAllRecommenders(state);
  const tasks = selectors.getAllTasks(state);
  const nextMove = selectors.getNextBestMove(state);
  const needsVerification = selectors.getItemsNeedingVerification(state);
  const dueThisWeek = tasks.filter((task) => task.status !== "Complete" && daysUntil(task.dueDate) <= 7).length;

  return (
    <>
      <PageHeader eyebrow="Your admissions command center" title="Today's application plan">
        <button className="primaryButton" onClick={() => onNavigate("universities")}><Plus size={18} /> Add university</button>
      </PageHeader>

      {apps.length === 0 ? (
        <EmptyState title="Start by adding a university" action={<button className="primaryButton" onClick={() => onNavigate("universities")}><Plus size={18} /> Add a university</button>} />
      ) : (
        <>
          <section className="nextMoveHero">
            <div>
              <p>Next best move</p>
              <h2>{nextMove?.title || "Everything looks calm"}</h2>
              <span>
                {nextMove
                  ? `${nextMove.priority} priority - affects ${nextMove.linkedApplicationIds.length} application${nextMove.linkedApplicationIds.length === 1 ? "" : "s"} - ${displayConfidence(nextMove.confidenceLevel)}`
                  : "No open tasks"}
              </span>
            </div>
            <div className="nextMoveActions">
              {nextMove && <TaskActionButton task={nextMove} />}
              <button className="secondaryButton" onClick={() => onNavigate("tasks")}><Check size={17} /> View tasks</button>
            </div>
          </section>

          <section className="statsGrid">
            <StatCard icon={GraduationCap} label="Active applications" value={apps.length} detail={`${groups.length} shared application setup${groups.length === 1 ? "" : "s"}`} />
            <StatCard icon={CalendarDays} label="Next deadline" value={deadlines[0] ? formatDate(deadlines[0].dueDate) : "None"} detail={deadlines[0]?.title || "No connected deadline"} />
            <StatCard icon={FilePenLine} label="Essay progress" value={`${essays.filter((essay) => essay.status === "Complete").length}/${essays.length}`} detail="Shared essays count once" />
            <StatCard icon={CircleAlert} label="Needs verification" value={needsVerification.length} detail={`${dueThisWeek} task${dueThisWeek === 1 ? "" : "s"} due this week`} />
          </section>

          <section className="connectedGrid">
            <div className="panel">
              <div className="panelHeader">
                <div>
                  <p>Applications at risk</p>
                  <h2>Progress by university choice</h2>
                </div>
              </div>
              <div className="connectedList">
                {apps.map((app) => (
                  <article className="connectedRow" key={app.id}>
                    <div>
                      <strong>{app.universityName}</strong>
                      <span>{app.programName} - {displayPlatform(app.platform)}</span>
                    </div>
                    <ProgressBar value={app.progressPercentage} />
                    <RiskBadge value={app.riskLevel} />
                  </article>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panelHeader">
                <div>
                  <p>Missing work</p>
                  <h2>Operating picture</h2>
                </div>
              </div>
              <div className="metricStack">
                <Metric label="Missing documents" value={docs.filter((doc) => doc.status !== "Uploaded").length} />
                <Metric label="Pending recommenders" value={recs.filter((rec) => rec.status !== "Submitted").length} />
                <Metric label="Upcoming deadlines" value={deadlines.length} />
                <Metric label="Recently updated" value={state.recentlyUpdated[0]?.label || "Nothing yet"} />
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <article className="stat">
      <div className="statIcon"><Icon size={19} /></div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </article>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metricRow">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function UniversitiesPage() {
  const { state, actions } = useAdmissions();
  const [query, setQuery] = useState("");
  const [programName, setProgramName] = useState(state.settings.intendedMajors?.[0] || "Computer Science");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [degreeLevel, setDegreeLevel] = useState(state.settings.defaultApplicationLevel || "undergraduate");
  const [intake, setIntake] = useState(state.settings.preferredIntake || "Fall 2027");
  const [platform, setPlatform] = useState("Auto");
  const [results, setResults] = useState([]);
  const [resultMeta, setResultMeta] = useState({ source: getBackendMode(), total: 0 });
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [platformOverrides, setPlatformOverrides] = useState({});

  function add(source, overridePlatform) {
    const selectedPlatform = overridePlatform || platform;
    actions.addUniversity({
      name: source.name,
      country: source.country,
      programName: programName || source.defaultProgram,
      intake,
      level: degreeLevel,
      platform: selectedPlatform,
      source,
    });
  }

  function runSearch() {
    setIsSearching(true);
    setSearchError("");
    universityService
      .searchUniversities(query, { country, city, programName, degreeLevel, platform, intake })
      .then((data) => {
        setResults(data.results);
        setResultMeta({ source: data.source, total: data.total, error: data.error });
        if (data.error) setSearchError(data.error);
      })
      .catch((error) => {
        setResults([]);
        setResultMeta({ source: "error", total: 0 });
        setSearchError(error.message || "Could not search universities.");
      })
      .finally(() => setIsSearching(false));
  }

  useEffect(() => {
    const id = window.setTimeout(runSearch, 250);
    return () => window.clearTimeout(id);
  }, [query, country, city, programName, degreeLevel, platform, intake]);

  return (
    <>
      <PageHeader eyebrow="Add a university" title="Review application setup">
        <button className="secondaryButton" onClick={() => actions.reset()}><RefreshCw size={17} /> Reset local data</button>
      </PageHeader>

      <section className="panel addFlowPanel">
        <div className="formGrid">
          <label>
            <span>Search universities</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="UCL, Toronto, MIT, NYU..." />
          </label>
          <label>
            <span>Program or major</span>
            <input value={programName} onChange={(event) => setProgramName(event.target.value)} placeholder="BSc Computer Science" />
          </label>
          <label>
            <span>Country</span>
            <input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="United Kingdom" />
          </label>
          <label>
            <span>City</span>
            <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="London" />
          </label>
          <label>
            <span>Select intake</span>
            <input value={intake} onChange={(event) => setIntake(event.target.value)} placeholder="Fall 2027" />
          </label>
          <label>
            <span>Degree level</span>
            <select value={degreeLevel} onChange={(event) => setDegreeLevel(event.target.value)}>
              <option value="undergraduate">Undergraduate</option>
              <option value="graduate">Graduate</option>
            </select>
          </label>
          <label>
            <span>Confirm application platform</span>
            <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
              <option value="Auto">Auto</option>
              <option value="UCAS">UCAS</option>
              <option value="CommonApp">Common App</option>
              <option value="OUAC">OUAC</option>
              <option value="DirectPortal">Direct Portal</option>
              <option value="Coalition">Coalition</option>
              <option value="StudyLink">StudyLink</option>
              <option value="UAC">UAC</option>
              <option value="NeedsVerification">Needs verification</option>
              <option value="Other">Other</option>
            </select>
          </label>
        </div>
        <p className="connectedNote">
          Search uses the configured backend when available, otherwise the project university data source. Shared tasks are detected automatically when applications use the same platform.
        </p>
      </section>

      <section className="searchStatusRow">
        <div>
          <strong>{isSearching ? "Searching..." : `${resultMeta.total} result${resultMeta.total === 1 ? "" : "s"}`}</strong>
          <span>{resultMeta.source === "fallback" ? "Using demo fallback because the data source failed." : `Source: ${resultMeta.source || getBackendMode()}`}</span>
        </div>
        {searchError && <button className="secondaryButton" onClick={runSearch}><RefreshCw size={16} /> Retry</button>}
      </section>

      {searchError && <p className="directoryError">{searchError}</p>}
      {!isSearching && results.length === 0 && (
        <section className="panel emptyState compactEmpty">
          <h2>No universities found</h2>
          <p>Try a broader university name, country, or program. Manual add is available when the data source does not have a result yet.</p>
          <button className="secondaryButton" onClick={() => setManualOpen((open) => !open)}><Plus size={17} /> Manual add</button>
        </section>
      )}

      {manualOpen && (
        <section className="panel addFlowPanel">
          <h2>Manual add</h2>
          <button
            className="primaryButton"
            onClick={() => add({
              name: query || "Custom university",
              country: country || "Needs verification",
              city,
              defaultProgram: programName || "Program to confirm",
              platform: platform === "Auto" ? undefined : platform,
              platformConfidenceLevel: "UserEntered",
              confidenceLevel: "UserEntered",
              sourceName: "User-entered",
              notes: "Manual record. Requirements, platform, and deadlines need verification.",
            })}
          >
            <Plus size={17} /> Add manual university
          </button>
        </section>
      )}

      <section className="connectedGrid three">
        {results.map((source) => {
          const exists = Object.values(state.universities).some((university) => university.name === source.name);
          const overridePlatform = platformOverrides[source.key] || "Auto";
          const detectedPlatform = overridePlatform === "Auto" ? source.platform : overridePlatform;
          const platformConfidence = overridePlatform === "Auto" ? source.platformConfidenceLevel : "UserEntered";
          const platformSourceLabel = overridePlatform !== "Auto"
            ? "User selected"
            : source.platformSource === "source" && source.platformConfidenceLevel === "Verified"
              ? "Verified from source"
            : source.platformSource === "uncertain"
                ? "Needs verification"
                : "Inferred from country/application type";
          return (
            <article className="panel sourceCard" key={source.key}>
              <div>
                <h2>{source.name}</h2>
                <p>{source.country}{source.city ? ` - ${source.city}` : ""} - {source.defaultProgram}</p>
              </div>
              <div className="badgeRow">
                <span className="pill" title={source.platformReason || "Application platform detection"}>{displayPlatform(detectedPlatform)}</span>
                {source.rank && <span className="rankPill">QS #{source.rank}</span>}
                <ConfidenceBadge level={platformConfidence} />
              </div>
              <div className={`platformPreview ${detectedPlatform === "NeedsVerification" ? "warning" : ""}`}>
                <strong>Detected platform: {displayPlatform(detectedPlatform)}</strong>
                <span>Confidence: {displayConfidence(platformConfidence)}</span>
                <p>{source.platformReason || "Application platform needs verification before applying."}</p>
                <small>{platformSourceLabel}</small>
                {detectedPlatform === "NeedsVerification" && (
                  <em>We could not confidently determine the application platform. Please verify on the official admissions page before applying.</em>
                )}
              </div>
              <label className="inlineSelect">
                <span>Change platform</span>
                <select
                  value={overridePlatform}
                  onChange={(event) => setPlatformOverrides((current) => ({ ...current, [source.key]: event.target.value }))}
                >
                  <option value="Auto">Auto ({displayPlatform(source.platform)})</option>
                  {[source.platform, ...(source.platformAlternatives || []), "CommonApp", "Coalition", "DirectPortal", "NeedsVerification", "Other"]
                    .filter(Boolean)
                    .filter((option, index, list) => list.indexOf(option) === index && option !== "Auto")
                    .map((option) => <option value={option} key={option}>{displayPlatform(option)}</option>)}
                </select>
              </label>
              <p>{source.notes}</p>
              <small className="sourceTiny">{source.sourceName || "University data source"} - {platformSourceLabel}</small>
              <button className="primaryButton" disabled={exists} onClick={() => add(source, overridePlatform)}>
                <Plus size={17} /> {exists ? "Already added" : "Review and add"}
              </button>
            </article>
          );
        })}
      </section>
    </>
  );
}

function ApplicationsPage() {
  const { state } = useAdmissions();
  const [view, setView] = useState({ type: "overview" });
  const apps = selectors.getApplications(state);
  const groups = selectors.getGroups(state);

  if (apps.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Applications" title="Add your first application" />
        <EmptyState title="Add a university to create applications" />
      </>
    );
  }

  if (view.type === "group") {
    const group = state.applicationGroups[view.id];
    return <RoadmapView mode="group" group={group} onBack={() => setView({ type: "overview" })} />;
  }

  if (view.type === "application") {
    const app = state.applications[view.id];
    return <RoadmapView mode="application" application={app} onBack={() => setView({ type: "overview" })} />;
  }

  return (
    <>
      <PageHeader eyebrow="Applications" title="Applications and roadmaps" />
      <section className="applicationsOverview">
        <div className="panel">
          <div className="panelHeader">
            <div>
              <p>Shared applications detected</p>
              <h2>Shared application work</h2>
            </div>
          </div>
          <div className="connectedList">
            {groups.map((group) => (
              <button className="overviewButton" key={group.id} onClick={() => setView({ type: "group", id: group.id })}>
                <div>
                  <strong>{group.name}</strong>
                  <span>{group.linkedApplicationIds.map((id) => state.applications[id]?.universityName).filter(Boolean).join(", ")}</span>
                </div>
                <ProgressBar value={group.progressPercentage} />
                <span className="pill">{displayPlatform(group.platform)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <div>
              <p>Individual details</p>
              <h2>University roadmaps</h2>
            </div>
          </div>
          <div className="connectedList">
            {apps.map((app) => (
              <button className="overviewButton" key={app.id} onClick={() => setView({ type: "application", id: app.id })}>
                <div>
                  <strong>{app.universityName}</strong>
                  <span>{app.programName} - {displayPlatform(app.platform)}</span>
                  {app.platformReason && <small>{app.platformReason}</small>}
                </div>
                <ProgressBar value={app.progressPercentage} />
                <RiskBadge value={app.riskLevel} />
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function RoadmapView({ mode, group, application, onBack }) {
  const { state, actions } = useAdmissions();
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const isGroup = mode === "group";
  const linkedApps = isGroup ? group.linkedApplicationIds.map((id) => state.applications[id]).filter(Boolean) : [application];
  const taskItems = isGroup ? selectors.getTasksForGroup(state, group.id) : selectors.getTasksForApplication(state, application.id);
  const stageItems = Object.values(state.roadmapStages)
    .filter((stage) => (isGroup ? stage.groupId === group.id : stage.applicationId === application.id))
    .sort((a, b) => a.order - b.order);
  const selectedTask = state.tasks[selectedTaskId] || taskItems[0];

  return (
    <>
      <div className="detailTopbar">
        <Breadcrumbs
          items={[
            { label: "Applications", onClick: onBack },
            isGroup ? { label: group.platform } : { label: "Roadmap" },
            { label: isGroup ? group.name : application.universityName },
          ]}
        />
        <div className="topActions">
          <button className="secondaryButton" onClick={onBack}><X size={17} /> Close roadmap</button>
          <button className="primaryButton" onClick={onBack}><Home size={17} /> Back to applications</button>
        </div>
      </div>

      <section className="nextMoveHero roadmapHero">
        <div>
          <p>{isGroup ? "Grouped platform roadmap" : "University roadmap"}</p>
          <h2>{isGroup ? group.name : application.universityName}</h2>
          <span>{linkedApps.length} linked university choice{linkedApps.length === 1 ? "" : "s"} - shared tasks update every linked application</span>
        </div>
        <div>
          <ProgressBar value={isGroup ? group.progressPercentage : application.progressPercentage} />
          <div className="badgeRow">
            <span className="pill">{displayPlatform(isGroup ? group.platform : application.platform)}</span>
            {!isGroup && application.platformConfidence && <ConfidenceBadge level={application.platformConfidence} />}
            {!isGroup && <RiskBadge value={application.riskLevel} />}
          </div>
          {!isGroup && application.platformReason && <p className="connectedNote">{application.platformReason}</p>}
        </div>
      </section>

      <section className="roadmapWorkspace">
        <div className="panel stageColumn">
          <h2>Roadmap stages</h2>
          {stageItems.map((stage) => (
            <article className="stageItem connectedStage" key={stage.id}>
              <div>
                <strong>{stage.title}</strong>
                <span>{stage.taskIds.length} linked task{stage.taskIds.length === 1 ? "" : "s"}</span>
              </div>
              <StatusPill value={stage.status} />
            </article>
          ))}
        </div>

        <div className="panel taskColumn">
          <div className="panelHeader">
            <div>
              <p>Linked shared tasks</p>
              <h2>Tasks</h2>
            </div>
          </div>
          <div className="connectedList">
            {taskItems.map((task) => (
              <button className={`taskLine ${selectedTask?.id === task.id ? "active" : ""}`} key={task.id} onClick={() => setSelectedTaskId(task.id)}>
                <input
                  type="checkbox"
                  checked={task.status === "Complete"}
                  onChange={(event) => {
                    event.stopPropagation();
                    actions.updateTaskStatus(task.id, task.status === "Complete" ? "InProgress" : "Complete");
                  }}
                />
                <span>
                  <strong>{task.title}</strong>
                  <small>{task.type} - {task.linkedApplicationIds.length} linked app{task.linkedApplicationIds.length === 1 ? "" : "s"}</small>
                </span>
                <ConfidenceBadge level={task.confidenceLevel} />
              </button>
            ))}
          </div>
        </div>

        <TaskDetailPanel task={selectedTask} />
      </section>
    </>
  );
}

function TaskDetailPanel({ task }) {
  const { state, actions } = useAdmissions();
  if (!task) return <aside className="panel taskDetailPanel">No task selected.</aside>;
  return (
    <aside className="panel taskDetailPanel">
      <p>Task detail</p>
      <h2>{task.title}</h2>
      <div className="badgeRow">
        <StatusPill value={task.status} />
        <ConfidenceBadge level={task.confidenceLevel} />
      </div>
      <p>{task.description || "No description supplied."}</p>
      <dl className="detailFacts">
        <div><dt>Due</dt><dd>{formatDate(task.dueDate)}</dd></div>
        <div><dt>Priority</dt><dd>{task.priority}</dd></div>
        <div><dt>Linked apps</dt><dd>{getLinkedApplicationNames(state, task.linkedApplicationIds).join(", ") || "None"}</dd></div>
        <div><dt>Source</dt><dd>{task.sourceName || "Needs verification"}</dd></div>
      </dl>
      <button className="primaryButton" onClick={() => actions.updateTaskStatus(task.id, task.status === "Complete" ? "InProgress" : "Complete")}>
        <Check size={17} /> {task.status === "Complete" ? "Mark in progress" : "Complete task"}
      </button>
    </aside>
  );
}

function EssaysPage() {
  const { state, actions } = useAdmissions();
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  const essays = selectors.getAllEssays(state);
  const selected = state.essays[editingId] || state.essays[selectedId] || essays[0];
  const grouped = groupBy(essays, (essay) => essay.linkedGroupIds?.[0] || essay.linkedApplicationIds?.[0] || "custom");
  const draftWords = countWords(draft);

  function openEditor(essay) {
    setSelectedId(essay.id);
    setEditingId(essay.id);
    setDraft(essay.content || "");
  }

  function closeEditor() {
    setEditingId(null);
    setDraft("");
  }

  function saveEssay() {
    if (!editingId) return;
    actions.updateEssayContent(editingId, draft);
  }

  return (
    <>
      <PageHeader eyebrow="Essays" title="Shared writing requirements">
        {editingId ? <button className="secondaryButton" onClick={closeEditor}>Back to essays</button> : selected && <button className="secondaryButton" onClick={() => setSelectedId(null)}>Back to essays</button>}
      </PageHeader>
      {essays.length === 0 ? <EmptyState title="No essays yet" /> : (
        <section className="twoColumnLayout">
          <div className="panel">
            {Object.entries(grouped).map(([key, items]) => (
              <section className="groupBlock" key={key}>
                <h2>{state.applicationGroups[key]?.name || state.applications[key]?.universityName || "Custom essays"}</h2>
                {items.map((essay) => (
                  <button className="overviewButton" key={essay.id} onClick={() => setSelectedId(essay.id)}>
                    <div>
                      <strong>{essay.title}</strong>
                      <span>{essay.linkedApplicationIds.length > 1 ? `Used by ${essay.linkedApplicationIds.length} university choices` : getLinkedApplicationNames(state, essay.linkedApplicationIds).join(", ")}</span>
                    </div>
                    <StatusPill value={essay.status} />
                    <ConfidenceBadge level={essay.confidenceLevel} />
                  </button>
                ))}
              </section>
            ))}
          </div>
          {selected && (
            <aside className="panel detailPanel">
              <Breadcrumbs items={[{ label: "Essays", onClick: () => setSelectedId(null) }, { label: selected.title }]} />
              <h2>{selected.title}</h2>
              <p>{selected.prompt}</p>
              {editingId ? (
                <section className="essayEditorPanel">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Write your essay here..."
                    aria-label={`Editor for ${selected.title}`}
                  />
                  <div className="editorMeta">
                    <span>{draftWords} words</span>
                    <span>{draft.length} characters</span>
                    <span>Status: {selected.status.replace(/([a-z])([A-Z])/g, "$1 $2")}</span>
                  </div>
                </section>
              ) : null}
              <dl className="detailFacts">
                <div><dt>Limit</dt><dd>{selected.wordLimit ? `${selected.wordLimit} words` : selected.characterLimit ? `${selected.characterLimit} characters` : "Needs verification"}</dd></div>
                <div><dt>Current</dt><dd>{selected.currentWordCount || 0} words / {selected.currentCharacterCount || 0} chars</dd></div>
                <div><dt>Deadline</dt><dd>{formatDate(state.deadlines[selected.deadlineId]?.dueDate)}</dd></div>
                <div><dt>Linked apps</dt><dd>{getLinkedApplicationNames(state, selected.linkedApplicationIds).join(", ")}</dd></div>
                <div><dt>Source</dt><dd>{selected.sourceName || "Needs verification"}</dd></div>
              </dl>
              <div className="buttonStack">
                {editingId ? (
                  <button className="primaryButton" onClick={saveEssay}><FilePenLine size={17} /> Save essay</button>
                ) : (
                  <button className="primaryButton" onClick={() => openEditor(selected)}><FilePenLine size={17} /> Open editor</button>
                )}
                <button className="secondaryButton" onClick={() => actions.updateEssayStatus(selected.id, "Complete")}><Check size={17} /> Mark complete</button>
                <button className="secondaryButton" onClick={() => actions.updateEssayStatus(selected.id, "NeedsReview")}><Sparkles size={17} /> Request EdRizz review</button>
              </div>
            </aside>
          )}
        </section>
      )}
    </>
  );
}

function DocumentsPage() {
  const { state, actions } = useAdmissions();
  const [selectedId, setSelectedId] = useState(null);
  const [customDoc, setCustomDoc] = useState({ title: "", category: "Needs verification", applicationId: "" });
  const documents = selectors.getAllDocuments(state);
  const selected = state.documents[selectedId] || documents[0];
  const grouped = groupBy(documents, (doc) => doc.category || (doc.confidenceLevel === "NeedsVerification" ? "Needs verification" : "University-specific"));

  return (
    <>
      <PageHeader eyebrow="Documents" title="Shared document requirements" />
      {documents.length === 0 ? <EmptyState title="No documents yet" /> : (
        <section className="twoColumnLayout">
          <div className="panel connectedList">
            <section className="compactForm">
              <input value={customDoc.title} onChange={(event) => setCustomDoc({ ...customDoc, title: event.target.value })} placeholder="Add custom document" />
              <select value={customDoc.category} onChange={(event) => setCustomDoc({ ...customDoc, category: event.target.value })}>
                {["Academic", "Identity", "Testing", "Financial", "Portfolio/supporting", "University-specific", "Needs verification"].map((category) => <option key={category}>{category}</option>)}
              </select>
              <button className="secondaryButton" onClick={() => customDoc.title && actions.addCustomDocument(customDoc)}><Plus size={16} /> Add</button>
            </section>
            {Object.entries(grouped).map(([category, items]) => (
              <section className="groupBlock" key={category}>
                <h2>{category}</h2>
                {items.map((doc) => (
                  <button className="overviewButton" key={doc.id} onClick={() => setSelectedId(doc.id)}>
                    <div>
                      <strong>{doc.title}</strong>
                      <span>{doc.required ? "Required" : "Optional"} by {doc.linkedApplicationIds.length} application{doc.linkedApplicationIds.length === 1 ? "" : "s"}{doc.blocksSubmission ? " - blocks submission" : ""}</span>
                    </div>
                    <StatusPill value={doc.status} />
                    <ConfidenceBadge level={doc.confidenceLevel} />
                  </button>
                ))}
              </section>
            ))}
          </div>
          {selected && (
            <aside className="panel detailPanel">
              <Breadcrumbs items={[{ label: "Documents", onClick: () => setSelectedId(null) }, { label: selected.title }]} />
              <h2>{selected.title}</h2>
              <p>{selected.description}</p>
              <dl className="detailFacts">
                <div><dt>Category</dt><dd>{selected.category || "Needs verification"}</dd></div>
                <div><dt>Required</dt><dd>{selected.required ? "Required" : "Optional / not required"}</dd></div>
                <div><dt>Blocks</dt><dd>{selected.blocksSubmission ? "Blocks submission" : "Does not block submission"}</dd></div>
                <div><dt>Linked apps</dt><dd>{getLinkedApplicationNames(state, selected.linkedApplicationIds).join(", ")}</dd></div>
                <div><dt>File</dt><dd>{selected.uploadedFiles?.[selected.uploadedFiles.length - 1]?.name || "No file uploaded"}</dd></div>
                <div><dt>Updated</dt><dd>{selected.lastUpdatedAt ? new Date(selected.lastUpdatedAt).toLocaleDateString() : "Not yet"}</dd></div>
                <div><dt>Source</dt><dd>{selected.sourceName || "Needs verification"}</dd></div>
                <div><dt>Confidence</dt><dd><ConfidenceBadge level={selected.confidenceLevel} /></dd></div>
              </dl>
              <label className="fileAction">
                <Upload size={17} />
                <span>Upload or replace file</span>
                <input type="file" onChange={(event) => event.target.files?.[0] && actions.uploadDocument(selected.id, event.target.files[0])} />
              </label>
              <div className="buttonStack">
                <button className="primaryButton" onClick={() => actions.updateDocumentStatus(selected.id, selected.status === "Uploaded" ? "InProgress" : "Uploaded")}>
                  <Upload size={17} /> {selected.status === "Uploaded" ? "Mark needs update" : "Mark uploaded"}
                </button>
                <button className="secondaryButton" onClick={() => actions.markDocumentNotRequired(selected.id)}>Mark not required</button>
              </div>
            </aside>
          )}
        </section>
      )}
    </>
  );
}

function RecommendersPage() {
  const { state, actions } = useAdmissions();
  const [selectedId, setSelectedId] = useState(null);
  const recs = selectors.getAllRecommenders(state);
  const selected = state.recommenderRequirements[selectedId] || recs[0];
  const people = Object.values(state.recommenderPeople || {});
  const grouped = groupBy(recs, (rec) => rec.platform || "Custom recommendation");

  return (
    <>
      <PageHeader eyebrow="Recommenders" title="References and recommenders" />
      {recs.length === 0 ? <EmptyState title="No recommender requirements yet" /> : (
        <section className="twoColumnLayout">
          <div className="panel connectedList">
            <section className="groupBlock">
              <h2>Recommendation requirements</h2>
            </section>
            {Object.entries(grouped).map(([platformName, items]) => (
              <section className="groupBlock" key={platformName}>
                <h2>{displayPlatform(platformName)}</h2>
                {items.map((rec) => (
                  <button className="overviewButton" key={rec.id} onClick={() => setSelectedId(rec.id)}>
                    <div>
                      <strong>{rec.title}</strong>
                      <span>{rec.required ? "Required" : "Optional"} - linked to {rec.linkedApplicationIds.length} application{rec.linkedApplicationIds.length === 1 ? "" : "s"}</span>
                    </div>
                    <StatusPill value={rec.status} />
                    <ConfidenceBadge level={rec.confidenceLevel} />
                  </button>
                ))}
              </section>
            ))}
            <section className="groupBlock">
              <h2>Recommender people</h2>
              {people.length === 0 ? <p className="connectedNote">No people assigned yet. Requirements can still be tracked by platform.</p> : people.map((person) => (
                <article className="connectedRow" key={person.id}>
                  <div><strong>{person.name}</strong><span>{person.role}</span></div>
                  <StatusPill value={person.status || "NotRequested"} />
                </article>
              ))}
            </section>
          </div>
          {selected && (
            <aside className="panel detailPanel">
              <Breadcrumbs items={[{ label: "Recommenders", onClick: () => setSelectedId(null) }, { label: selected.title }]} />
              <h2>{selected.title}</h2>
              <dl className="detailFacts">
                <div><dt>Due</dt><dd>{formatDate(selected.dueDate)}</dd></div>
                <div><dt>Linked apps</dt><dd>{getLinkedApplicationNames(state, selected.linkedApplicationIds).join(", ")}</dd></div>
                <div><dt>Assigned to</dt><dd>{selected.recommenderId ? state.recommenderPeople?.[selected.recommenderId]?.name : "Not assigned"}</dd></div>
                <div><dt>Notes</dt><dd>{selected.notes || "No notes yet"}</dd></div>
                <div><dt>Source</dt><dd>{selected.sourceName || "Needs verification"}</dd></div>
              </dl>
              <div className="buttonStack">
                <button className="secondaryButton" onClick={() => actions.updateRecommenderStatus(selected.id, "Requested")}><Bell size={17} /> Mark requested</button>
                <button className="primaryButton" onClick={() => actions.updateRecommenderStatus(selected.id, "Submitted")}><Check size={17} /> Mark submitted</button>
              </div>
            </aside>
          )}
        </section>
      )}
    </>
  );
}

function ScholarshipsPage() {
  const { state } = useAdmissions();
  const scholarships = selectors.getAllScholarships(state);
  return (
    <>
      <PageHeader eyebrow="Scholarships" title="Funding items with verification visible" />
      {scholarships.length === 0 ? <EmptyState title="No scholarship items yet" /> : (
        <section className="connectedGrid three">
          {scholarships.map((scholarship) => (
            <article className="panel sourceCard" key={scholarship.id}>
              <h2>{scholarship.title}</h2>
              <p>{scholarship.notes}</p>
              <div className="badgeRow">
                <StatusPill value={scholarship.status} />
                <ConfidenceBadge level={scholarship.confidenceLevel} />
              </div>
              <p>Deadline: {formatDate(state.deadlines[scholarship.deadlineId]?.dueDate)}</p>
              <p>Linked: {getLinkedApplicationNames(state, scholarship.linkedApplicationIds).join(", ")}</p>
            </article>
          ))}
        </section>
      )}
    </>
  );
}

function DeadlinesPage() {
  const { state, actions } = useAdmissions();
  const [selectedId, setSelectedId] = useState(null);
  const [newDeadline, setNewDeadline] = useState({ title: "", dueDate: "2026-12-01", applicationId: "" });
  const deadlines = selectors.getAllDeadlines(state).sort(sortDeadlines);
  const selected = state.deadlines[selectedId] || deadlines[0];
  const grouped = groupDeadlines(deadlines);

  return (
    <>
      <PageHeader eyebrow="Deadlines" title="Upcoming dates and readiness" />
      <section className="panel addDeadlineBar">
        <input value={newDeadline.title} onChange={(event) => setNewDeadline({ ...newDeadline, title: event.target.value })} placeholder="Add custom deadline" />
        <input type="date" value={newDeadline.dueDate} onChange={(event) => setNewDeadline({ ...newDeadline, dueDate: event.target.value })} />
        <select value={newDeadline.applicationId} onChange={(event) => setNewDeadline({ ...newDeadline, applicationId: event.target.value })}>
          <option value="">First application</option>
          {selectors.getApplications(state).map((app) => <option value={app.id} key={app.id}>{app.universityName}</option>)}
        </select>
        <button className="primaryButton" onClick={() => actions.addDeadline(newDeadline)}><Plus size={17} /> Add deadline</button>
      </section>
      {deadlines.length === 0 ? <EmptyState title="No deadlines yet" /> : (
        <section className="twoColumnLayout">
          <div className="panel deadlineTimeline connectedDeadlineTimeline">
            {Object.entries(grouped).map(([label, items]) => (
              <section className="deadlineGroup" key={label}>
                <h2>{label}</h2>
                {items.map((deadline) => (
                  <button className="overviewButton" key={deadline.id} onClick={() => setSelectedId(deadline.id)}>
                    <div>
                      <strong>{deadline.title}</strong>
                      <span>{formatDate(deadline.dueDate)} - {deadline.type} - {deadline.linkedApplicationIds.length} linked</span>
                    </div>
                    <RiskBadge value={deadline.riskLevel} />
                    <ConfidenceBadge level={deadline.confidenceLevel} />
                  </button>
                ))}
              </section>
            ))}
          </div>
          {selected && (
            <aside className="panel detailPanel">
              <Breadcrumbs items={[{ label: "Deadlines", onClick: () => setSelectedId(null) }, { label: selected.title }]} />
              <h2>{selected.title}</h2>
              <ProgressBar value={selected.readinessPercentage} />
              <dl className="detailFacts">
                <div><dt>Due</dt><dd>{formatDate(selected.dueDate)} {selected.dueTime || ""}</dd></div>
                <div><dt>Linked apps</dt><dd>{getLinkedApplicationNames(state, selected.linkedApplicationIds).join(", ")}</dd></div>
                <div><dt>Readiness</dt><dd>{selected.readinessPercentage}%</dd></div>
                <div><dt>Source</dt><dd>{selected.sourceName || "Needs verification"}</dd></div>
              </dl>
              <label className="inlineEdit">
                <span>Update date</span>
                <input type="date" value={selected.dueDate} onChange={(event) => actions.updateDeadlineDate(selected.id, event.target.value)} />
              </label>
              <button className="primaryButton" onClick={() => actions.markDeadlineSubmitted(selected.id)}><Check size={17} /> Mark submitted</button>
            </aside>
          )}
        </section>
      )}
    </>
  );
}

function TasksPage() {
  const { state, actions } = useAdmissions();
  const [filter, setFilter] = useState("all");
  const tasks = selectors.getAllTasks(state)
    .filter((task) => {
      if (filter === "week") return daysUntil(task.dueDate) <= 7;
      if (filter === "blocked") return task.status === "Blocked";
      if (filter === "needs") return ["NeedsVerification", "Outdated", "AIExtracted"].includes(task.confidenceLevel);
      if (filter === "essays") return task.type === "Essay";
      if (filter === "documents") return task.type === "Document";
      if (filter === "recommendations") return task.type === "Recommendation";
      if (filter === "deadlines") return task.type === "Application" || task.type === "Review" || task.type === "Payment";
      if (filter === "scholarships") return task.type === "Scholarship";
      if (filter === "verification") return task.type === "Verification";
      if (filter === "open") return task.status !== "Complete";
      return true;
    })
    .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate));
  const grouped = groupTasksForPage(tasks);

  return (
    <>
      <PageHeader eyebrow="Tasks" title="What to work on next" />
      <div className="deadlineQuickFilters">
        {[
          ["all", "All"],
          ["open", "Open"],
          ["week", "Due soon"],
          ["blocked", "Blocked"],
          ["needs", "Needs verification"],
          ["essays", "Essays"],
          ["documents", "Documents"],
          ["recommendations", "Recommendations"],
          ["deadlines", "Deadlines"],
          ["scholarships", "Scholarships"],
          ["verification", "Verification"],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}>{label}</button>
        ))}
      </div>
      {tasks.length === 0 ? <EmptyState title="No matching tasks" /> : (
        <section className="panel connectedList">
          {Object.entries(grouped).map(([label, items]) => (
            <section className="groupBlock" key={label}>
              <h2>{label}</h2>
              {items.map((task) => (
                <article className="taskLine" key={task.id}>
                  <input
                    type="checkbox"
                    checked={task.status === "Complete"}
                    onChange={() => actions.updateTaskStatus(task.id, task.status === "Complete" ? "InProgress" : "Complete")}
                  />
                  <span>
                    <strong>{task.title}</strong>
                    <small>{formatDate(task.dueDate)} - {task.priority} - {task.description || "Keeps your application moving"} - {getLinkedApplicationNames(state, task.linkedApplicationIds).join(", ")}</small>
                  </span>
                  <StatusPill value={task.status} />
                  <ConfidenceBadge level={task.confidenceLevel} />
                </article>
              ))}
            </section>
          ))}
        </section>
      )}
    </>
  );
}

function CalendarPage() {
  const { state, actions } = useAdmissions();
  const [viewMode, setViewMode] = useState("list");
  const [typeFilter, setTypeFilter] = useState("all");
  const [applicationFilter, setApplicationFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [newEvent, setNewEvent] = useState({ title: "", dueDate: "2026-12-01", applicationId: "" });
  const deadlineEvents = selectors.getAllDeadlines(state).map((deadline) => ({ ...deadline, eventKind: "Deadline" }));
  const taskEvents = selectors.getAllTasks(state)
    .filter((task) => task.dueDate)
    .map((task) => ({
      id: `calendar-task-${task.id}`,
      taskId: task.id,
      title: task.title,
      type: task.type,
      dueDate: task.dueDate,
      linkedApplicationIds: task.linkedApplicationIds,
      status: task.status,
      confidenceLevel: task.confidenceLevel,
      eventKind: "Task",
    }));
  const events = [...deadlineEvents, ...taskEvents]
    .filter((event) => typeFilter === "all" || event.type === typeFilter)
    .filter((event) => applicationFilter === "all" || event.linkedApplicationIds.includes(applicationFilter))
    .sort(sortDeadlines);
  const selected = events.find((event) => event.id === selectedId) || events[0];
  const monthBuckets = groupBy(events, (event) => formatDate(event.dueDate).split(" ").slice(0, 2).join(" "));

  return (
    <>
      <PageHeader eyebrow="Calendar" title="Application calendar">
        <button className="secondaryButton" onClick={() => setViewMode(viewMode === "list" ? "month" : "list")}>{viewMode === "list" ? "Month view" : "List view"}</button>
      </PageHeader>
      <section className="panel addDeadlineBar">
        <input value={newEvent.title} onChange={(event) => setNewEvent({ ...newEvent, title: event.target.value })} placeholder="Add custom event" />
        <input type="date" value={newEvent.dueDate} onChange={(event) => setNewEvent({ ...newEvent, dueDate: event.target.value })} />
        <select value={newEvent.applicationId} onChange={(event) => setNewEvent({ ...newEvent, applicationId: event.target.value })}>
          <option value="">First application</option>
          {selectors.getApplications(state).map((app) => <option value={app.id} key={app.id}>{app.universityName}</option>)}
        </select>
        <button className="primaryButton" onClick={() => newEvent.title && actions.addDeadline({ ...newEvent, type: "Task" })}><Plus size={17} /> Add event</button>
      </section>
      <section className="deadlineQuickFilters">
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="all">All types</option>
          {[...new Set(events.map((event) => event.type))].map((type) => <option key={type}>{type}</option>)}
        </select>
        <select value={applicationFilter} onChange={(event) => setApplicationFilter(event.target.value)}>
          <option value="all">All applications</option>
          {selectors.getApplications(state).map((app) => <option value={app.id} key={app.id}>{app.universityName}</option>)}
        </select>
      </section>
      {events.length === 0 ? <EmptyState title="No calendar events yet" /> : (
        <section className="twoColumnLayout">
          <div className={`panel ${viewMode === "month" ? "calendarMonthGrid" : "calendarGrid"}`}>
            {(viewMode === "month" ? Object.entries(monthBuckets).flatMap(([dateLabel, items]) => [{ id: dateLabel, dateLabel, heading: true }, ...items]) : events).map((event) => (
              event.heading ? <h2 key={event.id}>{event.dateLabel}</h2> : (
                <button className="calendarEvent" key={event.id} onClick={() => setSelectedId(event.id)}>
                  <strong>{formatDate(event.dueDate)}</strong>
                  <span>{event.title}</span>
                  <small>{event.eventKind} - {event.type} - {getLinkedApplicationNames(state, event.linkedApplicationIds).join(", ")}</small>
                  <ConfidenceBadge level={event.confidenceLevel} />
                </button>
              )
            ))}
          </div>
          {selected && (
            <aside className="panel detailPanel">
              <Breadcrumbs items={[{ label: "Calendar", onClick: () => setSelectedId(null) }, { label: selected.title }]} />
              <h2>{selected.title}</h2>
              <dl className="detailFacts">
                <div><dt>Date</dt><dd>{formatDate(selected.dueDate)}</dd></div>
                <div><dt>Type</dt><dd>{selected.eventKind} - {selected.type}</dd></div>
                <div><dt>Status</dt><dd>{selected.status}</dd></div>
                <div><dt>Linked apps</dt><dd>{getLinkedApplicationNames(state, selected.linkedApplicationIds).join(", ")}</dd></div>
              </dl>
              {selected.custom && (
                <button className="secondaryButton" onClick={() => actions.deleteDeadline(selected.id)}><X size={17} /> Delete event</button>
              )}
            </aside>
          )}
        </section>
      )}
    </>
  );
}

function SettingsPage() {
  const { state, actions } = useAdmissions();
  const [draft, setDraft] = useState(state.settings);
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "edrizz-admissions-data.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader eyebrow="Settings" title="Profile and data preferences">
        <button className="primaryButton" onClick={() => actions.updateSettings(draft)}><Check size={17} /> Save preferences</button>
      </PageHeader>
      <section className="panel settingsGrid">
        <label>
          <span>Target countries</span>
          <input value={draft.targetCountries.join(", ")} onChange={(event) => setDraft({ ...draft, targetCountries: event.target.value.split(",").map((item) => item.trim()) })} />
        </label>
        <label>
          <span>Intended majors</span>
          <input value={draft.intendedMajors.join(", ")} onChange={(event) => setDraft({ ...draft, intendedMajors: event.target.value.split(",").map((item) => item.trim()) })} />
        </label>
        <label>
          <span>Preferred intake</span>
          <input value={draft.preferredIntake} onChange={(event) => setDraft({ ...draft, preferredIntake: event.target.value })} />
        </label>
        <label>
          <span>Timezone</span>
          <input value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })} />
        </label>
        <label>
          <span>Notification preferences</span>
          <input value={draft.notifications} onChange={(event) => setDraft({ ...draft, notifications: event.target.value })} />
        </label>
        <label>
          <span>Data verification preference</span>
          <input value={draft.verificationPreference} onChange={(event) => setDraft({ ...draft, verificationPreference: event.target.value })} />
        </label>
        <label>
          <span>Default application level</span>
          <select value={draft.defaultApplicationLevel} onChange={(event) => setDraft({ ...draft, defaultApplicationLevel: event.target.value })}>
            <option value="undergraduate">Undergraduate</option>
            <option value="graduate">Graduate</option>
          </select>
        </label>
        <label>
          <span>Deadline reminder days</span>
          <input value={draft.deadlineReminderDays} onChange={(event) => setDraft({ ...draft, deadlineReminderDays: event.target.value })} />
        </label>
        <label>
          <span>Data source</span>
          <input readOnly value={getBackendMode()} />
        </label>
        <div className="settingsActions">
          <button className="secondaryButton" type="button" onClick={exportData}>Export data</button>
          <button className="secondaryButton" type="button" onClick={() => actions.reset()}><RefreshCw size={17} /> Reset local data</button>
        </div>
      </section>
    </>
  );
}

function TaskActionButton({ task }) {
  const { actions } = useAdmissions();
  return (
    <button className="primaryButton" onClick={() => actions.updateTaskStatus(task.id, task.status === "Complete" ? "InProgress" : "Complete")}>
      <Check size={17} /> {task.status === "Complete" ? "Reopen" : "Complete"}
    </button>
  );
}

function groupBy(items, getter) {
  return items.reduce((groups, item) => {
    const key = getter(item);
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {});
}

function groupDeadlines(deadlines) {
  const groups = { Overdue: [], Today: [], Tomorrow: [], "This week": [], "This month": [], Later: [], "Submitted/completed": [] };
  deadlines.forEach((deadline) => {
    if (deadline.status === "Submitted") groups["Submitted/completed"].push(deadline);
    else {
      const days = daysUntil(deadline.dueDate);
      if (days < 0) groups.Overdue.push(deadline);
      else if (days === 0) groups.Today.push(deadline);
      else if (days === 1) groups.Tomorrow.push(deadline);
      else if (days <= 7) groups["This week"].push(deadline);
      else if (days <= 31) groups["This month"].push(deadline);
      else groups.Later.push(deadline);
    }
  });
  return Object.fromEntries(Object.entries(groups).filter(([, items]) => items.length));
}

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function groupTasksForPage(tasks) {
  const groups = {
    Today: [],
    "This week": [],
    "High impact": [],
    Blocked: [],
    "Needs verification": [],
    "Student actions": [],
    "Verification tasks": [],
  };

  tasks.forEach((task) => {
    const days = daysUntil(task.dueDate);
    if (days === 0) groups.Today.push(task);
    else if (days > 0 && days <= 7) groups["This week"].push(task);
    else if (task.priority === "Critical" || task.linkedApplicationIds.length > 1) groups["High impact"].push(task);
    else if (task.status === "Blocked") groups.Blocked.push(task);
    else if (["NeedsVerification", "Outdated", "AIExtracted"].includes(task.confidenceLevel)) groups["Needs verification"].push(task);
    else if (task.type === "Verification") groups["Verification tasks"].push(task);
    else groups["Student actions"].push(task);
  });

  return Object.fromEntries(Object.entries(groups).filter(([, items]) => items.length));
}

createRoot(document.getElementById("root")).render(
  <AdmissionsProvider>
    <App />
  </AdmissionsProvider>,
);
