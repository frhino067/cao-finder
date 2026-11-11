import {ArrowRight} from 'lucide-react';

const tools = [
  {name: 'Course Finder', href: '#/courses', description: 'Search by points, college, subject or location.'},
  {name: 'Points Calculator', href: '#/calculator', description: 'Calculate your CAO points from your Leaving Cert grades.'},
  {name: 'Study Tracker', href: '#/study', description: 'Log sessions and see which subjects and topics you find hardest.'},
];

export default function Home() {
  return <section className="home-page content-width">
    <h1>CAO Finder</h1>
    <div className="home-tools">
      {tools.map(({name, href, description}) => <a className="home-tool" href={href} key={name}>
        <div><h2>{name}</h2><p>{description}</p></div>
        <ArrowRight size={20} aria-hidden="true"/>
      </a>)}
    </div>
  </section>;
}
