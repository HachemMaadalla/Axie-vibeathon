import type {HeroId} from './state';
export type IslandService={kind:'kitchen'|'travel'|'hero';label:string;x:number;z:number;hero?:HeroId};
export const HERO_SPOTS:Record<HeroId,{x:number;z:number}>={
 pomodoro:{x:-3.5,z:-7.5},bing:{x:0,z:-8.5},kotaro:{x:3.5,z:-7.5},
 kibo:{x:-12,z:-9},paladill:{x:12,z:-10},tripp:{x:-13,z:12.5},xia:{x:13,z:12}
};
export const RESIDENTS=[
 {id:'sapidae-m-a',file:'sapidae',x:-11,z:5.1,walk:0,facing:0},
 {id:'sapidae-f-a',file:'sapidae-f-a',x:-8.7,z:-.3,walk:0,facing:1.2},
 {id:'sapidae-m-b',file:'sapidae-m-b',x:10.8,z:-7.5,walk:0,facing:-.8},
 {id:'sapidae-f-b',file:'sapidae-f-b',x:11.5,z:5,walk:0,facing:-1.5},
 {id:'sapidae-f-c',file:'sapidae-f-c',x:-4.8,z:3,walk:1.2,facing:0},
 {id:'sapidae-f-d',file:'sapidae-f-d',x:-14,z:4.5,walk:1.8,facing:0},
 {id:'sapidae-f-e',file:'sapidae-f-e',x:15,z:-1.5,walk:1.8,facing:0},
 {id:'sapidae-m-c',file:'sapidae-m-c',x:1.5,z:-14,walk:2,facing:0},
 {id:'sapidae-m-d',file:'sapidae-m-d',x:-8,z:15,walk:1.6,facing:0},
 {id:'sapidae-m-e',file:'sapidae-m-e',x:7,z:15,walk:1.8,facing:0}
];
export const ISLAND_SERVICES:IslandService[]=[{kind:'kitchen',label:'Cook',x:-7,z:1.6},{kind:'travel',label:'Enter portal',x:7.5,z:-4.4}];
export function nearestService(p:{x:number;y:number;z:number},active:HeroId){
 const list=[...ISLAND_SERVICES,...Object.entries(HERO_SPOTS).filter(([id])=>id!==active).map(([hero,pos])=>({kind:'hero' as const,label:'Talk',hero:hero as HeroId,...pos}))];
 let nearest:IslandService|null=null,distance=Infinity;
 for(const service of list){const d=Math.hypot(p.x-service.x,p.z-service.z);if(d<=2.6&&Math.abs(p.y)<2.4&&d<distance){nearest=service;distance=d;}}
 return {service:nearest,distance};
}

