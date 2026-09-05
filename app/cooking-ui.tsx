'use client';
import {useEffect,useRef,useState} from 'react';
import {Check,Flame,Plus,Star,X} from 'lucide-react';
import {CROPS,CROP_IDS,type FarmState,type CropId} from '@/lib/game/state';
import {COOK_TARGETS,COOK_ROUND_MS,cookingHit,cookingPosition,foodBuffs,foodLabels,MEAL_SLOTS} from '@/lib/game/food';
import {LootArt} from './inventory-ui';
export function FoodTray({farm,meals,onChange,drought=false}:{farm:FarmState;meals:CropId[];onChange:(ids:CropId[])=>void;drought?:boolean}){
 const remaining=(id:CropId)=>farm.meals[id]-meals.filter(m=>m===id).length;
 const buffs=foodBuffs(meals);if(drought)buffs.regen=0;
 return <section className="food-tray"><div className="food-heading"><strong>Before you go</strong><small>{meals.length}/{MEAL_SLOTS} · eaten on entry</small></div>
 <div className="meal-slots">{Array.from({length:MEAL_SLOTS},(_,i)=>meals[i]?<button key={i} title={'Remove '+CROPS[meals[i]].meal} aria-label={'Remove '+CROPS[meals[i]].meal} onClick={()=>onChange(meals.filter((_,j)=>i!==j))}><LootArt kind="meal" crop={meals[i]} size={44}/><X size={12}/></button>:<div key={i} className="empty-meal"><Plus size={22}/></div>)}</div>
 <div className="pantry-meals">{CROP_IDS.filter(id=>farm.meals[id]>0).map(id=><button key={id} disabled={remaining(id)<=0||meals.length===MEAL_SLOTS} title={CROPS[id].meal+' · '+CROPS[id].effect} aria-label={'Add '+CROPS[id].meal+', '+remaining(id)+' available. '+CROPS[id].effect} onClick={()=>onChange([...meals,id])}><LootArt kind="meal" crop={id} size={36}/><b>{remaining(id)}</b></button>)}</div>
 {!CROP_IDS.some(id=>farm.meals[id]>0)&&<p>Cook meals at the campfire.</p>}
 <div className="food-buffs" aria-live="polite">{foodLabels(buffs).map(s=><span key={s}>{s}</span>)}</div>
 {drought&&meals.some(id=>foodBuffs([id]).regen>0)&&<small>Drought: healing disabled</small>}
 </section>;
}
function CookingGame({id,onCook,onBack}:{id:CropId;onCook:(id:CropId,hits:number)=>number;onBack:()=>void}){
 const [round,setRound]=useState(0),[marks,setMarks]=useState<boolean[]>([]),[result,setResult]=useState<number|null>(null);
 const cursor=useRef<HTMLSpanElement>(null),elapsed=useRef(0),locked=useRef(true),scores=useRef<boolean[]>([]),handler=useRef<()=>void>(()=>{}),cook=useRef(onCook);cook.current=onCook;
 const finish=(hit:boolean)=>{if(locked.current)return;locked.current=true;const next=[...scores.current,hit];scores.current=next;setMarks(next);if(next.length===3)setResult(cook.current(id,next.filter(Boolean).length));else setRound(next.length);};
 handler.current=()=>{if(elapsed.current>=120)finish(cookingHit(elapsed.current,round));};
 useEffect(()=>{
  if(result!==null)return;let frame=0,last=0;elapsed.current=0;locked.current=false;
  const tick=(now:number)=>{const dt=last?Math.min(50,now-last):0;last=now;if(!document.hidden)elapsed.current+=dt;
   if(cursor.current)cursor.current.style.left=(cookingPosition(elapsed.current)*100)+'%';
   if(elapsed.current>=COOK_ROUND_MS){finish(false);return;}frame=requestAnimationFrame(tick);
  };frame=requestAnimationFrame(tick);
  const key=(e:KeyboardEvent)=>{if((e.code==='Space'||e.key.toLowerCase()==='e')&&!e.repeat){e.preventDefault();e.stopPropagation();handler.current();}};
  window.addEventListener('keydown',key,true);return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',key,true);locked.current=true;};
 },[round,result]);
 return <div className="cooking-game"><div className="simmer-art"><LootArt kind="meal" crop={id} size={100}/><Flame size={30}/></div><strong>{CROPS[id].meal}</strong>
 <div className="cook-marks" aria-label={marks.filter(Boolean).length+' good timings'}>{[0,1,2].map(i=><span key={i} className={marks[i]?'good':i<marks.length?'miss':''}>{marks[i]?<Check size={18}/>:i<marks.length?<X size={18}/>:<Star size={18}/>}</span>)}</div>
 {result===null?<><div className="cook-meter" aria-hidden="true"><i style={{left:(COOK_TARGETS[round]-.12)*100+'%',width:'24%'}}/><span ref={cursor}/></div><button className="primary" onClick={()=>handler.current()}>Stir <kbd>Space / E</kbd></button><small>Tap in the green · 3 hits = 2 meals</small><button className="cook-cancel" onClick={onBack}>Cancel</button></>:<><p role="status">{result===2?'Perfect! +2 meals':result===1?'+1 meal':'Not enough crops'}</p><button className="primary" onClick={onBack}>Done</button></>}
 </div>;
}
export function CookingPanel({farm,onCook}:{farm:FarmState;onCook:(id:CropId,hits:number)=>number}){
 const [selected,setSelected]=useState<CropId|null>(null);
 if(selected)return <CookingGame id={selected} onCook={onCook} onBack={()=>setSelected(null)}/>;
 return <div className="cook-recipes">{CROP_IDS.map(id=><button key={id} disabled={farm.crops[id]<2} onClick={()=>setSelected(id)}><LootArt kind="meal" crop={id} size={52}/><strong>{CROPS[id].meal}</strong><small>{CROPS[id].effect}</small><span><LootArt kind="crop" crop={id} size={23}/>{farm.crops[id]}/2</span></button>)}</div>;
}
