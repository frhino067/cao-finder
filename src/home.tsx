import {ArrowRight, BookOpen, Calculator, Compass} from 'lucide-react';

const tools = [
  {name: 'Course Finder', href: '#/courses', icon: Compass, colour: 'purple',
    description: 'Find Irish college courses that fit your points, subjects, and interests.', action: 'Find your course'},
  {name: 'Points Calculator', href: '#/calculator', icon: Calculator, colour: 'green',
    description: 'Add your grades and work out your Leaving Cert points.', action: 'Calculate your points'},
  {name: 'Study Tracker', href: '#/study', icon: BookOpen, colour: 'orange',
    description: 'Log your study, see your progress, and find what needs more attention.', action: 'Track your study'},
];

export default function Home() {
  return <section className="home-page content-width">
    <div className="home-intro">
      <p className="eyebrow">YOUR LEAVING CERT, A LITTLE CLEARER</p>
      <h1>Make your <span>next move.</span></h1>
      <p>Three tools to help you find your course, know your points, and make your study count.</p>
    </div>
    <div className="home-tools" aria-label="Choose a CAO Finder tool">
      {tools.map(({name, href, icon: Icon, colour, description, action}, index) => <a
        className={`home-tool home-tool-${colour}`} href={href} key={name}>
        <div className="home-tool-top"><span className="home-tool-icon"><Icon size={29} strokeWidth={1.7} aria-hidden="true"/></span>
          <span className="home-tool-number" aria-hidden="true">0{index + 1}</span></div>
        <h2>{name}</h2>
        <p>{description}</p>
        <span className="home-tool-action">{action}<ArrowRight size={20} aria-hidden="true"/></span>
      </a>)}
    </div>
    <p className="home-footnote">From your next study session to your next chapter.</p>
  </section>;
}
