'use client';
import {useState} from 'react';
import {MapPin,Flame,Sparkles,Lock,Check,Heart,Wind,Swords,Sprout} from 'lucide-react';
import {CROPS,CROP_IDS,HERO_IDS,HEROES,type FarmState,type CropId,type HeroId} from '@/lib/game/state';
import {UPGRADES,upgradeCost,FAMILIES,MASTERY,type Upgrade} from '@/lib/game/progression';
import {ITEMS,WEAPONS,EVOLUTIONS,STARTER_SPELL} from '@/lib/game/build';
import {ENEMY_INFO} from '@/lib/game/enemies';
import {seasonName} from '@/lib/game/atmosphere';
import {plotPosition} from '@/lib/game/farming';
import {ItemIcon} from './build-ui';
import {LootArt} from './inventory-ui';
import type {View} from '@/lib/game/scene';
export function PermanentUpgrades({farm,onBuy}:{farm:FarmState;onBuy:(id:Upgrade)=>void}){
 const icons={vigor:Heart,power:Swords,stride:Wind,greenhouse:Sprout};
 return <details className="compact-fold"><summary><Sprout size={18}/> Roots · permanent upgrades</summary><div className="roots-grid">{(Object.keys(UPGRADES) as Upgrade[]).map(id=>{const u=UPGRADES[id],level=farm.progress?.upgrades[id]??0,cost=upgradeCost(farm,id),Icon=icons[id];return <button key={id} disabled={level>=3||farm.crops[u.crop]<cost} onClick={()=>onBuy(id)}><Icon size={24}/><strong>{u.name}</strong><span>{u.effect} · {level}/3</span><small>{level===3?<Check size={18}/>:<><LootArt kind="crop" crop={u.crop} size={24}/>{farm.crops[u.crop]}/{cost}</>}</small></button>;})}</div></details>;
}
export function CompostRecipes({farm,onMix}:{farm:FarmState;onMix:(kind:'growth'|'yield')=>void}){
 return <details className="compact-fold"><summary><Sprout size={18}/> Compost</summary><div className="roots-grid compost-grid">{(['growth','yield'] as const).map(kind=>{const crop=kind==='growth'?'moonberry':'cloudmelon';return <button key={kind} disabled={farm.crops[crop]<2||farm.fertilizer<1||kind==='growth'&&!farm.plots.some(p=>p.crop&&p.watered&&p.growth<1)} onClick={()=>onMix(kind)}><LootArt kind="fertilizer" size={32}/><strong>{kind==='growth'?'Quick compost':'Rich compost'}</strong><span>{kind==='growth'?'+35% growth · watered beds':'+1 crop · next 4 harvests'}</span><small><LootArt kind="crop" crop={crop} size={23}/>2 + <LootArt kind="fertilizer" size={23}/>1</small></button>;})}</div>{(farm.progress?.bonusHarvests??0)>0&&<p>{farm.progress!.bonusHarvests} boosted harvests ready</p>}</details>;
}
export function MasteryBadge({farm,id}:{farm:FarmState;id:HeroId}){
 const wins=farm.progress?.wins[id]??0,m=MASTERY[id];return <span className="mastery-badge"><Sparkles size={16}/>{wins>=3?m.name:Math.min(3,wins)+'/3 clears'}<small>{wins>=3?m.effect:'Awaken your starting weapon'}</small></span>;
}
export function JourneyMap({view:v}:{view:View}){
 const farm=v.mode==='farm',seen=new Set(v.farm.progress?.seen??[]),[selected,setSelected]=useState('');
 const plots=v.farm.plots,p=v.position??{x:0,z:0};
 const entries=[
 ...CROP_IDS.map(id=>({key:'crop:'+id,name:CROPS[id].name,known:seen.has('crop:'+id),art:<LootArt kind="crop" crop={id} size={36}/>,text:FAMILIES[id].name+' · '+CROPS[id].seconds+'s · '+FAMILIES[id].bonus})),
 ...WEAPONS.map(id=>({key:'weapon:'+id,name:ITEMS[id].name,known:seen.has('weapon:'+id)||STARTER_SPELL[v.farm.hero]===id,art:<ItemIcon id={id} size={36}/>,text:EVOLUTIONS[id].name+' · '+ITEMS[EVOLUTIONS[id].passive].name})),
 ...Object.entries(ENEMY_INFO).map(([id,e])=>({key:'enemy:'+id,name:e.name,known:seen.has('enemy:'+id),art:<Swords size={30} color={e.color}/>,text:e.tip})),
 ...CROP_IDS.map(id=>({key:'recipe:'+id,name:CROPS[id].meal,known:seen.has('recipe:'+id),art:<LootArt kind="meal" crop={id} size={36}/>,text:CROPS[id].effect})),
 ...WEAPONS.map(id=>({key:'evolution:'+id,name:EVOLUTIONS[id].name,known:seen.has('evolution:'+id),art:<ItemIcon id={id} size={36}/>,text:'Evolved '+ITEMS[id].name})),
 ...(['growth','yield'] as const).map(id=>({key:'recipe:'+id,name:id==='growth'?'Quick compost':'Rich compost',known:seen.has('recipe:'+id),art:<LootArt kind="fertilizer" size={36}/>,text:id==='growth'?'+35% growth · watered beds':'+1 crop · next 4 harvests'}))
 ];
 const entry=entries.find(e=>e.key===selected);
 return <div className="journey-map"><div className="map-caption"><strong>{farm?'Home':v.tier===1?'Whispering Grove':'Bramble Hollow'}</strong><span>{farm?seasonName(v.farm.day):'Tier '+v.tier}</span></div>
 <svg viewBox="-33 -33 66 66" className="island-map" role="img" aria-label="Island map with your position"><circle r="30" fill={farm?'#74a956':v.tier===1?'#6b9f54':'#81699b'} stroke="#ead8a5" strokeWidth="1.2"/>{farm?<>{plots.map((plot,i)=><rect key={i} x={plotPosition(i).x-1} y={plotPosition(i).z-1} width="2" height="2" rx=".3" fill={plot.crop?plot.growth>=1?'#ffcb59':plot.watered?'#71d9e2':'#9cb54a':'#755239'}/>)}<g><circle cx="0" cy="-6" r="1.6" fill="#ffcf72"/><text x="0" y="-9" textAnchor="middle" fontSize="2.6" fill="#fff8d2">Forge</text></g><circle cx="-7" cy="1.6" r="1.5" fill="#ffb15e"/><circle cx="7.5" cy="-4.4" r="1.5" fill="#bcabff"/></>:<>{[[-15,-9],[15,13],[-13,17]].map(([x,z])=><circle key={x} cx={x} cy={z} r="5" fill="#fff" opacity=".12"/>)}</>}<circle cx={p.x} cy={p.z} r="1.2" fill="#fff8d2" stroke="#244647" strokeWidth=".6"/></svg>
 <div className="map-legend"><span><MapPin size={16}/>You</span>{farm&&<><span><Flame size={16}/>Campfire</span><span><Sparkles size={16}/>Portal</span></>}</div>
 <details className="compact-fold"><summary>Discoveries <small>{entries.filter(e=>e.known).length}/{entries.length}</small></summary><div className="discovery-grid">{entries.map(e=><button key={e.key} title={e.known?e.name:'Undiscovered'} aria-label={e.known?e.name:'Undiscovered'} aria-pressed={selected===e.key} onClick={()=>setSelected(e.key)}>{e.known?e.art:<Lock size={22}/>}</button>)}</div><p className="discovery-caption">{entry?(entry.known?entry.name+' · '+entry.text:'Find this on your journey.'):'Select a discovery'}</p></details>
 <details className="compact-fold"><summary><Sparkles size={18}/> Axie mastery</summary><div className="mastery-list">{HERO_IDS.map(id=><div key={id}><img src={'/assets/axie/'+id+'.png'} alt={HEROES[id].name}/><MasteryBadge farm={v.farm} id={id}/></div>)}</div></details></div>;
}
