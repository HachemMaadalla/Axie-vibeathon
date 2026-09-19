'use client';
import {useEffect,useRef,useState} from 'react';
import {Sprout,Droplets,Scissors,Check,X,Move,RotateCcw,Flame,Hammer,Sparkles} from 'lucide-react';
import type {View} from '@/lib/game/scene';
import type {FarmItem} from '@/lib/game/farm-tools';
import {advanceLesson,type Lesson} from '@/lib/game/tutorial';
export type TutorialFocus='look'|'move'|'farm'|'cook'|'forge'|'portal'|null;
type Stage=Exclude<TutorialFocus,null>|'off';
const KEY='wildseed-tutorial-v2';
function initial(replay:boolean):{stage:Stage;lesson:Lesson}{
 if(!replay)try{const raw=JSON.parse(localStorage.getItem(KEY)??'null');if(raw&&['look','move','farm','cook','forge','portal','off'].includes(raw.stage)&&['plant','water','grow','done','off'].includes(raw.lesson?.step)&&(raw.lesson.plot===null||Number.isInteger(raw.lesson.plot)&&raw.lesson.plot>=0&&raw.lesson.plot<24))return raw;}catch{}
 return {stage:'look',lesson:{step:'plant',plot:null}};
}
export function FarmTutorial({view:v,replay,hidden,onGuide,onFocus}:{view:View;replay:boolean;hidden:boolean;onGuide:(item:FarmItem|null)=>void;onFocus:(focus:TutorialFocus,plot:number|null)=>void}){
 const [state,setState]=useState(()=>initial(replay)),seen=useRef(v.farmAction?.serial??0);
 const {stage,lesson}=state,plot=lesson.plot===null?null:v.farm.plots[lesson.plot],ripe=!!plot&&plot.growth>=1;
 useEffect(()=>{const action=v.farmAction,isNew=!!action&&action.serial!==seen.current;if(action)seen.current=action.serial;setState(prev=>prev.stage!=='farm'?prev:{...prev,lesson:advanceLesson(prev.lesson,isNew?action:undefined,v.farm.plots)});},[v.farmAction?.serial,v.farm.plots]);
 useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}},[state]);
 const tool:FarmItem|null=stage!=='farm'?null:lesson.step==='plant'?'sunroot':lesson.step==='water'?'water':lesson.step==='grow'?(ripe?'sickle':'water'):null;
 const visible=stage!=='off'&&!hidden&&v.mode==='farm';
 useEffect(()=>{onGuide(visible?tool:null);return()=>onGuide(null);},[tool,visible,onGuide]);
 useEffect(()=>{onFocus(visible?stage as TutorialFocus:null,lesson.plot);return()=>onFocus(null,null);},[stage,lesson.step,lesson.plot,visible,onFocus]);
 if(!visible)return null;
 const step=lesson.step;
 const title=stage==='look'?'Make yourself at home':stage==='move'?'Your island, your pace':stage==='cook'?'Cook your harvest':stage==='forge'?'Forge a dungeon key':stage==='portal'?'Adventure starts here':step==='plant'?'Plant a seed':step==='water'?'Give it water':step==='done'?'Your first harvest!':ripe?'Time to harvest':'Watch it grow';
 const line=stage==='look'?'Drag to look around. Camera distance stays fixed.':stage==='move'?'WASD or tap to move. Space jumps. Q dashes.':stage==='cook'?'Bring 2 crops to the campfire. Meals give battle buffs.':stage==='forge'?'Bring 24 Sunroot to the anvil for your first key.':stage==='portal'?'Pack food, spend a key. Return alive to keep your loot.':step==='plant'?'Go to an empty bed. Select Seeds (1), then press E.':step==='water'?'Select Water (2). Press E beside your seed.':step==='done'?'Now turn your crops into meals and keys.':ripe?'Select Harvest (3). Press E beside your crop.':'The timer stays above your crop. Plant more while you wait.';
 const Icon=stage==='look'?RotateCcw:stage==='move'?Move:stage==='cook'?Flame:stage==='forge'?Hammer:stage==='portal'?Sparkles:step==='plant'?Sprout:step==='water'?Droplets:step==='done'?Check:Scissors;
 const next=()=>setState(s=>({...s,stage:s.stage==='look'?'move':s.stage==='move'?'farm':s.stage==='farm'?'cook':s.stage==='cook'?'forge':s.stage==='forge'?'portal':'off'}));
 const canNext=stage!=='farm'||step==='done';
 return <aside className="farm-tutorial panel guided-tutorial" aria-label="Island tutorial"><div className="tutorial-progress" aria-hidden="true">{['look','move','farm','cook','forge','portal'].map(s=><i key={s} className={stage===s?'current':''}/>)}</div><Icon size={27}/><div><strong>{title}</strong><p>{line}</p>{stage==='farm'&&step==='grow'&&!ripe&&<progress aria-label="Crop growth" max={1} value={plot?.growth??0}/>}</div><button className="tutorial-skip" title="Skip tutorial" aria-label="Skip tutorial" onClick={()=>setState(s=>({...s,stage:'off'}))}><X size={16}/></button><div className="tutorial-actions"><button className="secondary" aria-label="Show tutorial target" onClick={()=>onFocus(stage as TutorialFocus,lesson.plot)}><RotateCcw size={14}/> Show me</button>{canNext&&<button className="primary" onClick={next}>{stage==='portal'?'Start':'Next'}</button>}</div></aside>;
}
