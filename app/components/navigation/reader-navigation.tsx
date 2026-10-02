export type View = "Your reader DNA" | "Import your reads" | "Monthly pick" | "The reveal" | "Feedback";

const navigation: Array<{ label: View; short: string; icon: string }> = [
  { label: "Monthly pick", short: "Find a mystery", icon: "⌕" },
  { label: "Your reader DNA", short: "Reader DNA", icon: "◉" },
  { label: "Import your reads", short: "Upload TBR / reads", icon: "⇧" },
  { label: "The reveal", short: "The reveal", icon: "✳" },
  { label: "Feedback", short: "Feedback", icon: "♡" },
];

export function ReaderSidebar({ activeView, menuOpen, tbrCount, onNavigate }: { activeView: View; menuOpen: boolean; tbrCount: number; onNavigate: (view: View) => void }) {
  return <aside className={`sidebar${menuOpen ? " sidebar-open" : ""}`}><button aria-label="The Gloaming Shelf home" className="brand brand-button" onClick={() => onNavigate("Monthly pick")} type="button"><span aria-hidden="true" className="brand-mark">☾</span><span className="brand-name">the gloaming shelf<small>A MYSTERY BOOK ORACLE</small></span></button><div className="club-switcher"><span aria-hidden="true" className="club-monogram">✧</span><span><strong>The reading room</strong><small>Where stories gather</small></span></div><p className="nav-heading">THE ARCHIVES</p><nav aria-label="Main navigation" className="side-nav">{navigation.map((item) => <button aria-current={activeView === item.label ? "page" : undefined} className={`nav-link${activeView === item.label ? " nav-active" : ""}`} key={item.label} onClick={() => onNavigate(item.label)} type="button"><span aria-hidden="true" className="nav-icon">{item.icon}</span><span>{item.short}</span>{item.label === "Import your reads" && tbrCount > 0 && <span aria-label={`${tbrCount} books in TBR`} className="nav-new">{tbrCount}</span>}</button>)}</nav><div className="sidebar-bottom"><div className="club-invite"><span aria-hidden="true" className="invite-spark">✧</span><strong>Keep one eye<br />on the dark.</strong><p>{tbrCount ? `${tbrCount} books wait in your TBR.` : "Add a TBR and let the shelf choose your next tale."}</p><button onClick={() => onNavigate("Import your reads")} type="button">{tbrCount ? "Tend your lists" : "Add a TBR"} <span aria-hidden="true">→</span></button></div><div className="local-status"><span aria-hidden="true" className="status-dot" /><span>Saved on this device</span></div></div></aside>;
}

export function ReaderTopbar({ activeView, menuOpen, tbrCount, onToggleMenu }: { activeView: View; menuOpen: boolean; tbrCount: number; onToggleMenu: () => void }) {
  return <header className="topbar"><button aria-expanded={menuOpen} aria-label={menuOpen ? "Close menu" : "Open menu"} className="mobile-menu" onClick={onToggleMenu} type="button"><span aria-hidden="true">☰</span></button><div className="breadcrumbs"><span>The Gloaming Shelf</span><span aria-hidden="true">/</span><strong>{activeView}</strong></div><div className="topbar-actions">{tbrCount > 0 && <span className="member-count"><span aria-hidden="true" className="status-dot" /> {tbrCount} BOOKS IN YOUR TBR</span>}<span aria-hidden="true" className="top-avatar">✧</span></div></header>;
}