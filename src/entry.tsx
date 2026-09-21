import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import Finder from './finder';
function currentRoute(){return location.hash.startsWith('#/')?location.hash:'#/';}
function App(){const [route,setRoute]=useState(currentRoute);useEffect(()=>{const changed=()=>{if(location.hash.startsWith('#/')){setRoute(currentRoute());window.scrollTo(0,0);}};window.addEventListener('hashchange',changed);return()=>window.removeEventListener('hashchange',changed);},[]);const page=route.slice(2).split('?')[0];const view=['colleges','categories','calculator','saved'].includes(page)?page:'courses';return <Finder key={route} view={view}/>;}
createRoot(document.getElementById('root')!).render(<App/>);
