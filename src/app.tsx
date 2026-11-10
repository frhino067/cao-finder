import React,{useState,useEffect} from 'react';
import Finder from './finder';
import {useShortlist} from './lib/use-shortlist';
function currentRoute(){return location.hash.startsWith('#/')?location.hash:'#/';}
export default function App(){
 // Match the pre-rendered homepage, then apply deep links after hydration.
 const [route,setRoute]=useState('#/');
 const shortlist=useShortlist();
 useEffect(()=>{
  const changed=()=>{if(location.hash.startsWith('#/')){setRoute(currentRoute());window.scrollTo(0,0);}};
  changed();window.addEventListener('hashchange',changed);
  return()=>window.removeEventListener('hashchange',changed);
 },[]);
 const page=route.slice(2).split('?')[0];
 const view=['colleges','categories','calculator','saved','account'].includes(page)?page:'courses';
 return <Finder key={route} view={view} shortlist={shortlist}/>;
}
