import React,{useState,useEffect} from 'react';
import Finder from './finder';
import {useShortlist} from './lib/use-shortlist';
import {routeView} from './lib/routes';
export {SiteMenu} from './site-header';
function currentRoute(){return location.hash.startsWith('#/')?location.hash:'#/';}
export default function App(){
 // Match the pre-rendered homepage, then apply deep links after hydration.
 const [route,setRoute]=useState('#/');
 const shortlist=useShortlist();
 useEffect(()=>{
  const changed=()=>{if(!location.hash||location.hash.startsWith('#/')){setRoute(currentRoute());window.scrollTo(0,0);}};
  changed();window.addEventListener('hashchange',changed);
  return()=>window.removeEventListener('hashchange',changed);
 },[]);
 const view=routeView(route);
 return <Finder key={route} view={view} shortlist={shortlist}/>;
}
