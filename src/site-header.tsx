const destinations = [
  ['home', 'Home', '#/'],
  ['courses', 'Course Finder', '#/courses'],
  ['calculator', 'Points Calculator', '#/calculator'],
  ['study', 'Study Tracker', '#/study'],
  ['saved', 'Saved courses', '#/saved'],
  ['colleges', 'Colleges', '#/colleges'],
  ['categories', 'Course categories', '#/categories'],
  ['blog', 'Student blog', '/blog.html'],
  ['account', 'Account', '#/account'],
];

export function SiteHeader({page, standalone = false, showAccount = true}: {
  page?: string;
  standalone?: boolean;
  showAccount?: boolean;
}) {
  return <header className="cao-header">
    <div className="cao-header-inner">
      <a className="cao-wordmark" href={standalone ? '/' : '#/'}>
        <img src="/logo.svg" alt="" width="32" height="32" fetchPriority="low"/>
        CAO Finder
      </a>
      <details className="cao-menu">
        <summary aria-label="Menu"><span className="cao-menu-icon" aria-hidden="true"><span/></span></summary>
        <nav className="cao-navigation" aria-label="Site navigation">
          {destinations.filter(([id]) => showAccount || id !== 'account').map(([id, label, href]) => <a
            href={standalone && href.startsWith('#') ? '/' + href : href}
            aria-current={page === id ? 'page' : undefined} key={id}>{label}</a>)}
        </nav>
      </details>
    </div>
  </header>;
}
