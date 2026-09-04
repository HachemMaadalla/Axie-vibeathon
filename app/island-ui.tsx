'use client';
import {Coins,Lock} from 'lucide-react';
import {CROPS,HEROES,type CropId,type FarmState,type HeroId} from '@/lib/game/state';
import {PRICES,type TradeKind} from '@/lib/game/economy';
import {LootArt} from './inventory-ui';
export function IslandShop({farm,onTrade}:{farm:FarmState;onTrade:(side:'buy'|'sell',kind:TradeKind,id:CropId)=>void}){
 return <div className="island-shop"><div className="shop-coins" data-feedback-anchor="shop" aria-label={farm.coins+' coins'}><Coins size={19}/>{farm.coins}</div>
 <div className="shop-goods">{(['seeds','crops'] as TradeKind[]).flatMap(kind=>(Object.keys(CROPS) as CropId[]).map(id=>{
 const price=PRICES[kind][id],locked=id==='embercorn'&&!farm.unlocked;
 return <article className="shop-good" key={kind+id}><LootArt kind={kind==='seeds'?'seed':'crop'} crop={id} size={50}/><div><strong>{CROPS[id].name}{kind==='seeds'?' seeds':''}</strong><small>×{farm[kind][id]}</small></div>
 <button className="secondary" disabled={locked||farm.coins<price.buy||farm[kind][id]>=99999} title={locked?'Open Bramble Hollow first':undefined} onClick={()=>onTrade('buy',kind,id)}>{locked?<Lock size={12}/>:null}Buy {price.buy}</button><button className="secondary" disabled={farm[kind][id]<1||farm.coins+price.sell>99999} onClick={()=>onTrade('sell',kind,id)}>Sell {price.sell}</button></article>;
 }))}</div></div>;
}
export function CompanionTalk({id,onChoose,onClose}:{id:HeroId;onChoose:()=>void;onClose:()=>void}){
 const perk={pomodoro:'Bonus harvest seeds',bing:'+20 starting health',kotaro:'+15% damage'}[id];
 return <div className="companion-talk"><img src={'/assets/axie/'+id+'.png'} alt={HEROES[id].name}/><div><p>Take over?</p><small>{perk}</small></div><div className="talk-actions"><button className="secondary" onClick={onClose}>Later</button><button className="primary" onClick={onChoose}>Play as {HEROES[id].name}</button></div></div>;
}
export function IslandPortal({farm,onEnter,onUnlock}:{farm:FarmState;onEnter:(tier:number)=>void;onUnlock:()=>void}){
 return <div className="island-portals"><button className="portal-choice" onClick={()=>onEnter(1)}><span className="portal-gem grove-gem"/><strong>Whispering Grove</strong><small>Enter →</small></button>
 <div className="portal-choice hollow-choice"><span className="portal-gem hollow-gem" data-feedback-anchor="portal"/><strong>Bramble Hollow</strong>{farm.unlocked?<button className="primary" onClick={()=>onEnter(2)}>Enter →</button>:<><div className="portal-cost"><span><LootArt kind="crop" crop="sunroot" size={25}/>{farm.crops.sunroot}/4</span><span><LootArt kind="crop" crop="moonberry" size={25}/>{farm.crops.moonberry}/2</span></div><button className="secondary" disabled={farm.crops.sunroot<4||farm.crops.moonberry<2} onClick={onUnlock}>Unlock</button></>}</div></div>;
}

