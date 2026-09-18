'use client';
import {useEffect,useState} from 'react';
import {Sprout,Play,RotateCcw} from 'lucide-react';

export function GameLoading({ready,done=0,total=0,onStart}:{ready:boolean;done?:number;total?:number;onStart:()=>void}){
 const [slow,setSlow]=useState(false);
 useEffect(()=>{if(ready)return;const timer=setTimeout(()=>setSlow(true),45000);return()=>clearTimeout(timer);},[ready]);
 const percent=total?Math.min(100,Math.round(done/total*100)):0;
 return <section className={'game-loading'+(ready?' is-ready':'')} aria-label="Wildseed loading screen">
  <div className="loading-content">
   <Sprout className="loading-emblem" size={42} aria-hidden="true"/>
   <h1>Wildseed</h1>
   <img className="loading-axie" src="/assets/axie/pomodoro.png" width={128} height={128} alt="" draggable={false}/>
   {ready?<button className="primary loading-enter" onClick={onStart}>Enter Lunacia <Play size={18}/></button>:<>
    <div className="loading-meter" role="progressbar" aria-label="Characters ready" aria-valuemin={0} aria-valuemax={total||undefined} aria-valuenow={total?done:undefined} aria-valuetext={total?done+' of '+total+' characters ready':'Preparing the island'}>
     <span className={total?'':'indeterminate'} style={total?{width:percent+'%'}:undefined}/>
    </div>
    <div className="loading-caption"><span role="status">{total?'Gathering Axies':'Preparing your island'}</span>{total>0&&<b>{done}/{total}</b>}</div>
    {slow&&<button className="loading-retry" onClick={()=>location.reload()}><RotateCcw size={14}/> Taking a while? Retry</button>}
   </>}
  </div>
  <noscript>Enable JavaScript to enter Lunacia.</noscript>
 </section>;
}
