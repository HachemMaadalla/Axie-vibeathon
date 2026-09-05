'use client';
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
function Gate({tier,farm,onEnter,onCraft}:{tier:1|2;farm:FarmState;onEnter:(tier:number)=>void;onCraft:(tier:1|2)=>void}){
 const key=tier===1?'grove':'hollow',recipe=KEY_RECIPES[tier],ready=canCraftKey(farm,tier);
 return <div className={'portal-choice '+(tier===2?'hollow-choice':'')}><span className={'portal-gem '+(tier===1?'grove-gem':'hollow-gem')} data-feedback-anchor="portal"/><strong>{tier===1?'Whispering Grove':'Bramble Hollow'}</strong>
 <div className="portal-key"><b><KeyRound size={15}/>{farm.keys[key]}</b>{Object.entries(recipe.cost).map(([id,n])=><span key={id}><LootArt kind="crop" crop={id as keyof typeof farm.crops} size={25}/>{farm.crops[id as keyof typeof farm.crops]}/{n}</span>)}</div>
 <div className="portal-actions"><button className="secondary" disabled={!ready} onClick={()=>onCraft(tier)}>Craft key</button><button className="primary" disabled={farm.keys[key]<1} onClick={()=>onEnter(tier)}>Enter</button></div></div>;
}
export function IslandPortal({farm,onEnter,onCraft}:{farm:FarmState;onEnter:(tier:number,challenge:Challenge,meals:CropId[])=>void;onCraft:(tier:1|2)=>void}){const [challenge,setChallenge]=useState<Challenge>('calm'),[meals,setMeals]=useState<CropId[]>(()=>farm.meal&&farm.meals[farm.meal]>0?[farm.meal]:[]);return <><FoodTray farm={farm} meals={meals} onChange={setMeals} drought={challenge==='drought'}/><div className="challenge-options" role="group" aria-label="Expedition challenge">{(Object.keys(CHALLENGES) as Challenge[]).map(id=><button key={id} aria-pressed={challenge===id} onClick={()=>setChallenge(id)}>{CHALLENGES[id].name}{farm.progress?.challenges.includes(id)?' ✓':''}</button>)}</div><p className="challenge-hint">{CHALLENGES[challenge].hint}</p><div className="island-portals"><Gate tier={1} farm={farm} onEnter={tier=>onEnter(tier,challenge,meals)} onCraft={onCraft}/><Gate tier={2} farm={farm} onEnter={tier=>onEnter(tier,challenge,meals)} onCraft={onCraft}/></div></>;}
