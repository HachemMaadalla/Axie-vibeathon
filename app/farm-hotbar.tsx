'use client';
import {LootArt} from './inventory-ui';
import {FARM_SLOTS,farmAction,farmItemName,isSeed,type FarmItem} from '@/lib/game/farm-tools';
import type {View} from '@/lib/game/scene';
export function ToolArt({item}:{item:'water'|'sickle'}){
 return <svg className="loot-art" viewBox="0 0 64 64" width="44" height="44" fill="none" aria-hidden="true"><ellipse cx="32" cy="56" rx="22" ry="4" fill="#173b4530"/><g stroke="#244955" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">{item==='water'?<><path d="M19 25V17c0-13 19-13 19 0v8" strokeWidth="5"/><path d="M40 32l13-15 7 5-15 23" fill="#56cbdc"/><path d="M12 25h31l3 26c-8 7-25 7-33 0z" fill="#35b8d0"/><ellipse cx="28" cy="25" rx="16" ry="5" fill="#a5f0e3"/><path d="M20 34v12" stroke="#b9f6ed" strokeWidth="4"/><path d="M50 15l10 7 2-5-9-6z" fill="#f1e8bd"/></>:<><path d="M24 32C18 6 50 2 56 21c3 10-3 17-9 21 10-15-3-26-13-19l-1 14z" fill="#dcf7e4"/><path d="M28 31L12 52c-3 6 4 9 8 5l17-23z" fill="#b97e45"/><path d="M24 36l7 6M20 41l7 6M16 47l7 5" stroke="#f4d098"/><path d="M26 30l10 6 3-5-10-6z" fill="#ffce68"/></>}</g></svg>;
}
export function FarmHotbar({view:v,locked,onSelect,onUse}:{view:View;locked:boolean;onSelect:(item:FarmItem)=>void;onUse:()=>void}){
 const use=farmAction(v.farm,v.selected,v.held);
 return <div className="farm-hotbar-wrap">
  {v.inReach&&!v.nearby&&!locked&&<button className={'farm-use '+(use.ready?'ready':'')} data-action={use.action} disabled={!use.ready} onClick={onUse}><kbd>E</kbd>{use.label}</button>}
  <div className="farm-hotbar panel" role="toolbar" aria-label="Farm inventory bar">
   {FARM_SLOTS.map((id,i)=>{const count=isSeed(id)?v.farm.seeds[id]:id==='soil'||id==='fertilizer'?v.farm[id]:null;return <button key={id} className={'farm-slot '+(v.held===id?'active ':'')+(count===0?'depleted':'')} aria-label={farmItemName(id)+(count!==null?' · '+count:'')+' · '+(i+1)} aria-pressed={v.held===id} title={farmItemName(id)+' · '+(i+1)} disabled={locked} onClick={()=>onSelect(id)}>
   <kbd>{i+1}</kbd>{id==='water'||id==='sickle'?<ToolArt item={id}/>:<LootArt kind={isSeed(id)?'seed':id} crop={isSeed(id)?id:undefined} size={44}/>}
   {count!==null&&<b>{count}</b>}</button>;})}
  </div>
 </div>;
}
