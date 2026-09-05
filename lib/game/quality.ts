import type {FarmState,CropId} from './state';
export type Stars=1|2|3;
export type QualityBag=Record<string,[number,number]>;
export const stars=(n:number)=>'★'.repeat(Math.max(1,Math.min(3,Math.round(n))));
export const qualityPower=(n:number)=>1+(n-1)*.3;
export function total(f:FarmState,key:string):number{const [group,id]=key.split(':');return group==='seed'?f.seeds[id as CropId]??0:group==='crop'?f.crops[id as CropId]??0:group==='meal'?f.meals[id as CropId]??0:group==='key'?f.keys[id as 'grove'|'hollow']??0:key==='soil'?f.soil:key==='fertilizer'?f.fertilizer:0;}
function setTotal(f:FarmState,key:string,n:number){const [group,id]=key.split(':');if(group==='seed')f.seeds[id as CropId]=n;else if(group==='crop')f.crops[id as CropId]=n;else if(group==='meal')f.meals[id as CropId]=n;else if(group==='key')f.keys[id as 'grove'|'hollow']=n;else if(key==='soil')f.soil=n;else if(key==='fertilizer')f.fertilizer=n;}
const count=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.floor(n)):0;
export function qualityCounts(f:FarmState,key:string):[number,number,number]{const n=total(f,key),raw=f.quality?.[key],gold=Math.min(n,count(raw?.[1])),silver=Math.min(n-gold,count(raw?.[0]));return [n-gold-silver,silver,gold];}
export function nextStars(f:FarmState,key:string,skip=0):Stars{const c=qualityCounts(f,key);for(const s of [3,2,1] as Stars[]){if(skip<c[s-1])return s;skip-=c[s-1];}return 1;}
export function grantQuality(f:FarmState,key:string,n:number,s:Stars=1){const c=qualityCounts(f,key);setTotal(f,key,total(f,key)+n);c[s-1]+=n;(f.quality??={})[key]=[c[1],c[2]];}
export function takeQuality(f:FarmState,key:string,n:number,chosen?:Stars):Stars[]{
 const c=qualityCounts(f,key);if(!Number.isInteger(n)||n<0||(chosen?c[chosen-1]:total(f,key))<n)throw new Error('Not enough supplies');
 const out:Stars[]=[];for(const s of chosen?[chosen]:[3,2,1] as Stars[]){const used=Math.min(n-out.length,c[s-1]);for(let i=0;i<used;i++)out.push(s);c[s-1]-=used;}
 setTotal(f,key,total(f,key)-n);(f.quality??={})[key]=[c[1],c[2]];return out;
}
export function mealStars(f:FarmState,ids:CropId[]){const used:Partial<Record<CropId,number>>={};return ids.map(id=>{const s=nextStars(f,'meal:'+id,used[id]??0);used[id]=(used[id]??0)+1;return s;});}
export function ingredientStars(f:FarmState,cost:Record<string,number>){let sum=0,n=0;for(const [id,amount] of Object.entries(cost))for(let i=0;i<amount;i++){sum+=nextStars(f,'crop:'+id,i);n++;}return n?sum/n:1;}
export function farmLuck(f:FarmState){return Math.min(.12,(f.progress?.upgrades.greenhouse??0)*.02+f.clears*.002);}
export function qualityOdds(score=0,luck=0,input=1){score=Math.max(0,Math.min(3,score));luck=Math.max(0,Math.min(.3,luck));input=Math.max(1,Math.min(3,input));const gold=Math.min(.35,.02+score*.06+(input-1)*.05+luck*.5),silver=Math.min(.6,.18+score*.1+(input-1)*.05+luck);return [1-silver-gold,silver,gold];}
export function rollQuality(score=0,luck=0,input=1,random=Math.random):Stars{const odds=qualityOdds(score,luck,input),r=random();return r<odds[2]?3:r<odds[2]+odds[1]?2:1;}
export function hydrateQuality(f:FarmState,raw:unknown){if(!raw||typeof raw!=='object')return;f.quality={};for(const [key,value] of Object.entries(raw)){if(!/^(seed|crop|meal):(sunroot|moonberry|embercorn|cloudmelon|glowcap|starpepper|dewleaf|crystalbean)$|^key:(grove|hollow)$|^(soil|fertilizer)$/.test(key)||!Array.isArray(value))continue;f.quality[key]=[count(value[0]),count(value[1])];const c=qualityCounts(f,key);f.quality[key]=[c[1],c[2]];}}
