import type {HeroId} from './state';
export type IslandService={kind:'kitchen'|'travel'|'shop'|'hero';label:string;x:number;z:number;hero?:HeroId};
export const HERO_SPOTS:Record<HeroId,{x:number;z:number}>={pomodoro:{x:-3.5,z:-7.5},bing:{x:0,z:-8.5},kotaro:{x:3.5,z:-7.5}};
export const ISLAND_SERVICES:IslandService[]=[{kind:'kitchen',label:'Cook',x:-7,z:1.6},{kind:'travel',label:'Enter portal',x:7.5,z:-4.4},{kind:'shop',label:'Shop',x:-8,z:8.6}];
export function nearestService(p:{x:number;y:number;z:number},active:HeroId){
 const list=[...ISLAND_SERVICES,...Object.entries(HERO_SPOTS).filter(([id])=>id!==active).map(([hero,pos])=>({kind:'hero' as const,label:'Talk',hero:hero as HeroId,...pos}))];
 let nearest:IslandService|null=null,distance=Infinity;
 for(const service of list){const d=Math.hypot(p.x-service.x,p.z-service.z);if(d<=2.6&&Math.abs(p.y)<2.4&&d<distance){nearest=service;distance=d;}}
 return {service:nearest,distance};
}

