'use client';
import {StarBadge} from './quality-ui';
import {mealStars,nextStars,ingredientStars,farmLuck} from '@/lib/game/quality';
import {KitchenGame} from './kitchen-game';
import {useState} from 'react';
import {Check,Plus,X} from 'lucide-react';
import {CROPS,CROP_IDS,type FarmState,type CropId} from '@/lib/game/state';
import {foodBuffs,foodLabels,MEAL_SLOTS,MEAL_PAIRS,activeMealPairs} from '@/lib/game/food';
import {LootArt} from './inventory-ui';
export function FoodTray({farm,meals,onChange,drought=false}:{farm:FarmState;meals:CropId[];onChange:(ids:CropId[])=>void;drought?:boolean}){
 const remaining=(id:CropId)=>farm.meals[id]-meals.filter(m=>m===id).length;
 const ranks=mealStars(farm,meals),buffs=foodBuffs(meals,ranks);if(drought)buffs.regen=0;
 return <section className="food-tray"><div className="food-heading"><strong>Your food</strong><small>{meals.length}/{MEAL_SLOTS} · eaten on entry</small></div>
 <div className="meal-slots">{Array.from({length:MEAL_SLOTS},(_,i)=>meals[i]?<button key={i} title={'Remove '+CROPS[meals[i]].meal} aria-label={'Remove '+CROPS[meals[i]].meal} onClick={()=>onChange(meals.filter((_,j)=>i!==j))}><LootArt kind="meal" crop={meals[i]} size={44}/><StarBadge value={ranks[i]}/><X size={12}/><span className="meal-slot-name">{CROPS[meals[i]].meal}</span></button>:<div key={i} className="empty-meal"><Plus size={22}/></div>)}</div>
 <details className="meal-pantry"><summary>Add food</summary><div className="pantry-meals">{CROP_IDS.filter(id=>farm.meals[id]>0).map(id=><button key={id} disabled={remaining(id)<=0||meals.length===MEAL_SLOTS} title={CROPS[id].meal+' · '+CROPS[id].effect} aria-label={'Add '+CROPS[id].meal+', '+remaining(id)+' available. '+CROPS[id].effect} onClick={()=>onChange([...meals,id])}><LootArt kind="meal" crop={id} size={36}/><StarBadge value={nextStars(farm,'meal:'+id,meals.filter(m=>m===id).length)}/><b>{remaining(id)}</b></button>)}</div></details>
 {!CROP_IDS.some(id=>farm.meals[id]>0)&&<p>Cook meals at the campfire.</p>}
 <div className="meal-combos">{activeMealPairs(meals).map(pair=><span key={pair.name} title={foodLabels(pair.bonus).join(" · ")}><Check size={13}/>{pair.name}</span>)}</div>
 <small className="meal-variety">{new Set(meals).size}/4 different dishes · {buffs.loot?("+"+Math.round(buffs.loot*100)+"% supply drops"):"3 dishes: +15% drops"}</small>
 <div className="food-buffs" aria-live="polite">{foodLabels(buffs).map(s=><span key={s}>{s}</span>)}</div>
 {drought&&meals.some(id=>foodBuffs([id]).regen>0)&&<small>Drought: healing disabled</small>}
 </section>;
}
export function CookingPanel({farm,onCook}:{farm:FarmState;onCook:(id:CropId,hits:number)=>number}){
 const [selected,setSelected]=useState<CropId|null>(null);
 if(selected)return <KitchenGame id={selected} onCook={onCook} onBack={()=>setSelected(null)} quality={ingredientStars(farm,{[selected]:2})} luck={farmLuck(farm)} craftedStars={farm.lastCraft?.stars??1}/>;
 return <><small className="cook-note">Harvests return seeds · 85+ score makes 2 meals</small><div className="cook-recipes">{CROP_IDS.map(id=><button key={id} disabled={farm.crops[id]<2} onClick={()=>setSelected(id)}><LootArt kind="meal" crop={id} size={52}/><strong>{CROPS[id].meal}</strong><small>{CROPS[id].effect}</small>{MEAL_PAIRS.filter(pair=>pair.meals.includes(id)).map(pair=>{const partner=pair.meals.find(m=>m!==id)!;return <span className="cook-pair" key={pair.name} title={CROPS[partner].meal+" + "+CROPS[id].meal+": "+foodLabels(pair.bonus).join(" · ")}><Plus size={12}/><LootArt kind="meal" crop={partner} size={24}/><small>{pair.name}</small></span>;})}<span><LootArt kind="crop" crop={id} size={23}/><StarBadge value={nextStars(farm,'crop:'+id)}/>{farm.crops[id]}/2</span></button>)}</div></>;
}
