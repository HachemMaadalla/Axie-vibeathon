import {qualityPower} from './quality';
import type {CropId} from './state';
export const MEAL_SLOTS=4;
export type FoodBuffs={health:number;damage:number;speed:number;haste:number;armor:number;regen:number;magnet:number;area:number;luck:number};
export const FOODS:Record<CropId,Partial<FoodBuffs>>={
 sunroot:{health:35,regen:.2},moonberry:{speed:.25,haste:.05},embercorn:{damage:.4,area:.1},cloudmelon:{health:45,armor:.08},
 glowcap:{haste:.15,magnet:1.5},starpepper:{damage:.5,haste:.08},dewleaf:{health:25,speed:.15,regen:.6},crystalbean:{health:20,damage:.2,armor:.12,luck:.03}
};
export function foodBuffs(meals:CropId[],ranks:number[]=[]):FoodBuffs{
 const b:FoodBuffs={health:0,damage:0,speed:0,haste:0,armor:0,regen:0,magnet:0,area:0,luck:0};
 for(const [i,id] of meals.slice(0,MEAL_SLOTS).entries())for(const [key,value] of Object.entries(FOODS[id]??{}))b[key as keyof FoodBuffs]+=value*qualityPower(ranks[i]??1);
 b.health=Math.round(b.health);b.luck=Math.min(.2,b.luck);b.damage=Math.min(1.2,b.damage);b.speed=Math.min(.6,b.speed);b.haste=Math.min(.4,b.haste);b.armor=Math.min(.35,b.armor);b.magnet=Math.min(4,b.magnet);return b;
}
export function foodLabels(b:Partial<FoodBuffs>){return [
 b.health?'+'+b.health+' HP':'',b.damage?'+'+Math.round(b.damage*100)+'% damage':'',b.speed?'+'+Math.round(b.speed*100)+'% speed':'',
 b.haste?Math.round(b.haste*100)+'% shorter cooldown':'',b.armor?Math.round(b.armor*100)+'% less damage':'',b.regen?'+'+Number(b.regen.toFixed(1))+' HP/s':'',
 b.magnet?'+'+b.magnet+' pickup range':'',b.luck?'+'+Math.round(b.luck*100)+'% luck':'',b.area?'+'+Math.round(b.area*100)+'% spell size':''
].filter(Boolean);}
export const COOK_TARGETS=[.32,.67,.46];
export const COOK_ROUND_MS=2800;
export function cookingPosition(ms:number){const t=Math.max(0,ms)/900;return 1-Math.abs(t%2-1);}
export function cookingHit(ms:number,round:number){return ms>=120&&ms<COOK_ROUND_MS&&Math.abs(cookingPosition(ms)-COOK_TARGETS[round])<=.12;}
