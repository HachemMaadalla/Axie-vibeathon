'use client';
import {useState} from 'react';
import {Plus,ChevronDown} from 'lucide-react';
import {StarBadge} from './quality-ui';
import {nextStars} from '@/lib/game/quality';
import {LootArt} from './inventory-ui';
import {FARM_SLOTS,FARM_SLOT_KEYS,farmItemName,isSeed,type FarmItem} from '@/lib/game/farm-tools';
import type {View} from '@/lib/game/scene';
export function ToolArt({item}:{item:'water'|'sickle'}){return <LootArt kind={item} size={44}/>;}
export function FarmHotbar({view:v,locked,onSelect,guided}:{view:View;locked:boolean;guided?:FarmItem|null;onSelect:(item:FarmItem)=>void}){
 const [expanded,setExpanded]=useState(false);const basic=['sunroot','water','sickle'];
 return <div className="farm-hotbar-wrap beginner-hotbar">
  <div className="farm-hotbar panel" role="toolbar" aria-label="Farm inventory bar">
   {FARM_SLOTS.map((id,i)=>{if(i>=3&&(!expanded||guided)&&v.held!==id)return null;const count=isSeed(id)?id==='sunroot'?null:v.farm.seeds[id]:id==='soil'||id==='fertilizer'?v.farm[id]:null;return <button key={id} className={'farm-slot '+(guided===id?'tutorial-target ':'')+(v.held===id?'active ':'')+(count===0?'depleted':'')} aria-label={farmItemName(id)+(id==='sunroot'?' · unlimited':count!==null?' · '+count:'')+' · '+FARM_SLOT_KEYS[i]} aria-pressed={v.held===id} title={farmItemName(id)+' · '+FARM_SLOT_KEYS[i]} disabled={locked} onClick={()=>onSelect(id)}>
   <kbd>{FARM_SLOT_KEYS[i]}</kbd>{id==='water'||id==='sickle'?<ToolArt item={id}/>:<LootArt kind={isSeed(id)?'seed':id} crop={isSeed(id)?id:undefined} size={44}/>}
   {!basic.includes(id)&&<StarBadge value={nextStars(v.farm,isSeed(id)?'seed:'+id:id)}/>}{(count!==null||id==='sunroot')&&<b>{id==='sunroot'?'∞':count}</b>}{basic.includes(id)&&<span className="farm-tool-label">{id==='sunroot'?'Seeds':id==='water'?'Water':'Harvest'}</span>}</button>;})}
   {!guided&&<button className="farm-more" aria-expanded={expanded} aria-label={expanded?'Fewer tools':'More seeds and supplies'} disabled={locked} onClick={()=>setExpanded(!expanded)}>{expanded?<ChevronDown size={22}/>:<Plus size={22}/>}<span>{expanded?'Less':'More'}</span></button>}
  </div>
 </div>;
}
