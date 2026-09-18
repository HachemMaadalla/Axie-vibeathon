'use client';
import {useState} from 'react';
import {KEY_RECIPES,canCraftKey,type FarmState,type CropId} from '@/lib/game/state';
import {StarBadge} from './quality-ui';
import {LootArt} from './inventory-ui';
export function ForgeStation({farm,onCraft}:{farm:FarmState;onCraft:(tier:1|2)=>number}){
 const [crafted,setCrafted]=useState(false);
 return <><div className="forge-recipes" data-feedback-anchor="forge">{([1,2] as const).map(t=><div key={t}><LootArt kind={t===1?"grove-key":"hollow-key"} size={54}/><strong>{KEY_RECIPES[t].name}</strong><div className="forge-cost">{Object.entries(KEY_RECIPES[t].cost).map(([id,n])=><span key={id}><LootArt kind="crop" crop={id as CropId} size={30}/>{farm.crops[id as CropId]}/{n}</span>)}</div><button className="primary" disabled={!canCraftKey(farm,t)} onClick={()=>setCrafted(onCraft(t)>0)}>Forge</button></div>)}</div>{crafted&&<p role="status"><StarBadge value={farm.lastCraft?.stars??1}/> Key forged</p>}</>;
}
