'use client';
import {Sprout,Flower2,Cloud,Zap,Flame,Sun,Wind,Droplets,Gem,Heart,Sparkles,ArrowRight,Plus,Check} from 'lucide-react';
import {ITEMS,WEAPONS,PASSIVES,EVOLUTIONS,itemLevel,canEvolve,SLOT_LIMIT,type ItemId,type WeaponId,type Build,type Choice} from '@/lib/game/build';
export function ItemIcon({id,size=24}:{id:ItemId|'heal';size?:number}){
 const Icon={thorn:Sprout,petal:Flower2,spore:Cloud,storm:Zap,ember:Flame,sun:Sun,wind:Wind,dew:Droplets,echo:Gem,heart:Heart,heal:Heart}[id];return <Icon size={size}/>;
}
export function BuildSummary({build}:{build:Build}){
 return <div className="build-summary">{[WEAPONS,PASSIVES].map((ids,index)=><div key={index}><h3>{index===0?'Spells':'Items'} <small>{ids.filter(id=>itemLevel(build,id)>0).length}/{SLOT_LIMIT}</small></h3><div className="equipped-items">{ids.filter(id=>itemLevel(build,id)>0).map(id=><span key={id} style={{borderColor:ITEMS[id].color}} title={ITEMS[id].levels[itemLevel(build,id)-1]}><ItemIcon id={id} size={19}/><span>{build.evolved.includes(id as WeaponId)?EVOLUTIONS[id as WeaponId].name:ITEMS[id].name}<small>{build.evolved.includes(id as WeaponId)?'Evolved':'Lv. '+itemLevel(build,id)+' / 3'}</small></span></span>)}{Array.from({length:SLOT_LIMIT-ids.filter(id=>itemLevel(build,id)>0).length},(_,i)=><span className="empty-item" key={'empty'+i} aria-label="Empty equipment slot"><Plus size={18}/></span>)}</div></div>)}</div>;
}
export function RecipeBook({build}:{build:Build}){
 return <div className="evolution-book"><p>Max a spell to level 3 and collect its matching item. Choose its evolution at a later level-up. Items stay equipped.</p>{WEAPONS.map(id=>{const recipe=EVOLUTIONS[id],evolved=build.evolved.includes(id);return <article key={id} className={evolved?'recipe-evolved':''}><div className="combination"><span className={itemLevel(build,id)===3?'ingredient-ready':''}><ItemIcon id={id} size={20}/>{ITEMS[id].name}<small>{itemLevel(build,id)}/3</small></span><Plus size={14}/><span className={itemLevel(build,recipe.passive)>0?'ingredient-ready':''}><ItemIcon id={recipe.passive} size={20}/>{ITEMS[recipe.passive].name}<small>{itemLevel(build,recipe.passive)>0?'✓':'Lv. 1'}</small></span></div><h3>{evolved?<Check size={17}/>:<Sparkles size={17}/>} {recipe.name}{canEvolve(build,id)&&<small>Ready next level</small>}</h3><p>{recipe.text}</p></article>;})}</div>;
}
export function UpgradeCards({choices,build,onChoose}:{choices:Choice[];build:Build;onChoose:(id:Choice['id'])=>void}){
 return <div className="upgrade-options equipment-choices">{choices.map(c=>{
 const recipe=c.id!=='heal'&&WEAPONS.includes(c.id as WeaponId)?EVOLUTIONS[c.id as WeaponId]:null;
 const partner=c.id!=='heal'&&PASSIVES.includes(c.id as never)?WEAPONS.find(w=>EVOLUTIONS[w].passive===c.id):null;
 return <button key={c.id} className={c.kind==='evolution'?'evolution-choice':''} onClick={()=>onChoose(c.id)}>
 <span className="choice-type">{c.kind==='evolution'?'EVOLUTION':c.kind==='heal'?'RECOVERY':(c.level===1?'NEW ':'UPGRADE · ')+(c.kind==='spell'?'SPELL':'ITEM')}</span>
 <span className="choice-icon" style={{background:c.color}}>{c.kind==='evolution'?<Sparkles size={32}/>:<ItemIcon id={c.id} size={32}/>}</span>
 <h3>{c.name}</h3><span className="choice-level">{c.kind==='evolution'?'Awakened':c.id==='heal'?'':c.level===1?'Level 1':('Level '+itemLevel(build,c.id)+' → '+c.level)}</span><p>{c.text}</p>
 {(recipe||partner)&&<small className="choice-combo">{recipe?'Pairs with '+ITEMS[recipe.passive].name:'Evolves '+ITEMS[partner!].name}</small>}
 <span className="choice-select">{c.kind==='evolution'?'Evolve':'Choose'}<ArrowRight size={16}/></span>
 </button>;
 })}</div>;
}

