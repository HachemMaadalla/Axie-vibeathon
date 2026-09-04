'use client';
import {STARTER_SPELL,ITEMS} from '@/lib/game/build';
import {ItemIcon} from './build-ui';
import {HEROES,type FarmState,type HeroId} from '@/lib/game/state';
import {LootArt} from './inventory-ui';
export function CompanionTalk({id,onChoose,onClose}:{id:HeroId;onChoose:()=>void;onClose:()=>void}){
 const perk=HEROES[id].shortPerk;
 return <div className="companion-talk"><img src={'/assets/axie/'+id+'.png'} alt={HEROES[id].name}/><div><p>Take over?</p><small>{perk}</small><span className="companion-starter"><ItemIcon id={STARTER_SPELL[id]} size={22}/>{ITEMS[STARTER_SPELL[id]].name}</span></div><div className="talk-actions"><button className="secondary" onClick={onClose}>Later</button><button className="primary" onClick={onChoose}>Play as {HEROES[id].name}</button></div></div>;
}
export function IslandPortal({farm,onEnter,onUnlock}:{farm:FarmState;onEnter:(tier:number)=>void;onUnlock:()=>void}){
 return <div className="island-portals"><button className="portal-choice" onClick={()=>onEnter(1)}><span className="portal-gem grove-gem"/><strong>Whispering Grove</strong><small>Enter →</small></button>
 <div className="portal-choice hollow-choice"><span className="portal-gem hollow-gem" data-feedback-anchor="portal"/><strong>Bramble Hollow</strong>{farm.unlocked?<button className="primary" onClick={()=>onEnter(2)}>Enter →</button>:<><div className="portal-cost"><span><LootArt kind="crop" crop="sunroot" size={25}/>{farm.crops.sunroot}/4</span><span><LootArt kind="crop" crop="moonberry" size={25}/>{farm.crops.moonberry}/2</span></div><button className="secondary" disabled={farm.crops.sunroot<4||farm.crops.moonberry<2} onClick={onUnlock}>Unlock</button></>}</div></div>;
}

