'use client';
import {useEffect,useRef,useState} from 'react';
import {Flame,Hammer,KeyRound,Droplets} from 'lucide-react';
import {ForgeRun} from '@/lib/game/forge';
import {KEY_RECIPES,canCraftKey,type FarmState,type CropId} from '@/lib/game/state';
import {ingredientStars,farmLuck} from '@/lib/game/quality';
import {QualityOdds,StarBadge} from './quality-ui';
import {LootArt} from './inventory-ui';
function ForgeGame({farm,tier,onCraft,onBack}:{farm:FarmState;tier:1|2;onCraft:(tier:1|2,score:number)=>number;onBack:()=>void}){
 const run=useRef(new ForgeRun()),committed=useRef(false),craft=useRef(onCraft);craft.current=onCraft;
 const [,render]=useState(0),[result,setResult]=useState<number|null>(null);
 useEffect(()=>{let frame=0,last=0,paint=0;
 const tick=(now:number)=>{const dt=last?(now-last)/1000:0;last=now;if(!document.hidden)run.current.tick(dt);
 if(run.current.phase==='done'&&!committed.current){committed.current=true;setResult(craft.current(tier,run.current.score));}
 if(now-paint>32){paint=now;render(n=>n+1);}frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);
 const down=(e:KeyboardEvent)=>{if(e.target instanceof Element&&e.target.closest('button:not(.forge-action)'))return;if(!['Space','Enter'].includes(e.code)||e.repeat||document.hidden)return;e.preventDefault();run.current.press();};
 const up=(e:KeyboardEvent)=>{if(e.target instanceof Element&&e.target.closest('button:not(.forge-action)')){run.current.held=false;return;}if(!['Space','Enter'].includes(e.code))return;e.preventDefault();run.current.release();};
 const blur=()=>{run.current.held=false;};window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',blur);
 return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',blur);};
 },[tier]);
 const r=run.current,heat=r.phase==='heat',strike=r.phase==='strike',done=r.phase==='done';
 return <div data-feedback-anchor="forge" className={'forge-game stage-'+r.phase}><div className="forge-stages"><span className={heat?'active':''}><Flame size={17}/>Heat</span><span className={strike?'active':''}><Hammer size={17}/>Strike</span><span className={r.phase==='quench'?'active':''}><Droplets size={17}/>Quench</span></div>
 <div className="forge-workpiece"><Hammer key={r.hits.length} className={r.hits.length?'hammer-impact':''} size={64}/><KeyRound size={88} style={{color:'hsl('+Math.round(48-r.heat*40)+' 90% '+(55+r.heat*15)+'%)'}}/><div className="forge-anvil"/></div>
 <div className="forge-marks" aria-label={r.hits.length+' of 5 strikes'}>{Array.from({length:5},(_,i)=><span key={i} className={r.hits[i]===undefined?'':r.hits[i]>.65?'good':'miss'}>{r.hits[i]===undefined?'·':r.hits[i]>.65?'✦':'•'}</span>)}</div>
 {!done&&<><div className="forge-temperature" role="progressbar" aria-label="Metal temperature" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.heat*100)}><i style={{width:r.heat*100+'%'}}/><b style={{left:(r.phase==='quench'?30:62)+'%',width:(r.phase==='quench'?20:20)+'%'}}/></div>
 {strike&&<div className="forge-aim" aria-label="Hammer timing"><b style={{left:(r.target-.1)*100+'%',width:'20%'}}/><i style={{left:r.cursor*100+'%'}}/></div>}</>}
 <QualityOdds score={r.score} luck={farmLuck(farm)} input={ingredientStars(farm,KEY_RECIPES[tier].cost)}/>
 {result!==null?<><p role="status">{result>0?<><StarBadge value={farm.lastCraft?.stars??1}/> Key forged</>:'Not enough crops'}</p><button className="primary" onClick={onBack}>Done</button></>:<><button className="primary forge-action" disabled={done} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);r.press();}} onPointerUp={()=>r.release()} onPointerCancel={()=>{r.held=false;}}>{heat?'Hold to heat':strike?'Strike!':'Quench!'} <kbd>Space</kbd></button><small>{heat?'Release in green':strike?'Hit the moving marker in green':'Cool into green, then quench'}</small><button className="cook-cancel" onClick={onBack}>Cancel</button></>}
 </div>;
}
export function ForgeStation({farm,onCraft}:{farm:FarmState;onCraft:(tier:1|2,score:number)=>number}){
 const [tier,setTier]=useState<1|2|null>(null);
 if(tier)return <ForgeGame farm={farm} tier={tier} onCraft={onCraft} onBack={()=>setTier(null)}/>;
 return <div className="forge-recipes">{([1,2] as const).map(t=><div key={t}><KeyRound size={42}/><strong>{KEY_RECIPES[t].name}</strong><div className="forge-cost">{Object.entries(KEY_RECIPES[t].cost).map(([id,n])=><span key={id}><LootArt kind="crop" crop={id as CropId} size={30}/>{farm.crops[id as CropId]}/{n}</span>)}</div><button className="primary" disabled={!canCraftKey(farm,t)} onClick={()=>setTier(t)}>Forge</button></div>)}</div>;
}
