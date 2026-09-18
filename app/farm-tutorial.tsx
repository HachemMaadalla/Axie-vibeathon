'use client';
import {useEffect,useRef,useState} from 'react';
import {Sprout,Droplets,Scissors,Check,X} from 'lucide-react';
import type {View} from '@/lib/game/scene';
import type {FarmItem} from '@/lib/game/farm-tools';
import {advanceLesson,type Lesson} from '@/lib/game/tutorial';
const KEY='wildseed-tutorial-v1';
function initial(v:View,replay:boolean):Lesson{
 if(replay)return {step:'plant',plot:null};
 try{const raw=JSON.parse(localStorage.getItem(KEY)??'null');if(raw&&['plant','water','grow','done','off'].includes(raw.step)&&(raw.plot===null||Number.isInteger(raw.plot)&&raw.plot>=0&&raw.plot<v.farm.plots.length))return raw;}catch{}
 return {step:v.farm.harvests||v.farm.runs?'off':'plant',plot:null};
}
export function FarmTutorial({view:v,replay,hidden,onGuide}:{view:View;replay:boolean;hidden:boolean;onGuide:(item:FarmItem|null)=>void}){
 const [lesson,setLesson]=useState<Lesson>(()=>initial(v,replay)),seen=useRef(v.farmAction?.serial??0);
 const plot=lesson.plot===null?null:v.farm.plots[lesson.plot],ripe=!!plot&&plot.growth>=1;
 useEffect(()=>{const action=v.farmAction,isNew=!!action&&action.serial!==seen.current;if(action)seen.current=action.serial;setLesson(prev=>advanceLesson(prev,isNew?action:undefined,v.farm.plots));},[v.farmAction?.serial,v.farm.plots]);
 useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(lesson));}catch{}},[lesson]);
 const tool:FarmItem|null=lesson.step==='plant'?'sunroot':lesson.step==='water'?'water':lesson.step==='grow'?(ripe?'sickle':'water'):null;
 useEffect(()=>{onGuide(v.mode==='farm'&&lesson.step!=='off'?tool:null);return()=>onGuide(null);},[tool,v.mode,lesson.step,onGuide]);
 if(lesson.step==='off'||hidden||v.mode!=='farm')return null;
 const Icon=lesson.step==='plant'?Sprout:lesson.step==='water'?Droplets:lesson.step==='done'?Check:Scissors;
 const title=lesson.step==='plant'?'Plant your first seed':lesson.step==='water'?'Give it water':lesson.step==='done'?'Your first harvest!':ripe?'Harvest your crop':'Growing...';
 const line=lesson.step==='plant'?'WASD to an empty bed. Select 1 Seeds, then E.':lesson.step==='water'?'Select 2 Water, then E beside your planted bed.':lesson.step==='done'?'Take 24 Sunroot to the anvil to forge a key.':ripe?'Select 3 Harvest, then E beside the ripe crop.':'Plant more while you wait.';
 return <aside className="farm-tutorial panel" aria-label="Farming tutorial"><Icon size={26}/><div><strong>{title}</strong><p>{line}</p>{lesson.step==='grow'&&!ripe&&<progress aria-label="Crop growth" max={1} value={plot?.growth??0}/>}</div>{lesson.step==='done'?<button onClick={()=>setLesson({step:'off',plot:null})}>Done</button>:<button title="Skip tutorial" aria-label="Skip tutorial" onClick={()=>setLesson({step:'off',plot:null})}><X size={16}/></button>}</aside>;
}
