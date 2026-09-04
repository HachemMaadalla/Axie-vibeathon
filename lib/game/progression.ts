import type {CropId,FarmState,HeroId} from './state';
export type Challenge='calm'|'elite'|'rush'|'bounty'|'drought';
export const CHALLENGES={calm:{name:'Normal',hint:'Standard expedition'},elite:{name:'Elites',hint:'Armored foes · bonus soil'},rush:{name:'Rush',hint:'Fast foes · bonus fertilizer'},bounty:{name:'Bounty',hint:'Double seeds · tougher foes'},drought:{name:'Drought',hint:'No healing · key returned on clear'}} as const;
export type Upgrade='vigor'|'power'|'stride'|'greenhouse';
export const UPGRADES={vigor:{name:'Vital roots',effect:'+10 health',crop:'sunroot',base:16},power:{name:'Bright blades',effect:'+5% damage',crop:'embercorn',base:6},stride:{name:'Light feet',effect:'+3% speed',crop:'moonberry',base:8},greenhouse:{name:'Garden care',effect:'+8% growth',crop:'dewleaf',base:8}} as const;
export type Progress={upgrades:Record<Upgrade,number>;seen:string[];wins:Partial<Record<HeroId,number>>;challenges:Challenge[];bonusHarvests:number};
export function freshProgress():Progress{return {upgrades:{vigor:0,power:0,stride:0,greenhouse:0},seen:['crop:sunroot','crop:moonberry'],wins:{},challenges:[],bonusHarvests:0};}
export function progress(farm:FarmState):Progress{return farm.progress??=freshProgress();}
export function hydrateProgress(value:unknown):Progress{
 const p=freshProgress();if(!value||typeof value!=='object')return p;const v=value as Partial<Progress>;
 for(const id of Object.keys(p.upgrades) as Upgrade[])p.upgrades[id]=Math.max(0,Math.min(3,(Number.isFinite(v.upgrades?.[id])?Math.floor(v.upgrades![id]):0)));
 p.seen=Array.isArray(v.seen)?[...new Set(v.seen.filter((s):s is string=>typeof s==='string'&&s.length<80))].slice(0,300):p.seen;
 if(v.wins&&typeof v.wins==='object')for(const [hero,n] of Object.entries(v.wins))if(['pomodoro','bing','kotaro','kibo','paladill','tripp','xia'].includes(hero))p.wins[hero as HeroId]=Math.max(0,Math.min(9999,(Number.isFinite(n)?Math.floor(n!):0)));
 p.challenges=Array.isArray(v.challenges)?v.challenges.filter(id=>Object.hasOwn(CHALLENGES,id)):[];p.bonusHarvests=Math.max(0,Math.min(999,(Number.isFinite(v.bonusHarvests)?Math.floor(v.bonusHarvests!):0)));return p;
}
export function discover(farm:FarmState,key:string){const p=progress(farm);if(!p.seen.includes(key))p.seen.push(key);}
export function upgradeCost(farm:FarmState,id:Upgrade){return UPGRADES[id].base*((farm.progress?.upgrades[id]??0)+1);}
export function buyUpgrade(farm:FarmState,id:Upgrade){const p=progress(farm),u=UPGRADES[id],cost=upgradeCost(farm,id);if(p.upgrades[id]>=3||farm.crops[u.crop]<cost)return false;farm.crops[u.crop]-=cost;p.upgrades[id]++;return true;}
export const FAMILIES:Record<CropId,{name:string;bonus:string}>={sunroot:{name:'Root',bonus:'Hearty meals'},cloudmelon:{name:'Root',bonus:'Hearty meals'},moonberry:{name:'Breeze',bonus:'Swift meals'},glowcap:{name:'Breeze',bonus:'Swift meals'},embercorn:{name:'Flame',bonus:'Strong meals'},starpepper:{name:'Flame',bonus:'Strong meals'},dewleaf:{name:'Dew',bonus:'Balanced meals'},crystalbean:{name:'Dew',bonus:'Balanced meals'}};
export const MASTERY:Record<HeroId,{name:string;effect:string}>={pomodoro:{name:'Golden gardener',effect:'+15% Thorn damage'},bing:{name:'Sky admiral',effect:'Broadside: +1 cannonball'},kotaro:{name:'Skyblade',effect:'Skybreaker: +20% reach'},kibo:{name:'Mountain keeper',effect:'Earthshaker: +20% area'},paladill:{name:'Crescent guardian',effect:'Reaper: +20% damage'},tripp:{name:'Wind runner',effect:'Skybreaker: 15% faster'},xia:{name:'Crimson dancer',effect:'Reaper: +15% area · 10% faster'}};
export function craftCompost(farm:FarmState,kind:'growth'|'yield'){
 const crop=kind==='growth'?'moonberry':'cloudmelon';if(farm.crops[crop]<2||farm.fertilizer<1)return false;if(kind==='growth'&&!farm.plots.some(p=>p.crop&&p.watered&&p.growth<1))return false;
 farm.crops[crop]-=2;farm.fertilizer--;const p=progress(farm);if(kind==='yield')p.bonusHarvests+=4;else for(const plot of farm.plots)if(plot.crop&&plot.watered)plot.growth=Math.min(1,plot.growth+.35);discover(farm,'recipe:'+kind);return true;
}
