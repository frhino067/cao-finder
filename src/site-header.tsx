import {ArrowRight, Heart} from 'lucide-react';

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
] as const;

const desktopOrder = ['courses', 'colleges', 'categories', 'calculator', 'saved', 'study', 'blog', 'account'] as const;

export function SiteMenu({page, standalone = false, showAccount = true}: {
  page?: string;
  standalone?: boolean;
  showAccount?: boolean;
}) {
  return <details className="cao-menu">
    <summary aria-label="Menu"><span className="cao-menu-icon" aria-hidden="true"><span/></span></summary>
    <nav className="cao-navigation" aria-label="Site navigation">
      {destinations.filter(([id]) => showAccount || id !== 'account').map(([id, label, href]) => <a
        href={standalone && href.startsWith('#') ? '/' + href : href}
        aria-current={page === id ? 'page' : undefined} key={id}>{label}</a>)}
    </nav>
  </details>;
}

const desktopLinks = desktopOrder.map(id => destinations.find(link => link[0] === id)!);

export function SiteHeader({page, savedCount, signedIn, showAccount}: {
  page: string;
  savedCount: number;
  signedIn: boolean;
  showAccount: boolean;
}) {
  return <header className="site-header has-site-menu">
    <div className="nav-wrap">
      <a className="brand" href="#/">
        <span className="logo"><img className="brand-logo" src="/logo.svg" alt="" fetchPriority="low"/></span>
        CAO<span className="brand-light">Finder</span>
      </a>
      {page === 'home' ? showAccount && <a className="home-account-link" href="#/account">
        {signedIn ? 'Your account' : 'Sign in'}<ArrowRight size={16}/>
      </a> : <>
        <nav className="header-links" aria-label="Main navigation">
          {desktopLinks.filter(([id]) => showAccount || id !== 'account').map(([id, label, href]) => <a
            key={id} className={page === id ? 'current' : undefined} href={href}
            aria-current={page === id ? 'page' : undefined}>{id === 'courses' ? 'Find courses' : label}</a>)}
        </nav>
        <a className="nav-saved" href="#/saved" aria-label={`${savedCount} saved courses`}>
          <Heart size={20}/><span>{savedCount}</span>
        </a>
      </>}
      <SiteMenu page={page} showAccount={showAccount}/>
    </div>
  </header>;
}
