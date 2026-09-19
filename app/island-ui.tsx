'use client';
import {StarBadge} from './quality-ui';
import {qualityCounts,nextStars,type Stars} from '@/lib/game/quality';
import {FoodTray} from './cooking-ui';
import type {CropId} from '@/lib/game/state';
import {useState} from 'react';
import {CHALLENGES,type Challenge} from '@/lib/game/progression';
import {MasteryBadge} from './progression-ui';
import {STARTER_SPELL,ITEMS} from '@/lib/game/build';
import {ItemIcon} from './build-ui';
import {HEROES,type FarmState,type HeroId} from '@/lib/game/state';
import {KeyRound} from 'lucide-react';
import {LootArt} from './inventory-ui';
export function CompanionTalk({id,farm,onChoose,onClose}:{id:HeroId;farm:FarmState;onChoose:()=>void;onClose:()=>void}){const perk=HEROES[id].shortPerk;return <div className="companion-talk"><img src={'/assets/axie/'+id+'.png'} alt={HEROES[id].name}/><div><p>Take over?</p><MasteryBadge farm={farm} id={id}/><small>{perk}</small><span className="companion-starter"><ItemIcon id={STARTER_SPELL[id]} size={22}/>{ITEMS[STARTER_SPELL[id]].name}</span></div><div className="talk-actions"><button className="secondary" onClick={onClose}>Later</button><button className="primary" onClick={onChoose}>Play as {HEROES[id].name}</button></div></div>;}
export function IslandPortal({farm,onEnter}:{farm:FarmState;onEnter:(tier:number,challenge:Challenge,meals:CropId[],stars:Stars)=>void}){
 const [tier,setTier]=useState<1|2>(1),[chosen,setChosen]=useState<Stars|null>(null);
 const [challenge,setChallenge]=useState<Challenge>('calm'),[meals,setMeals]=useState<CropId[]>(()=>farm.meal&&farm.meals[farm.meal]>0?[farm.meal]:[]);
 const key=tier===1?'grove':'hollow',counts=qualityCounts(farm,'key:'+key),quality=chosen&&counts[chosen-1]>0?chosen:nextStars(farm,'key:'+key),hasKey=counts[quality-1]>0;
 return <div className="portal-board">
  <div className="dungeon-cards" role="group" aria-label="Choose a dungeon">{([1,2] as const).map(t=><button key={t} className={'dungeon-card'+(tier===t?' selected':'')} aria-pressed={tier===t} onClick={()=>{setTier(t);setChosen(null);}}>
   <img src={'/assets/portal/'+(t===1?'grove':'hollow')+'.webp'} alt="" width={220} height={180}/>
   <strong>{t===1?'Whispering Grove':'Bramble Hollow'}</strong><span>Tier {t}<b><KeyRound size={13}/>{farm.keys[t===1?'grove':'hollow']}</b></span>
  </button>)}</div>
  <FoodTray farm={farm} meals={meals} onChange={setMeals} drought={challenge==='drought'}/>
  <div className="portal-departure" data-feedback-anchor="portal">
   {hasKey?<div className="departure-key"><LootArt kind={tier===1?"grove-key":"hollow-key"} size={25}/>{([1,2,3] as Stars[]).filter(s=>counts[s-1]>0).map(s=><button key={s} aria-label={'Use '+s+' star key'} aria-pressed={quality===s} onClick={()=>setChosen(s)}><StarBadge value={s}/><small>{counts[s-1]}</small></button>)}<small>+{(quality-1)*25}% drops</small></div>:<span className="departure-key"><KeyRound size={17}/>Visit the anvil for a key</span>}
   <button className="primary depart-button" disabled={!hasKey} onClick={()=>onEnter(tier,challenge,meals,quality)}>Enter dungeon</button>
  </div>
  <details className="portal-options"><summary>Options{challenge!=='calm'?' - '+CHALLENGES[challenge].name:''}</summary><div className="challenge-options" role="group" aria-label="Challenge">{(Object.keys(CHALLENGES) as Challenge[]).map(id=><button key={id} aria-pressed={challenge===id} onClick={()=>setChallenge(id)}>{CHALLENGES[id].name}</button>)}</div><small>{CHALLENGES[challenge].hint}</small></details>
 </div>;
}
