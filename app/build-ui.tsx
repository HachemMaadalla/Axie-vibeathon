'use client';
import {skillSprite} from '@/lib/game/item-art';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {Plus,Check} from 'lucide-react';
import {ITEMS,WEAPONS,PASSIVES,EVOLUTIONS,itemLevel,canEvolve,SLOT_LIMIT,type ItemId,type WeaponId,type Build,type Choice} from '@/lib/game/build';
export function ItemIcon({id,size=24,evolved=false}:{id:ItemId|'heal';size?:number;evolved?:boolean}){
 return <img src={skillSprite(id,evolved)} width={size} height={size} alt="" aria-hidden="true" draggable={false} className={'skill-art-icon '+(evolved?'evolved-art':'')} style={{width:size,height:size}}/>;
}
export function BuildSummary({build}:{build:Build}){
 return <div className="build-summary">{[WEAPONS,PASSIVES].map((ids,index)=><div key={index}><h3>{index===0?'Spells':'Items'} <small>{ids.filter(id=>itemLevel(build,id)>0).length}/{SLOT_LIMIT}</small></h3><div className="equipped-items">{ids.filter(id=>itemLevel(build,id)>0).map(id=><span key={id} style={{borderColor:ITEMS[id].color}} title={ITEMS[id].levels[itemLevel(build,id)-1]}><ItemIcon id={id} size={28} evolved={build.evolved.includes(id as WeaponId)}/><span>{build.evolved.includes(id as WeaponId)?EVOLUTIONS[id as WeaponId].name:ITEMS[id].name}<small>{build.evolved.includes(id as WeaponId)?'Evolved':'Lv. '+itemLevel(build,id)+' / 3'}</small></span></span>)}{Array.from({length:SLOT_LIMIT-ids.filter(id=>itemLevel(build,id)>0).length},(_,i)=><span className="empty-item" key={'empty'+i} aria-label="Empty equipment slot"><Plus size={18}/></span>)}</div></div>)}</div>;
}
export function RecipeBook({build}:{build:Build}){
 return <div className="evolution-book"><p>Max a spell to level 3 and collect its matching item. Choose its evolution at a later level-up. Items stay equipped.</p>{WEAPONS.map(id=>{const recipe=EVOLUTIONS[id],evolved=build.evolved.includes(id);return <article key={id} className={evolved?'recipe-evolved':''}><div className="combination"><span className={itemLevel(build,id)===3?'ingredient-ready':''}><ItemIcon id={id} size={20}/>{ITEMS[id].name}<small>{itemLevel(build,id)}/3</small></span><Plus size={14}/><span className={itemLevel(build,recipe.passive)>0?'ingredient-ready':''}><ItemIcon id={recipe.passive} size={20}/>{ITEMS[recipe.passive].name}<small>{itemLevel(build,recipe.passive)>0?'✓':'Lv. 1'}</small></span></div><h3><ItemIcon id={id} size={32} evolved/> {recipe.name}{evolved&&<Check size={15}/>}{canEvolve(build,id)&&<small>Ready next level</small>}</h3><p>{recipe.text}</p></article>;})}</div>;
}
export function UpgradeCards({choices,build,onChoose}:{choices:Choice[];build:Build;onChoose:(id:Choice['id'])=>void}){
 const [selected,setSelected]=useState<Choice['id']|null>(null),locked=useRef(false),timer=useRef<number|null>(null),callback=useRef(onChoose);
 callback.current=onChoose;
 const select=(id:Choice['id'])=>{if(locked.current)return;locked.current=true;setSelected(id);timer.current=window.setTimeout(()=>callback.current(id),180);};
 useEffect(()=>()=>{if(timer.current!==null)window.clearTimeout(timer.current);},[]);
 useEffect(()=>{const readyAt=performance.now()+250;const key=(e:KeyboardEvent)=>{if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||performance.now()<readyAt)return;const target=e.target as HTMLElement;if(target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName))return;const index=['1','2','3'].indexOf(e.key);if(index>=0&&choices[index]){e.preventDefault();select(choices[index].id);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[choices]);
 return <div className={'level-choice-grid '+(selected?'has-selection':'')} aria-label="Choose one upgrade">{choices.map((c,index)=>{
  const weapon=c.id!=='heal'&&WEAPONS.includes(c.id as WeaponId)?c.id as WeaponId:null;
  const recipe=weapon?EVOLUTIONS[weapon]:null;
  const pair:ItemId|null=recipe?recipe.passive:c.id!=='heal'?WEAPONS.find(w=>EVOLUTIONS[w].passive===c.id&&itemLevel(build,w)>0)??WEAPONS.find(w=>EVOLUTIONS[w].passive===c.id)??null:null;
  const pairOwned=pair?itemLevel(build,pair)>0:false;
  const owned=c.id==='heal'?0:itemLevel(build,c.id),evolution=c.kind==='evolution';
  return <button key={c.id} className={'level-card '+(evolution?'awakening-card ':'')+(selected===c.id?'card-selected':'')} style={{'--skill-color':c.color,'--card-index':index} as CSSProperties} disabled={selected!==null} onClick={()=>select(c.id)} aria-label={c.name+'. '+(evolution?'Evolution. ':c.kind==='heal'?'':owned?'Upgrade to level '+c.level+'. ':'New '+(c.kind==='spell'?'spell':'item')+'. ')+c.text}>
   <span className="card-topline"><span>{evolution?'EVOLVE':c.kind==='heal'?'HEAL':owned?'UPGRADE':'NEW'}{!evolution&&c.kind!=='heal'&&<span className="card-level">{owned?owned+' → '+c.level:'Lv. 1'}</span>}</span><kbd>{index+1}</kbd></span>
   <span className="level-art"><ItemIcon id={c.id} size={128} evolved={evolution}/></span>
   <span className="card-name">{c.name}</span>
   <span className="card-effect">{c.kind==='evolution'?'Awakened power':c.id==='heal'?c.text:shortEffect(c.id,c.level)}</span>
   {pair&&<span className={'card-synergy '+(pairOwned?'synergy-owned':'')} title={(evolution?'Evolved with ':'Evolves with ')+ITEMS[pair].name}><Plus size={13}/><ItemIcon id={pair} size={24}/><strong>{ITEMS[pair].name}</strong>{pairOwned&&<Check size={14}/>}</span>}
  </button>;
 })}</div>;
}

function shortEffect(id:ItemId,level:number){const text:Record<ItemId,string>={frost:'Chilling pulse',void:'Pull enemies inward',dagger:'Piercing blade fan',beam:'Piercing light beam',quake:'Radial earth rupture',venom:'Poison pools',armor:'Take less damage',boots:'Run faster',magnet:'Collect from farther',focus:'Double-damage crits',duration:'Longer spell fields',fortune:'Better loot quality',thorn:'Piercing thorns',petal:'Orbiting petals',spore:'Poison field',storm:'Chain lightning',ember:'Falling meteors',cannon:'Explosive shots',sword:'Straight vertical cut',hammer:'Ground shockwave',axe:'Wide sweeping cleave',sun:'More spell damage',wind:'Faster spells',dew:'Health + regeneration',echo:'Extra projectiles',heart:'Larger spell area'};return text[id]+(level>1?' ↑':'');}
