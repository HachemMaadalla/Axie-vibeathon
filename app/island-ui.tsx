'use client';
import {STARTER_SPELL,ITEMS} from '@/lib/game/build';
import {ItemIcon} from './build-ui';
import {HEROES,KEY_RECIPES,canCraftKey,type FarmState,type HeroId} from '@/lib/game/state';
import {KeyRound} from 'lucide-react';
import {LootArt} from './inventory-ui';
export function CompanionTalk({id,onChoose,onClose}:{id:HeroId;onChoose:()=>void;onClose:()=>void}){const perk=HEROES[id].shortPerk;return <div className="companion-talk"><img src={'/assets/axie/'+id+'.png'} alt={HEROES[id].name}/><div><p>Take over?</p><small>{perk}</small><span className="companion-starter"><ItemIcon id={STARTER_SPELL[id]} size={22}/>{ITEMS[STARTER_SPELL[id]].name}</span></div><div className="talk-actions"><button className="secondary" onClick={onClose}>Later</button><button className="primary" onClick={onChoose}>Play as {HEROES[id].name}</button></div></div>;}
function Gate({tier,farm,onEnter,onCraft}:{tier:1|2;farm:FarmState;onEnter:(tier:number)=>void;onCraft:(tier:1|2)=>void}){
 const key=tier===1?'grove':'hollow',recipe=KEY_RECIPES[tier],ready=canCraftKey(farm,tier);
 return <div className={'portal-choice '+(tier===2?'hollow-choice':'')}><span className={'portal-gem '+(tier===1?'grove-gem':'hollow-gem')} data-feedback-anchor="portal"/><strong>{tier===1?'Whispering Grove':'Bramble Hollow'}</strong>
 <div className="portal-key"><b><KeyRound size={15}/>{farm.keys[key]}</b>{Object.entries(recipe.cost).map(([id,n])=><span key={id}><LootArt kind="crop" crop={id as keyof typeof farm.crops} size={25}/>{farm.crops[id as keyof typeof farm.crops]}/{n}</span>)}</div>
 <div className="portal-actions"><button className="secondary" disabled={!ready} onClick={()=>onCraft(tier)}>Craft key</button><button className="primary" disabled={farm.keys[key]<1} onClick={()=>onEnter(tier)}>Enter</button></div></div>;
}
export function IslandPortal({farm,onEnter,onCraft}:{farm:FarmState;onEnter:(tier:number)=>void;onCraft:(tier:1|2)=>void}){return <div className="island-portals"><Gate tier={1} farm={farm} onEnter={onEnter} onCraft={onCraft}/><Gate tier={2} farm={farm} onEnter={onEnter} onCraft={onCraft}/></div>;}
