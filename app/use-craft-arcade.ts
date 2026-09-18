'use client';
import {useEffect,useRef,useState} from 'react';
export type ArcadeModel={done:boolean;points:number;score:number;tick:(dt:number)=>void};
export function useCraftArcade<T extends ArcadeModel>(create:()=>T,finish:(score:number)=>number,keys:(run:T,code:string,down:boolean,repeat:boolean)=>boolean,clear:(run:T)=>void,step?:(run:T,dt:number)=>void){
 const [run]=useState(create),[mode,setMode]=useState<'ready'|'playing'|'paused'|'done'>('ready'),[result,setResult]=useState<number|null>(null),[,paint]=useState(0);
 const status=useRef(mode),committed=useRef(false),callbacks=useRef({finish,keys,clear,step}),audio=useRef<AudioContext|null>(null);callbacks.current={finish,keys,clear,step};
 const change=(next:typeof mode)=>{status.current=next;setMode(next);};
 const sound=(pitch=420)=>{try{if(localStorage.getItem('wildseed-muted')==='true')return;const ctx=audio.current;if(!ctx||ctx.state!=='running')return;const o=ctx.createOscillator(),g=ctx.createGain(),volume=Math.max(0,Math.min(1,Number(localStorage.getItem('wildseed-volume')??.7)));o.type='triangle';o.frequency.setValueAtTime(pitch,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(pitch*.6,ctx.currentTime+.1);g.gain.setValueAtTime(volume*.08,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.13);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.14);o.onended=()=>{o.disconnect();g.disconnect();};}catch{}};
 const start=()=>{try{if(localStorage.getItem('wildseed-muted')!=='true'){audio.current??=new AudioContext();void audio.current.resume().catch(()=>{});}}catch{}change('playing');};
 const pause=()=>{if(status.current==='playing'){callbacks.current.clear(run);change('paused');}};
 useEffect(()=>{
  let frame=0,last=0,paintAt=0;
  const tick=(now:number)=>{const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
   if(status.current==='playing'&&!document.hidden){
    callbacks.current.step?.(run,dt);run.tick(dt);
    if(run.done&&!committed.current){committed.current=true;callbacks.current.clear(run);change('done');setResult(callbacks.current.finish(run.score));sound(880);}
   }
   if(now-paintAt>32){paintAt=now;paint(n=>n+1);}frame=requestAnimationFrame(tick);
  };frame=requestAnimationFrame(tick);
  const key=(e:KeyboardEvent)=>{if(status.current!=='playing'||document.hidden)return;
   if(e.code==='KeyP'&&!e.repeat){e.preventDefault();e.stopImmediatePropagation();pause();return;}
   if(e.target instanceof HTMLElement&&(e.target.isContentEditable||e.target.matches('input,textarea,select')||e.target.closest('button:not([data-arcade-key])')))return;
   if(callbacks.current.keys(run,e.code,e.type==='keydown',e.repeat)){e.preventDefault();e.stopImmediatePropagation();}
  };
  const hidden=()=>{if(document.hidden)pause();};
  window.addEventListener('keydown',key,true);window.addEventListener('keyup',key,true);window.addEventListener('blur',pause);document.addEventListener('visibilitychange',hidden);
  return()=>{cancelAnimationFrame(frame);callbacks.current.clear(run);window.removeEventListener('keydown',key,true);window.removeEventListener('keyup',key,true);window.removeEventListener('blur',pause);document.removeEventListener('visibilitychange',hidden);void audio.current?.close().catch(()=>{});};
 },[run]);
 return {run,mode,result,start,pause,sound};
}
