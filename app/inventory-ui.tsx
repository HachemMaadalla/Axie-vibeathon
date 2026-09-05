'use client';
import {StarBadge} from './quality-ui';
import {qualityCounts,nextStars} from '@/lib/game/quality';
import {useState,type CSSProperties} from 'react';
import {itemSprite} from '@/lib/game/item-art';
import {Check,Sparkles} from 'lucide-react';
import {CROPS,type CropId} from '@/lib/game/state';
import {ITEMS,WEAPONS,PASSIVES,EVOLUTIONS,itemLevel,type WeaponId,type ItemId} from '@/lib/game/build';
import type {View} from '@/lib/game/scene';
import {ItemIcon} from './build-ui';
type Category='All'|'Seeds'|'Crops'|'Supplies'|'Meals';
type PackItem={key:string;name:string;category:Exclude<Category,'All'>;count:number;color:string;description:string;crop?:CropId;art:string};
export function LootArt({kind,crop,size=48}:{kind:string;crop?:CropId;size?:number}){
 const sprite=itemSprite(kind,crop);
 if(sprite)return <img src={sprite} width={size} height={size} alt="" aria-hidden="true" draggable={false} className="loot-art crop-art" style={{width:size,height:size}}/>;
 const color=crop?CROPS[crop].color:'#7de3c4';
 return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" className="loot-art">
 <ellipse cx="32" cy="55" rx="20" ry="4" fill="#09151e" opacity=".35"/>
 <g stroke="#253540" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
 {kind==='seed'?<><path d="M23 18l-5-9 9 3 7-3 8 3-3 7c14 12 15 31 4 35H21C9 49 13 31 23 18z" fill="#d7ac72"/><path d="M22 20h18M20 25h22" stroke="#7c543e"/><ellipse cx="31" cy="38" rx="11" ry="12" fill={color}/><path d="M31 44V32m0 6c-8 0-8-6-8-6 8-1 8 6 8 6zm0-3c0-7 8-8 8-8s1 8-8 8" stroke="#497548" fill="#8aca67"/></>:
 kind==='meal'?<><path d="M10 32h44c-1 14-8 22-22 22S12 45 10 32z" fill="#e6bd89"/><ellipse cx="32" cy="32" rx="22" ry="8" fill={color}/><path d="M22 22c-6-6 5-7 0-14m10 14c-6-6 5-7 0-14m10 14c-6-6 5-7 0-14" stroke="#fff0c8"/><path d="M16 39c8 6 23 6 32 0" stroke="#fff1cb"/></>:
 kind==='key'?<><circle cx="23" cy="25" r="12" fill="#f7cc63"/><circle cx="23" cy="25" r="5" fill="#294c4c"/><path d="M31 33l20 20m-8-8 6-6m-12 0 5-5" stroke="#f7cc63" strokeWidth="7"/><path d="M31 33l20 20m-8-8 6-6m-12 0 5-5"/></>:kind==='fertilizer'?<><path d="M24 12h16v17l10 12v11H14V41l10-12z" fill="#b0d2d9"/><path d="M20 38h24l4 6v7H16v-7z" fill="#62d6ab"/><path d="M23 10h18v8H23z" fill="#a17551"/><path d="M29 26v12m-7 8h9" stroke="#e8fff0"/></>:
 kind==='soil'?<><path d="M18 18h29l6 35H10z" fill="#9b684f"/><path d="M18 18l5-9 20 2 4 7z" fill="#d6b783"/><path d="M17 31h30v18H17z" fill="#edd4a0"/><path d="M24 42l7-10 8 10z" fill="#776247"/></>:
 crop==='moonberry'?<><path d="M34 29c-3-12 7-18 14-19-1 10-4 15-14 19z" fill="#63b679"/><circle cx="22" cy="34" r="11" fill="#9575df"/><circle cx="42" cy="34" r="11" fill="#b89af4"/><circle cx="31" cy="47" r="12" fill="#9e7de8"/><path d="M17 29h3m17 0h3m-15 13h3" stroke="#e8d8ff"/></>:
 crop==='embercorn'?<><path d="M28 15c9-9 18-2 18 10 0 15-12 27-19 28-9-5-9-25 1-38z" fill="#ffb652"/><path d="M28 24h13m-15 8h13m-15 8h10M34 18l-7 27" stroke="#d47a38"/><path d="M13 31c14 3 15 14 14 24-11-1-15-12-14-24zm35-5c-1 15-4 24-20 29 4-15 12-24 20-29z" fill="#6baf62"/></>:
 <><path d="M25 24c-15-14-6-20 3-6 1-19 12-17 7 0 15-12 22-4 6 7" fill="#6db55c"/><path d="M22 24c6-6 22-5 25 2 5 13-9 24-27 30 1-8-7-25 2-32z" fill="#ffc664"/><path d="M20 33l12 3m-9 9l8 1" stroke="#d68c42"/><path d="M30 26l9 1" stroke="#ffedab"/></>}
 </g></svg>;
}
export function packItems(v:View):PackItem[]{
 const farm=v.mode==='farm',rows:PackItem[]=[];
 for(const crop of Object.keys(CROPS) as CropId[]){
  const c=CROPS[crop];rows.push({key:'seed-'+crop,name:c.name+' seeds',category:'Seeds',count:farm?v.farm.seeds[crop]:v.loot[crop],color:c.color,description:'Plant in an empty bed. Water it to grow '+c.name.toLowerCase()+'.',crop,art:'seed'});
  if(farm){rows.push({key:'crop-'+crop,name:c.name,category:'Crops',count:v.farm.crops[crop],color:c.color,description:c.description,crop,art:'crop'});rows.push({key:'meal-'+crop,name:c.meal,category:'Meals',count:v.farm.meals[crop],color:c.color,description:c.effect+' for your next expedition.',crop,art:'meal'});}
 }
 if(farm){rows.push({key:'grove-key',name:'Grove Key',category:'Supplies',count:v.farm.keys.grove,color:'#80d7a2',description:'Opens one Whispering Grove expedition.',art:'key'});rows.push({key:'hollow-key',name:'Hollow Key',category:'Supplies',count:v.farm.keys.hollow,color:'#b79cfa',description:'Opens one Bramble Hollow expedition.',art:'key'});}
 rows.push({key:'fertilizer',name:'Fertilizer',category:'Supplies',count:farm?v.farm.fertilizer:v.loot.fertilizer,color:'#71d8ad',description:'Speeds up one growing crop. Apply from your farm hotbar near a bed.',art:'fertilizer'});
 rows.push({key:'soil',name:'Rich soil',category:'Supplies',count:farm?v.farm.soil:v.loot.soil,color:'#dbac79',description:'Permanently improves a bed: faster growth and an extra crop per harvest.',art:'soil'});
 return rows;
}
const qualityKey=(i:PackItem)=>i.category==='Seeds'?'seed:'+i.crop:i.category==='Crops'?'crop:'+i.crop:i.category==='Meals'?'meal:'+i.crop:i.key==='grove-key'?'key:grove':i.key==='hollow-key'?'key:hollow':i.key;
export function Inventory({view:v,onSeed,onMeal,onReturn}:{view:View;onSeed:(id:CropId)=>void;onMeal:(id:CropId)=>void;onReturn:()=>void}){
 const [selected,setSelected]=useState('seed-'+v.seed);
 const farm=v.mode==='farm',items=packItems(v).filter(i=>i.count>0||i.category==='Seeds'&&i.crop==='sunroot'),item=items.find(i=>i.key===selected)??items[0];
 const ranks=(i:PackItem):number[]=>farm?qualityCounts(v.farm,qualityKey(i)):[Math.max(0,i.count-(v.lootQuality?.[i.crop??i.key]?.[0]??0)-(v.lootQuality?.[i.crop??i.key]?.[1]??0)),...(v.lootQuality?.[i.crop??i.key]??[0,0])];
 const equipped=item?.crop&&(item.category==='Seeds'?v.held===item.crop:item.category==='Meals'?v.farm.meal===item.crop:false);
 const hint=item?.category==='Seeds'?(farm?'Plant with E':'Bring home to plant'):item?.category==='Meals'?CROPS[item.crop!].effect:item?.category==='Crops'?'Cook at the kitchen':item?.key==='soil'?'Faster growth · +1 crop':'Faster crop growth';
 return <div className="simple-inventory">
  <div className="inventory-grid" aria-label="Inventory items">
   {items.map(i=><button key={i.key} className={'inventory-slot '+(i.key===item?.key?'inspected':'')} style={{'--item-color':i.color} as CSSProperties} aria-label={i.name+', '+(i.category==='Seeds'&&i.crop==='sunroot'?'unlimited':i.count)} aria-pressed={i.key===item?.key} title={i.name} onClick={()=>setSelected(i.key)}><LootArt kind={i.art} crop={i.crop}/><StarBadge value={ranks(i)[2]?3:ranks(i)[1]?2:1}/><b>{i.category==='Seeds'&&i.crop==='sunroot'?'∞':i.count}</b>{farm&&i.crop&&(i.category==='Seeds'&&v.held===i.crop||i.category==='Meals'&&v.farm.meal===i.crop)&&<i><Check size={12}/></i>}</button>)}
   {Array.from({length:Math.max(0,12-items.length)},(_,i)=><div key={'empty-'+i} className="inventory-slot empty-slot" aria-hidden="true"/>)}
  </div>
  {item?<div className="pack-selection" aria-live="polite">
   <LootArt kind={item.art} crop={item.crop} size={48}/>
   <div><h3 style={{color:item.color}}>{item.name}</h3><p>{hint}</p><div className="quality-breakdown">{ranks(item).map((n,i)=>n>0&&<span key={i}><StarBadge value={i+1}/> ×{n}</span>)}</div></div>
   {farm&&item.category==='Seeds'&&<button className="primary" onClick={()=>onSeed(item.crop!)}>{equipped?<Check size={16}/>:null}{equipped?'Equipped':'Equip'}</button>}
   {farm&&item.category==='Meals'&&<button className="primary" onClick={()=>onMeal(item.crop!)}>Food tray</button>}
  </div>:<p className="empty-pack">Your pack is empty.</p>}
  {!farm&&<div className="simple-pack-exit"><span>Early return keeps half.</span><button className="secondary" onClick={onReturn}>Return home</button></div>}
 </div>;
}
export function CombatBelt({view:v,onOpen}:{view:View;onOpen:()=>void}){
 const ids=[...(Object.keys(v.build.items) as ItemId[]).filter(id=>WEAPONS.includes(id as WeaponId)),...PASSIVES].filter(id=>itemLevel(v.build,id)>0);
 return <div className="combat-belt panel" aria-label="Equipped spells and items">{(v.build.meals??[]).map((id,i)=><span className="belt-meal" key={'meal-'+i} title={CROPS[id].meal+' · '+CROPS[id].effect} aria-label={CROPS[id].meal+' active'}><LootArt kind="meal" crop={id} size={23}/><StarBadge value={v.build.mealStars?.[i]??1}/></span>)}{ids.map(id=><button key={id} onClick={onOpen} style={{'--item-color':ITEMS[id].color} as CSSProperties} title={(v.build.evolved.includes(id as WeaponId)?EVOLUTIONS[id as WeaponId].name:ITEMS[id].name)} aria-label={ITEMS[id].name+' level '+itemLevel(v.build,id)}><ItemIcon id={id} size={25} evolved={v.build.evolved.includes(id as WeaponId)}/><span>{v.build.evolved.includes(id as WeaponId)?'✦':'●'.repeat(itemLevel(v.build,id))}</span></button>)}<button onClick={onOpen} className="belt-book" title="Spellbook · B" aria-label="Open spellbook"><Sparkles size={21}/><kbd>B</kbd></button></div>;
}

