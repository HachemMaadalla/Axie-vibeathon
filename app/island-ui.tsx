'use client';
import {StarBadge} from './quality-ui';
import {qualityCounts,nextStars,ingredientStars,farmLuck,type Stars} from '@/lib/game/quality';
import {CookingGame} from './cooking-ui';
import {FoodTray} from './cooking-ui';
import type {CropId} from '@/lib/game/state';
import {useState} from 'react';
import {CHALLENGES,type Challenge} from '@/lib/game/progression';
import {MasteryBadge} from './progression-ui';
import {STARTER_SPELL,ITEMS} from '@/lib/game/build';
import {ItemIcon} from './build-ui';
import {HEROES,KEY_RECIPES,canCraftKey,type FarmState,type HeroId} from '@/lib/game/state';
import {KeyRound} from 'lucide-react';
import {LootArt} from './inventory-ui';
export function CompanionTalk({id,farm,onChoose,onClose}:{id:HeroId;farm:FarmState;onChoose:()=>void;onClose:()=>void}){const perk=HEROES[id].shortPerk;return <div className="companion-talk"><img src={'/assets/axie/'+id+'.png'} alt={HEROES[id].name}/><div><p>Take over?</p><MasteryBadge farm={farm} id={id}/><small>{perk}</small><span className="companion-starter"><ItemIcon id={STARTER_SPELL[id]} size={22}/>{ITEMS[STARTER_SPELL[id]].name}</span></div><div className="talk-actions"><button className="secondary" onClick={onClose}>Later</button><button className="primary" onClick={onChoose}>Play as {HEROES[id].name}</button></div></div>;}
export function IslandPortal({farm,onEnter,onCraft}:{farm:FarmState;onEnter:(tier:number,challenge:Challenge,meals:CropId[],stars:Stars)=>void;onCraft:(tier:1|2,score:number)=>number}){
 const [forging,setForging]=useState<1|2|null>(null),[tier,setTier]=useState<1|2>(1),[chosen,setChosen]=useState<Stars|null>(null);
 const [challenge,setChallenge]=useState<Challenge>('calm'),[meals,setMeals]=useState<CropId[]>(()=>farm.meal&&farm.meals[farm.meal]>0?[farm.meal]:[]);
 const key=tier===1?'grove':'hollow',counts=qualityCounts(farm,'key:'+key),quality=chosen&&counts[chosen-1]>0?chosen:nextStars(farm,'key:'+key),hasKey=counts[quality-1]>0,recipe=KEY_RECIPES[tier];
 if(forging)return <CookingGame id="sunroot" forgeTitle={KEY_RECIPES[forging].name} quality={ingredientStars(farm,KEY_RECIPES[forging].cost)} luck={farmLuck(farm)} craftedStars={farm.lastCraft?.stars??1} onCook={(_,score)=>onCraft(forging,score)} onBack={()=>setForging(null)}/>;
 return <div className="portal-board">
  <div className="dungeon-cards" role="group" aria-label="Choose a dungeon">{([1,2] as const).map(t=><button key={t} className={'dungeon-card'+(tier===t?' selected':'')} aria-pressed={tier===t} onClick={()=>{setTier(t);setChosen(null);}}>
   <img src={'/assets/portal/'+(t===1?'grove':'hollow')+'.webp'} alt="" width={220} height={180}/>
   <strong>{t===1?'Whispering Grove':'Bramble Hollow'}</strong><span>Tier {t}<b><KeyRound size={13}/>{farm.keys[t===1?'grove':'hollow']}</b></span>
  </button>)}</div>
  <FoodTray farm={farm} meals={meals} onChange={setMeals} drought={challenge==='drought'}/>
  <div className="portal-departure" data-feedback-anchor="portal">
   {hasKey?<div className="departure-key"><KeyRound size={19}/>{([1,2,3] as Stars[]).filter(s=>counts[s-1]>0).map(s=><button key={s} aria-label={'Use '+s+' star key'} aria-pressed={quality===s} onClick={()=>setChosen(s)}><StarBadge value={s}/><small>{counts[s-1]}</small></button>)}<small>+{(quality-1)*50}% drops</small></div>:<div className="forge-cost"><KeyRound size={17}/>{Object.entries(recipe.cost).map(([id,n])=><span key={id}><LootArt kind="crop" crop={id as CropId} size={25}/><b>{farm.crops[id as CropId]}/{n}</b></span>)}</div>}
   <button className="primary depart-button" disabled={hasKey?false:!canCraftKey(farm,tier)} onClick={()=>hasKey?onEnter(tier,challenge,meals,quality):setForging(tier)}>{hasKey?'Enter dungeon':'Forge key'}</button>
  </div>
  <details className="portal-options"><summary>Options{challenge!=='calm'?' - '+CHALLENGES[challenge].name:''}</summary><div className="challenge-options" role="group" aria-label="Challenge">{(Object.keys(CHALLENGES) as Challenge[]).map(id=><button key={id} aria-pressed={challenge===id} onClick={()=>setChallenge(id)}>{CHALLENGES[id].name}</button>)}</div><small>{CHALLENGES[challenge].hint}</small>{hasKey&&<button className="secondary" disabled={!canCraftKey(farm,tier)} onClick={()=>setForging(tier)}>Forge another key</button>}</details>
 </div>;
}
