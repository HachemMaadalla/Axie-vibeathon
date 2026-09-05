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
function Gate({tier,farm,onEnter,onCraft}:{tier:1|2;farm:FarmState;onEnter:(tier:number,stars:Stars)=>void;onCraft:(tier:1|2)=>void}){
 const key=tier===1?'grove':'hollow',recipe=KEY_RECIPES[tier],ready=canCraftKey(farm,tier),[chosen,setChosen]=useState<Stars|null>(null),quality=chosen??nextStars(farm,'key:'+key),counts=qualityCounts(farm,'key:'+key);
 return <div className={'portal-choice '+(tier===2?'hollow-choice':'')}><span className={'portal-gem '+(tier===1?'grove-gem':'hollow-gem')} data-feedback-anchor="portal"/><strong>{tier===1?'Whispering Grove':'Bramble Hollow'}</strong>
 <div className="portal-key"><b><KeyRound size={15}/>{farm.keys[key]}</b>{Object.entries(recipe.cost).map(([id,n])=><span key={id}><LootArt kind="crop" crop={id as keyof typeof farm.crops} size={25}/>{farm.crops[id as keyof typeof farm.crops]}/{n}</span>)}</div>
 <div className="key-quality" aria-label="Key quality">{([1,2,3] as Stars[]).map(s=><button key={s} aria-pressed={quality===s} disabled={!counts[s-1]} onClick={()=>setChosen(s)}><StarBadge value={s}/><b>{counts[s-1]}</b></button>)}</div><small className="key-loot">+{(quality-1)*50}% supply drops</small><div className="portal-actions"><button className="secondary" disabled={!ready} onClick={()=>onCraft(tier)}>Forge key</button><button className="primary" disabled={!counts[quality-1]} onClick={()=>onEnter(tier,quality)}>Enter</button></div></div>;
}
export function IslandPortal({farm,onEnter,onCraft}:{farm:FarmState;onEnter:(tier:number,challenge:Challenge,meals:CropId[],stars:Stars)=>void;onCraft:(tier:1|2,score:number)=>number}){const [forging,setForging]=useState<1|2|null>(null);const [challenge,setChallenge]=useState<Challenge>('calm'),[meals,setMeals]=useState<CropId[]>(()=>farm.meal&&farm.meals[farm.meal]>0?[farm.meal]:[]);if(forging)return <CookingGame id="sunroot" forgeTitle={KEY_RECIPES[forging].name} quality={ingredientStars(farm,KEY_RECIPES[forging].cost)} luck={farmLuck(farm)} craftedStars={farm.lastCraft?.stars??1} onCook={(_,score)=>onCraft(forging,score)} onBack={()=>setForging(null)}/>;return <><FoodTray farm={farm} meals={meals} onChange={setMeals} drought={challenge==='drought'}/><div className="challenge-options" role="group" aria-label="Expedition challenge">{(Object.keys(CHALLENGES) as Challenge[]).map(id=><button key={id} aria-pressed={challenge===id} onClick={()=>setChallenge(id)}>{CHALLENGES[id].name}{farm.progress?.challenges.includes(id)?' ✓':''}</button>)}</div><p className="challenge-hint">{CHALLENGES[challenge].hint}</p><div className="island-portals"><Gate tier={1} farm={farm} onEnter={(tier,stars)=>onEnter(tier,challenge,meals,stars)} onCraft={setForging}/><Gate tier={2} farm={farm} onEnter={(tier,stars)=>onEnter(tier,challenge,meals,stars)} onCraft={setForging}/></div></>;}
