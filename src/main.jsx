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
      addCustomEssay: async (payload) => {
        await essayService.addCustomEssay(payload);
        dispatch({ type: "ADD_CUSTOM_ESSAY", payload });
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
      addRecommenderPerson: async (payload) => {
        await recommenderService.addRecommenderPerson(payload);
        dispatch({ type: "ADD_RECOMMENDER_PERSON", payload });
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
  const dailyPlan = selectors.getAllTasks(state)
    .filter((task) => task.status !== "Complete")
    .sort((a, b) => {
      const priorityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (priorityRank[a.priority] ?? 4) - (priorityRank[b.priority] ?? 4) || daysUntil(a.dueDate) - daysUntil(b.dueDate);
    })
    .slice(0, 3);

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
              {nextMove && <em>{explainTaskImportance(nextMove)} {studentActionHint(nextMove)}</em>}
            </div>
            <div className="nextMoveActions">
              {nextMove && <TaskActionButton task={nextMove} />}
              <button className="secondaryButton" onClick={() => onNavigate("tasks")}><Check size={17} /> View tasks</button>
            </div>
          </section>

          <section className="panel studentPlanPanel">
            <div className="panelHeader">
              <div>
                <p>Do these first</p>
                <h2>Your 3-step plan</h2>
              </div>
            </div>
            <div className="connectedList">
              {dailyPlan.map((task, index) => (
                <article className="studentStep" key={task.id}>
                  <strong>{index + 1}</strong>
                  <div>
                    <h3>{task.title}</h3>
                    <p>{studentActionHint(task)}</p>
                    <span>{formatDate(task.dueDate)} - {getLinkedApplicationNames(state, task.linkedApplicationIds).join(", ")}</span>
                  </div>
                  <TaskActionButton task={task} />
                </article>
              ))}
            </div>
          </section>

          <section className="statsGrid">
            <StatCard icon={GraduationCap} label="Active applications" value={apps.length} detail={`${groups.length} application path${groups.length === 1 ? "" : "s"} to manage`} />
            <StatCard icon={CalendarDays} label="Next deadline" value={deadlines[0] ? formatDate(deadlines[0].dueDate) : "None"} detail={deadlines[0]?.title || "No connected deadline"} />
            <StatCard icon={FilePenLine} label="Essay progress" value={`${essays.filter((essay) => essay.status === "Complete").length}/${essays.length}`} detail="Shared essays count once" />
            <StatCard icon={CircleAlert} label="Things to double-check" value={needsVerification.length} detail={`${dueThisWeek} task${dueThisWeek === 1 ? "" : "s"} due this week`} />
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
  const [reviewSource, setReviewSource] = useState(null);
  const [showAllResults, setShowAllResults] = useState(false);
  const visibleResults = showAllResults ? results : results.slice(0, 12);

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
    setReviewSource(null);
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
      <PageHeader eyebrow="Add a university" title="Find your university">
        <button className="secondaryButton" onClick={() => actions.reset()}><RefreshCw size={17} /> Reset local data</button>
      </PageHeader>

      <section className="panel addFlowPanel">
        <div className="studentExplainer">
          <strong>Start here</strong>
          <p>Search for a university, check the detected application path, then review what EdRizz will add to your plan before anything is created.</p>
        </div>
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
          EdRizz will reuse shared work, like UCAS or Common App essays, when several universities use the same application path.
        </p>
      </section>

      <section className="searchStatusRow">
        <div>
          <strong>{isSearching ? "Searching..." : `${resultMeta.total} result${resultMeta.total === 1 ? "" : "s"}`}</strong>
          <span>{resultMeta.source === "fallback" ? "Showing backup results because the university data source failed." : "Showing the best matches first. Use country, city, or program to narrow the list."}</span>
        </div>
        {results.length > 12 && (
          <button className="secondaryButton" onClick={() => setShowAllResults((value) => !value)}>
            {showAllResults ? "Show fewer" : `Show all ${results.length}`}
          </button>
        )}
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
        {visibleResults.map((source) => {
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
              <details className="dataDetails">
                <summary>Data details</summary>
                <small>{source.sourceName || "University data source"} - {platformSourceLabel}</small>
                {source.sourceUrl && <a href={source.sourceUrl} target="_blank" rel="noreferrer">Open source</a>}
              </details>
              <button className="primaryButton" disabled={exists} onClick={() => setReviewSource({ ...source, overridePlatform, detectedPlatform, platformConfidence, platformSourceLabel })}>
                <Plus size={17} /> {exists ? "Already added" : "Review setup"}
              </button>
            </article>
          );
        })}
      </section>

      {reviewSource && (
        <section className="reviewOverlay" role="dialog" aria-label="Review application setup">
          <div className="panel reviewPanel">
            <div className="detailTopbar">
              <Breadcrumbs items={[{ label: "Universities", onClick: () => setReviewSource(null) }, { label: reviewSource.name }]} />
              <button className="secondaryButton" onClick={() => setReviewSource(null)}><X size={17} /> Close</button>
            </div>
            <div className="reviewHero">
              <div>
                <p>Review before adding</p>
                <h2>{reviewSource.name}</h2>
                <span>{programName || reviewSource.defaultProgram} - {reviewSource.country}{reviewSource.city ? `, ${reviewSource.city}` : ""}</span>
              </div>
              <div className="badgeRow">
                <span className="pill">{displayPlatform(reviewSource.detectedPlatform)}</span>
                <ConfidenceBadge level={reviewSource.platformConfidence} />
              </div>
            </div>
            <section className={`platformPreview ${reviewSource.detectedPlatform === "NeedsVerification" ? "warning" : ""}`}>
              <strong>Detected platform: {displayPlatform(reviewSource.detectedPlatform)}</strong>
              <span>Confidence: {displayConfidence(reviewSource.platformConfidence)}</span>
              <p>{reviewSource.platformReason || "Application platform needs verification before applying."}</p>
              <small>{reviewSource.platformSourceLabel}</small>
            </section>
            <div className="reviewChecklist">
              <h3>What EdRizz will add to your roadmap</h3>
              <ul>
                <li>Application path and university roadmap</li>
                <li>Deadlines and next tasks</li>
                <li>Documents you may need, such as transcripts or ID</li>
                <li>Essay or recommendation items only when the platform/source supports them</li>
                <li>Double-check tasks for anything we cannot confirm yet</li>
              </ul>
            </div>
            <div className="topActions">
              <button className="secondaryButton" onClick={() => setReviewSource(null)}>Back to search</button>
              <button className="primaryButton" onClick={() => add(reviewSource, reviewSource.overridePlatform)}><Plus size={17} /> Add to my plan</button>
            </div>
          </div>
        </section>
      )}
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
      <section className="studentExplainer panel">
        <strong>How to read this</strong>
        <p>Application paths are the portals you submit through, like UCAS or a direct university portal. University roadmaps are the extra checks for each specific choice.</p>
      </section>
      <section className="applicationsOverview">
        <div className="panel">
          <div className="panelHeader">
            <div>
              <p>Submit-through paths</p>
              <h2>Application paths</h2>
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
              <p>University-specific work</p>
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
          <p>{isGroup ? "Shared application path" : "University roadmap"}</p>
          <h2>{isGroup ? group.name : application.universityName}</h2>
          <span>{linkedApps.length} linked university choice{linkedApps.length === 1 ? "" : "s"} - finish shared tasks once and every linked application updates</span>
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
              <p>What to do</p>
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
                  <small>{studentActionHint(task)} - {task.linkedApplicationIds.length} linked app{task.linkedApplicationIds.length === 1 ? "" : "s"}</small>
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
      <section className="studentHelpBox">
        <strong>Why this matters</strong>
        <p>{explainTaskImportance(task)}</p>
        <strong>What to do next</strong>
        <p>{studentActionHint(task)}</p>
      </section>
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
  const [essaySearch, setEssaySearch] = useState("");
  const [essayStatus, setEssayStatus] = useState("all");
  const [essayScope, setEssayScope] = useState("all");
  const [customEssay, setCustomEssay] = useState({ title: "", prompt: "", applicationId: "", wordLimit: "", dueDate: "2026-12-01" });
  const essays = selectors.getAllEssays(state);
  const filteredEssays = essays.filter((essay) => {
    const haystack = [essay.title, essay.prompt, getLinkedApplicationNames(state, essay.linkedApplicationIds).join(" ")].join(" ").toLowerCase();
    const matchesSearch = !essaySearch || haystack.includes(essaySearch.toLowerCase());
    const matchesStatus = essayStatus === "all" || essay.status === essayStatus;
    const matchesScope = essayScope === "all" || essay.linkedApplicationIds.includes(essayScope) || essay.linkedGroupIds?.includes(essayScope);
    return matchesSearch && matchesStatus && matchesScope;
  });
  const selected = state.essays[editingId] || state.essays[selectedId] || filteredEssays[0] || essays[0];
  const grouped = groupBy(filteredEssays, (essay) => essay.linkedGroupIds?.[0] || essay.linkedApplicationIds?.[0] || "custom");
  const draftWords = countWords(draft);
  const essayStats = {
    total: essays.length,
    drafts: essays.filter((essay) => essay.status === "InProgress").length,
    notStarted: essays.filter((essay) => essay.status === "NotStarted").length,
    review: essays.filter((essay) => essay.status === "NeedsReview").length,
    complete: essays.filter((essay) => essay.status === "Complete").length,
  };

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
      <PageHeader eyebrow="Essays" title="Essay workspace">
        {editingId ? <button className="secondaryButton" onClick={closeEditor}>Back to essays</button> : selected && <button className="secondaryButton" onClick={() => setSelectedId(null)}>Back to essays</button>}
      </PageHeader>
      {essays.length === 0 ? <EmptyState title="No essays yet" /> : (
        <section className="twoColumnLayout">
          <div className="panel connectedList">
            <section className="artifactDashboard">
              <Metric label="Total essays" value={essayStats.total} />
              <Metric label="Not started" value={essayStats.notStarted} />
              <Metric label="Drafting" value={essayStats.drafts} />
              <Metric label="Needs review" value={essayStats.review} />
            </section>
            <section className="artifactToolbar">
              <input value={essaySearch} onChange={(event) => setEssaySearch(event.target.value)} placeholder="Search essays or prompts" />
              <select value={essayStatus} onChange={(event) => setEssayStatus(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="NotStarted">Not started</option>
                <option value="InProgress">Drafting</option>
                <option value="NeedsReview">Needs review</option>
                <option value="Complete">Complete</option>
              </select>
              <select value={essayScope} onChange={(event) => setEssayScope(event.target.value)}>
                <option value="all">All applications</option>
                {selectors.getGroups(state).map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}
                {selectors.getApplications(state).map((app) => <option value={app.id} key={app.id}>{app.universityName}</option>)}
              </select>
            </section>
            <section className="artifactToolbar customArtifactForm">
              <input value={customEssay.title} onChange={(event) => setCustomEssay({ ...customEssay, title: event.target.value })} placeholder="Add essay title" />
              <input value={customEssay.prompt} onChange={(event) => setCustomEssay({ ...customEssay, prompt: event.target.value })} placeholder="Paste prompt or note" />
              <select value={customEssay.applicationId} onChange={(event) => setCustomEssay({ ...customEssay, applicationId: event.target.value })}>
                <option value="">First application</option>
                {selectors.getApplications(state).map((app) => <option value={app.id} key={app.id}>{app.universityName}</option>)}
              </select>
              <button className="secondaryButton" onClick={() => {
                if (!customEssay.title.trim()) return;
                actions.addCustomEssay(customEssay);
                setCustomEssay({ title: "", prompt: "", applicationId: "", wordLimit: "", dueDate: "2026-12-01" });
              }}><Plus size={16} /> Add essay</button>
            </section>
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
            {filteredEssays.length === 0 && <EmptyState title="No essays match these filters" />}
          </div>
          {selected && (
            <aside className="panel detailPanel">
              <Breadcrumbs items={[{ label: "Essays", onClick: () => setSelectedId(null) }, { label: selected.title }]} />
              <h2>{selected.title}</h2>
              <p>{selected.prompt}</p>
              <section className="studentHelpBox">
                <strong>What this is</strong>
                <p>{selected.essayType === "UCASPersonalStatement" ? "This is the main essay sent with your UCAS choices. You write it once, and every linked UCAS choice uses it." : "This writing item belongs to the linked application or scholarship shown below."}</p>
                <strong>How to start</strong>
                <p>Write a rough first draft first. Focus on why you want the subject, what you have done to explore it, and what you hope to build next.</p>
              </section>
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
  const [customDoc, setCustomDoc] = useState({ title: "", category: "Needs verification", applicationId: "", required: true });
  const [docSearch, setDocSearch] = useState("");
  const [docStatus, setDocStatus] = useState("all");
  const [docCategory, setDocCategory] = useState("all");
  const [docScope, setDocScope] = useState("all");
  const documents = selectors.getAllDocuments(state);
  const filteredDocuments = documents.filter((doc) => {
    const haystack = [doc.title, doc.description, doc.category, getLinkedApplicationNames(state, doc.linkedApplicationIds).join(" ")].join(" ").toLowerCase();
    const matchesSearch = !docSearch || haystack.includes(docSearch.toLowerCase());
    const matchesStatus = docStatus === "all" || doc.status === docStatus;
    const matchesCategory = docCategory === "all" || (doc.category || "Needs verification") === docCategory;
    const matchesScope = docScope === "all" || doc.linkedApplicationIds.includes(docScope);
    return matchesSearch && matchesStatus && matchesCategory && matchesScope;
  });
  const selected = state.documents[selectedId] || filteredDocuments[0] || documents[0];
  const grouped = groupBy(filteredDocuments, (doc) => doc.category || (doc.confidenceLevel === "NeedsVerification" ? "Needs verification" : "University-specific"));
  const categories = [...new Set(documents.map((doc) => doc.category || "Needs verification"))];
  const docStats = {
    total: documents.length,
    missing: documents.filter((doc) => doc.status !== "Uploaded").length,
    uploaded: documents.filter((doc) => doc.status === "Uploaded").length,
    blockers: documents.filter((doc) => doc.blocksSubmission && doc.status !== "Uploaded").length,
  };

  return (
    <>
      <PageHeader eyebrow="Documents" title="Document workspace" />
      {documents.length === 0 ? <EmptyState title="No documents yet" /> : (
        <section className="twoColumnLayout">
          <div className="panel connectedList">
            <section className="studentExplainer">
              <strong>Start with shared documents</strong>
              <p>Some documents, like your transcript or passport, can be used across many applications. Upload or mark them once and every linked application updates.</p>
            </section>
            <section className="artifactDashboard">
              <Metric label="Total documents" value={docStats.total} />
              <Metric label="Missing" value={docStats.missing} />
              <Metric label="Uploaded" value={docStats.uploaded} />
              <Metric label="Blocking submission" value={docStats.blockers} />
            </section>
            <section className="artifactToolbar">
              <input value={docSearch} onChange={(event) => setDocSearch(event.target.value)} placeholder="Search documents" />
              <select value={docStatus} onChange={(event) => setDocStatus(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="Missing">Missing</option>
                <option value="InProgress">Needs update</option>
                <option value="Uploaded">Uploaded</option>
                <option value="NeedsVerification">Needs verification</option>
              </select>
              <select value={docCategory} onChange={(event) => setDocCategory(event.target.value)}>
                <option value="all">All categories</option>
                {categories.map((category) => <option value={category} key={category}>{category}</option>)}
              </select>
              <select value={docScope} onChange={(event) => setDocScope(event.target.value)}>
                <option value="all">All applications</option>
                {selectors.getApplications(state).map((app) => <option value={app.id} key={app.id}>{app.universityName}</option>)}
              </select>
            </section>
            <section className="artifactToolbar customArtifactForm">
              <input value={customDoc.title} onChange={(event) => setCustomDoc({ ...customDoc, title: event.target.value })} placeholder="Add custom document" />
              <select value={customDoc.category} onChange={(event) => setCustomDoc({ ...customDoc, category: event.target.value })}>
                {["Academic", "Identity", "Testing", "Financial", "Portfolio/supporting", "University-specific", "Needs verification"].map((category) => <option key={category}>{category}</option>)}
              </select>
              <select value={customDoc.applicationId} onChange={(event) => setCustomDoc({ ...customDoc, applicationId: event.target.value })}>
                <option value="">All applications</option>
                {selectors.getApplications(state).map((app) => <option value={app.id} key={app.id}>{app.universityName}</option>)}
              </select>
              <button className="secondaryButton" onClick={() => {
                if (!customDoc.title.trim()) return;
                actions.addCustomDocument(customDoc);
                setCustomDoc({ title: "", category: "Needs verification", applicationId: "", required: true });
              }}><Plus size={16} /> Add</button>
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
            {filteredDocuments.length === 0 && <EmptyState title="No documents match these filters" />}
          </div>
          {selected && (
            <aside className="panel detailPanel">
              <Breadcrumbs items={[{ label: "Documents", onClick: () => setSelectedId(null) }, { label: selected.title }]} />
              <h2>{selected.title}</h2>
              <p>{selected.description}</p>
              <section className="studentHelpBox">
                <strong>Who can help?</strong>
                <p>{documentHelpText(selected)}</p>
                <strong>Does it block submission?</strong>
                <p>{selected.blocksSubmission ? "Yes. Do this before you expect to submit the linked applications." : "Usually not, but keep it ready so portals and visa steps are easier later."}</p>
              </section>
              <DocumentPreview document={selected} />
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

function DocumentPreview({ document }) {
  const file = document.uploadedFiles?.[document.uploadedFiles.length - 1];
  if (!file) {
    return (
      <section className="documentPreview emptyPreview">
        <strong>No file preview yet</strong>
        <p>Upload a PDF, image, or small text file to preview it here. Larger files still save their name, type, and upload date.</p>
      </section>
    );
  }

  return (
    <section className="documentPreview">
      <div>
        <strong>{file.name}</strong>
        <span>{file.type || "Unknown file type"} - {formatFileSize(file.size)} - uploaded {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : "recently"}</span>
      </div>
      {file.previewKind === "image" && file.previewDataUrl && <img src={file.previewDataUrl} alt={`Preview of ${file.name}`} />}
      {file.previewKind === "pdf" && file.previewDataUrl && <iframe src={file.previewDataUrl} title={`Preview of ${file.name}`} />}
      {file.previewKind === "text" && file.previewDataUrl && <iframe src={file.previewDataUrl} title={`Preview of ${file.name}`} />}
      {(!file.previewDataUrl || file.previewKind === "metadata") && (
        <p>This file is tracked, but EdRizz only has metadata available for preview. Open the original file from your device if you need to inspect the contents.</p>
      )}
    </section>
  );
}

function RecommendersPage() {
  const { state, actions } = useAdmissions();
  const [selectedId, setSelectedId] = useState(null);
  const [newPerson, setNewPerson] = useState({ name: "", role: "Teacher", email: "" });
  const recs = selectors.getAllRecommenders(state);
  const selected = state.recommenderRequirements[selectedId] || recs[0];
  const people = Object.values(state.recommenderPeople || {});
  const grouped = groupBy(recs, (rec) => rec.platform || "Custom recommendation");

  return (
    <>
      <PageHeader eyebrow="Recommenders" title="People who support your application" />
      {recs.length === 0 ? <EmptyState title="No recommender requirements yet" /> : (
        <section className="twoColumnLayout">
          <div className="panel connectedList">
            <section className="groupBlock">
              <h2>Recommendation requirements</h2>
              <p className="connectedNote">A requirement is what the application needs. A person is the teacher, counselor, or adviser who will send it.</p>
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
              <div className="compactForm recommenderForm">
                <input value={newPerson.name} onChange={(event) => setNewPerson({ ...newPerson, name: event.target.value })} placeholder="Teacher or counselor name" />
                <input value={newPerson.role} onChange={(event) => setNewPerson({ ...newPerson, role: event.target.value })} placeholder="Role" />
                <input value={newPerson.email} onChange={(event) => setNewPerson({ ...newPerson, email: event.target.value })} placeholder="Email optional" />
                <button
                  className="secondaryButton"
                  onClick={() => {
                    if (!newPerson.name.trim()) return;
                    actions.addRecommenderPerson({ ...newPerson, requirementId: selected?.id });
                    setNewPerson({ name: "", role: "Teacher", email: "" });
                  }}
                >
                  <Plus size={16} /> Add person
                </button>
              </div>
              {people.length === 0 ? (
                <div className="studentHelpBox">
                  <strong>No people assigned yet</strong>
                  <p>Start by choosing a teacher, counselor, or adviser who knows your work. Ask early and share your deadline plus a short brag sheet.</p>
                </div>
              ) : people.map((person) => (
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
              <section className="studentHelpBox">
                <strong>What to ask for</strong>
                <p>{selected.platform === "UCAS" ? "For UCAS, your school usually adds one shared reference. Ask your counselor or school adviser who handles UCAS references." : "Ask the assigned person whether they can submit this recommendation before the due date."}</p>
                <strong>Make it easy for them</strong>
                <p>Send your program list, deadline, achievements, and a short note about why you are applying.</p>
              </section>
              <dl className="detailFacts">
                <div><dt>Due</dt><dd>{formatDate(selected.dueDate)}</dd></div>
                <div><dt>Linked apps</dt><dd>{getLinkedApplicationNames(state, selected.linkedApplicationIds).join(", ")}</dd></div>
                <div><dt>Assigned to</dt><dd>{selected.recommenderId ? state.recommenderPeople?.[selected.recommenderId]?.name : "Not assigned"}</dd></div>
                <div><dt>Next message</dt><dd>{selected.status === "NotRequested" ? "Ask them if they can support your application." : selected.status === "Requested" ? "Send a polite reminder before the due date." : "Thank them and keep proof of submission."}</dd></div>
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
  const grouped = {
    "Research next": scholarships.filter((scholarship) => ["NeedsVerification", "Outdated", "AIExtracted"].includes(scholarship.confidenceLevel)),
    "Ready to work on": scholarships.filter((scholarship) => !["NeedsVerification", "Outdated", "AIExtracted"].includes(scholarship.confidenceLevel)),
  };
  return (
    <>
      <PageHeader eyebrow="Scholarships" title="Funding to research" />
      {scholarships.length === 0 ? <EmptyState title="No scholarship items yet" /> : (
        <section className="panel connectedList">
          {Object.entries(grouped).map(([label, items]) => items.length > 0 && (
            <section className="groupBlock" key={label}>
              <h2>{label}</h2>
              <div className="connectedGrid three">
                {items.map((scholarship) => (
                  <article className="sourceCard" key={scholarship.id}>
                    <h2>{scholarship.title}</h2>
                    <p>{scholarship.notes || "Check whether this funding option applies to you before spending time on an application."}</p>
                    <div className="badgeRow">
                      <StatusPill value={scholarship.status} />
                      <ConfidenceBadge level={scholarship.confidenceLevel} />
                    </div>
                    <section className="studentHelpBox">
                      <strong>Next step</strong>
                      <p>{label === "Research next" ? "Confirm eligibility and deadline first. Only add essays or documents after the official funding page confirms them." : "Start the required scholarship tasks and keep the deadline visible."}</p>
                    </section>
                    <p>Possible deadline: {formatDate(state.deadlines[scholarship.deadlineId]?.dueDate)}</p>
                    <p>Linked application: {getLinkedApplicationNames(state, scholarship.linkedApplicationIds).join(", ")}</p>
                  </article>
                ))}
              </div>
            </section>
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
        <label>
          <span>Deadline name</span>
          <input value={newDeadline.title} onChange={(event) => setNewDeadline({ ...newDeadline, title: event.target.value })} placeholder="Add custom deadline" />
        </label>
        <label>
          <span>Date</span>
          <input type="date" value={newDeadline.dueDate} onChange={(event) => setNewDeadline({ ...newDeadline, dueDate: event.target.value })} />
        </label>
        <label>
          <span>Application</span>
          <select value={newDeadline.applicationId} onChange={(event) => setNewDeadline({ ...newDeadline, applicationId: event.target.value })}>
            <option value="">First application</option>
            {selectors.getApplications(state).map((app) => <option value={app.id} key={app.id}>{app.universityName}</option>)}
          </select>
        </label>
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
                      <span>{formatDate(deadline.dueDate)} - {deadline.type} - {deadline.linkedApplicationIds.length} linked - {deadlineReadinessHint(deadline)}</span>
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
              <section className="studentHelpBox">
                <strong>What readiness means</strong>
                <p>{deadlineReadinessHint(selected)} Readiness improves when linked essays, documents, recommendations, and tasks are completed.</p>
                <strong>Before this date</strong>
                <p>{selected.dependencyTaskIds?.length ? "Finish the missing linked tasks below before you submit." : "No linked blockers are listed yet. Still verify this deadline on the official site."}</p>
              </section>
              {selected.dependencyTaskIds?.length > 0 && (
                <div className="miniDependencyList">
                  {selected.dependencyTaskIds.map((taskId) => state.tasks[taskId]).filter(Boolean).map((task) => (
                    <span key={task.id}>{task.status === "Complete" ? "Done" : "Missing"}: {task.title}</span>
                  ))}
                </div>
              )}
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
  const allOpenTasks = selectors.getAllTasks(state).filter((task) => task.status !== "Complete");
  const focusTasks = [...allOpenTasks]
    .sort((a, b) => {
      const priorityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (priorityRank[a.priority] ?? 4) - (priorityRank[b.priority] ?? 4) || daysUntil(a.dueDate) - daysUntil(b.dueDate);
    })
    .slice(0, 3);
  const tasks = selectors.getAllTasks(state)
    .filter((task) => {
      if (filter === "focus") return focusTasks.some((item) => item.id === task.id);
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
      <section className="studentExplainer panel">
        <strong>Use this as your daily checklist</strong>
        <p>Student tasks are things you can do yourself. Verification tasks mean EdRizz is asking you to double-check the official university page before relying on the item.</p>
      </section>
      <div className="deadlineQuickFilters">
        {[
          ["all", "All"],
          ["focus", "Focus 3"],
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
                    <small>{formatDate(task.dueDate)} - {task.priority} - {studentActionHint(task)} - {getLinkedApplicationNames(state, task.linkedApplicationIds).join(", ")}</small>
                    <em>{explainTaskImportance(task)}</em>
                  </span>
                  <StatusPill value={task.status} />
                  <ConfidenceBadge level={task.confidenceLevel} />
                  <button className="secondaryButton" onClick={() => actions.updateTaskStatus(task.id, task.status === "Complete" ? "InProgress" : "Complete")}>
                    {taskActionLabel(task)}
                  </button>
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
  const allEvents = [...deadlineEvents, ...taskEvents];
  const events = allEvents
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
        <label>
          <span>Event name</span>
          <input value={newEvent.title} onChange={(event) => setNewEvent({ ...newEvent, title: event.target.value })} placeholder="Add custom event" />
        </label>
        <label>
          <span>Date</span>
          <input type="date" value={newEvent.dueDate} onChange={(event) => setNewEvent({ ...newEvent, dueDate: event.target.value })} />
        </label>
        <label>
          <span>Application</span>
          <select value={newEvent.applicationId} onChange={(event) => setNewEvent({ ...newEvent, applicationId: event.target.value })}>
            <option value="">First application</option>
            {selectors.getApplications(state).map((app) => <option value={app.id} key={app.id}>{app.universityName}</option>)}
          </select>
        </label>
        <button className="primaryButton" onClick={() => newEvent.title && actions.addDeadline({ ...newEvent, type: "Task" })}><Plus size={17} /> Add event</button>
      </section>
      <section className="deadlineQuickFilters">
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="all">All types</option>
          {[...new Set(allEvents.map((event) => event.type))].map((type) => <option key={type}>{type}</option>)}
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
                <button className={`calendarEvent ${eventTypeClass(event.type)}`} key={event.id} onClick={() => setSelectedId(event.id)}>
                  <strong>{formatDate(event.dueDate)}</strong>
                  <span>{event.title}</span>
                  <small>{event.eventKind} - {event.type} - {getLinkedApplicationNames(state, event.linkedApplicationIds).join(", ")}</small>
                  <em>{event.eventKind === "Deadline" ? deadlineReadinessHint(event) : studentActionHint(event)}</em>
                  <ConfidenceBadge level={event.confidenceLevel} />
                </button>
              )
            ))}
          </div>
          {selected && (
            <aside className="panel detailPanel">
              <Breadcrumbs items={[{ label: "Calendar", onClick: () => setSelectedId(null) }, { label: selected.title }]} />
              <h2>{selected.title}</h2>
              <section className="studentHelpBox">
                <strong>What to do before this</strong>
                <p>{selected.eventKind === "Deadline" ? deadlineReadinessHint(selected) : studentActionHint(selected)}</p>
              </section>
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
  const [confirmReset, setConfirmReset] = useState(false);
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
      <section className="studentExplainer panel">
        <strong>These settings shape your plan</strong>
        <p>Countries, majors, intake, and timezone help EdRizz suggest better searches, dates, reminders, and application defaults.</p>
      </section>
      <section className="panel settingsGrid">
        <h2 className="settingsSectionTitle">Student profile</h2>
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
        <h2 className="settingsSectionTitle">Planning defaults</h2>
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
        <h2 className="settingsSectionTitle">Data and safety</h2>
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
          <span>University data mode</span>
          <input readOnly value={getBackendMode()} />
        </label>
        <div className="settingsActions">
          <button className="secondaryButton" type="button" onClick={exportData}>Export data</button>
          {confirmReset ? (
            <button className="dangerButton" type="button" onClick={() => actions.reset()}><RefreshCw size={17} /> Confirm reset</button>
          ) : (
            <button className="secondaryButton" type="button" onClick={() => setConfirmReset(true)}><RefreshCw size={17} /> Reset saved demo data</button>
          )}
        </div>
      </section>
    </>
  );
}

function TaskActionButton({ task }) {
  const { actions } = useAdmissions();
  return (
    <button className="primaryButton" onClick={() => actions.updateTaskStatus(task.id, task.status === "Complete" ? "InProgress" : "Complete")}>
      <Check size={17} /> {task.status === "Complete" ? "Reopen" : taskActionLabel(task)}
    </button>
  );
}

function taskActionLabel(task = {}) {
  const labels = {
    Essay: "Start writing",
    Document: "Upload document",
    Recommendation: "Ask recommender",
    Verification: "Check official page",
    Scholarship: "Research funding",
    Payment: "Prepare payment",
    Review: "Review application",
    Application: "Work on application",
  };
  return labels[task.type] || "Complete task";
}

function studentActionHint(task = {}) {
  if (task.type === "Essay") return "Open the editor and write a rough first draft.";
  if (task.type === "Document") return "Find the file, upload it, or ask your school for it.";
  if (task.type === "Recommendation") return "Ask the right teacher or counselor and share the deadline.";
  if (task.type === "Verification") return "Open the official university page and confirm the detail.";
  if (task.type === "Scholarship") return "Check eligibility before spending time on the application.";
  if (task.type === "Payment") return "Check the portal fee and how you can pay it.";
  if (task.type === "Review") return "Read through the application before submitting.";
  return task.description || "This keeps your application moving.";
}

function explainTaskImportance(task = {}) {
  const linked = task.linkedApplicationIds?.length || 0;
  const shared = linked > 1 ? `It affects ${linked} applications, so finishing it once helps several choices.` : "It affects one application.";
  if (task.confidenceLevel === "NeedsVerification" || task.type === "Verification") return `${shared} This is a double-check item, so do not treat it as confirmed until you verify it.`;
  if (task.required) return `${shared} It is required or likely to block progress if left unfinished.`;
  return `${shared} It helps keep your plan accurate and ready.`;
}

function documentHelpText(doc = {}) {
  const title = String(doc.title || "").toLowerCase();
  if (title.includes("transcript")) return "Ask your school counselor, registrar, or exams office for an official transcript.";
  if (title.includes("predicted")) return "Ask your counselor or subject teachers who provide predicted grades.";
  if (title.includes("passport")) return "Use the photo/ID page of your passport, and make sure it is not expired.";
  if (title.includes("english")) return "Use IELTS, TOEFL, Duolingo, or another accepted English test only if the university requires it.";
  return "Check the linked application instructions, then upload the file or mark it not required if the official source says so.";
}

function deadlineReadinessHint(deadline = {}) {
  const readiness = deadline.readinessPercentage || 0;
  if (deadline.status === "Submitted") return "Submitted. Keep proof of submission somewhere safe.";
  if (readiness >= 80) return "Almost ready. Do a final check before the date.";
  if (readiness >= 40) return "Partly ready. Finish the missing linked tasks next.";
  return "Not ready yet. Check the linked tasks before this date.";
}

function formatFileSize(size) {
  if (!size) return "size unknown";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function eventTypeClass(type = "") {
  return `eventType-${String(type).replace(/[^a-z0-9]+/gi, "")}`;
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
