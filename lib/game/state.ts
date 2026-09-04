import {freshProgress,hydrateProgress,progress,discover,type Progress} from './progression';
export type CropId='sunroot'|'moonberry'|'embercorn'|'cloudmelon'|'glowcap'|'starpepper'|'dewleaf'|'crystalbean';
export type HeroId='pomodoro'|'bing'|'kotaro'|'kibo'|'paladill'|'tripp'|'xia';
export type DungeonTier=1|2;
export const PLOT_COUNT=24;
export type Plot={crop:CropId|null;growth:number;watered:boolean;rich:boolean;fertilized:boolean};
export const CROPS={
sunroot:{name:'Sunroot',color:'#ffc969',seconds:30,description:'A quick golden root. Its seeds never run out.',meal:'Sunroot broth',effect:'+35 maximum health'},
moonberry:{name:'Moonberry',color:'#b79cfa',seconds:60,description:'Sweet twilight berries full of quick-footed energy.',meal:'Moonberry tea',effect:'+25% movement speed'},
embercorn:{name:'Embercorn',color:'#ff8562',seconds:90,description:'A warm rare crop from the deeper wilds.',meal:'Embercorn roast',effect:'+40% attack damage'},
cloudmelon:{name:'Cloudmelon',color:'#71d9dd',seconds:70,description:'A cool striped melon found in the Grove.',meal:'Cloudmelon fizz',effect:'+45 maximum health'},
glowcap:{name:'Glowcap',color:'#ef86c9',seconds:80,description:'A luminous mushroom that grows after dusk.',meal:'Glowcap soup',effect:'+30% movement speed'},
starpepper:{name:'Starpepper',color:'#ff665b',seconds:100,description:'A bright five-point pepper from Bramble Hollow.',meal:'Starpepper stew',effect:'+50% attack damage'},
dewleaf:{name:'Dewleaf',color:'#63c99c',seconds:65,description:'Crisp leaves that hold sparkling morning dew.',meal:'Dewleaf salad',effect:'+25 health · +15% speed'},
crystalbean:{name:'Crystalbean',color:'#72a7ff',seconds:110,description:'A hard blue pod grown from deep-dungeon seeds.',meal:'Crystalbean bowl',effect:'+20% health, speed and damage'}
} as const;
export const CROP_IDS=Object.keys(CROPS) as CropId[];
export const HEROES={
pomodoro:{name:'Pomodoro',role:'The gentle gardener',perk:'Harvests have a 25% chance to return a seed.',shortPerk:'Bonus harvest seeds',color:'#f68d83',health:0,damage:1,speed:1},
bing:{name:'Bing',role:'The curious explorer',perk:'Starts each expedition with 20 extra health.',shortPerk:'+20 health',color:'#92d7ed',health:20,damage:1,speed:1},
kotaro:{name:'Kotaro',role:'The brave wayfarer',perk:'Deals 15% more damage in the wilds.',shortPerk:'+15% damage',color:'#f3c382',health:0,damage:1.15,speed:1},
kibo:{name:'Kibo',role:'The hammer keeper',perk:'Starts with 10 extra health and deals 10% more damage.',shortPerk:'+10 health · +10% damage',color:'#f3ae85',health:10,damage:1.1,speed:1},
paladill:{name:'Paladill',role:'The island guardian',perk:'Starts each expedition with 35 extra health.',shortPerk:'+35 health',color:'#a6c8f0',health:35,damage:1,speed:1},
tripp:{name:'Tripp',role:'The roaming scout',perk:'Moves 15% faster.',shortPerk:'+15% speed',color:'#c1a0f2',health:0,damage:1,speed:1.15},
xia:{name:'Xia',role:'The swift fighter',perk:'Deals 8% more damage and moves 8% faster.',shortPerk:'+8% damage · +8% speed',color:'#f3be67',health:0,damage:1.08,speed:1.08}
} as const;
export const HERO_IDS=Object.keys(HEROES) as HeroId[];
const cropCounts=(sunroot=0)=>Object.fromEntries(CROP_IDS.map(id=>[id,id==='sunroot'?sunroot:0])) as Record<CropId,number>;
export type FarmState={progress?:Progress;version:1;hero:HeroId;seeds:Record<CropId,number>;crops:Record<CropId,number>;plots:Plot[];fertilizer:number;soil:number;meals:Record<CropId,number>;meal:CropId|null;keys:{grove:number;hollow:number};unlocked:boolean;runs:number;harvests:number;clears:number;day:number};
export const freshFarm=():FarmState=>({progress:freshProgress(),version:1,hero:'pomodoro',seeds:{...cropCounts(),moonberry:3},crops:cropCounts(),plots:Array.from({length:PLOT_COUNT},(_,i)=>({crop:i<3?'sunroot':i===3?'moonberry':null,growth:i<4?1:0,watered:i<4,rich:false,fertilized:false})),fertilizer:2,soil:1,meals:cropCounts(),meal:null,keys:{grove:0,hollow:0},unlocked:false,runs:0,harvests:0,clears:0,day:1});
export function hydrateFarm(value:unknown):FarmState{
 const fresh=freshFarm();if(!value||typeof value!=='object')return fresh;const v=value as Partial<FarmState>;if(v.version!==1||!Array.isArray(v.plots)||![12,PLOT_COUNT].includes(v.plots.length))return fresh;
 const count=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.min(99999,Math.floor(n))):0;
 for(const key of ['seeds','crops','meals'] as const)for(const id of CROP_IDS)fresh[key][id]=count(v[key]?.[id]);
 fresh.plots=fresh.plots.map((empty,i)=>{const p=v.plots![i];if(!p)return {...empty,crop:null,growth:0,watered:false};return {crop:p.crop&&Object.hasOwn(CROPS,p.crop)?p.crop:null,growth:typeof p.growth==='number'&&Number.isFinite(p.growth)?Math.max(0,Math.min(1,p.growth)):0,watered:p.watered===true,rich:p.rich===true,fertilized:p.fertilized===true};});
 fresh.hero=v.hero&&Object.hasOwn(HEROES,v.hero)?v.hero:'pomodoro';fresh.meal=v.meal&&Object.hasOwn(CROPS,v.meal)?v.meal:null;fresh.unlocked=v.unlocked===true;
 fresh.keys={grove:count(v.keys?.grove),hollow:count(v.keys?.hollow)};
 for(const k of ['fertilizer','soil','runs','harvests','clears','day'] as const)fresh[k]=count(v[k]);fresh.day=Math.max(1,fresh.day);fresh.progress=hydrateProgress(v.progress);for(const id of CROP_IDS)if(fresh.seeds[id]||fresh.crops[id]||fresh.meals[id])discover(fresh,'crop:'+id);return fresh;
}
export function grow(farm:FarmState,seconds:number){for(const p of farm.plots)if(p.crop&&p.watered&&p.growth<1)p.growth=Math.min(1,p.growth+Math.max(0,seconds)/CROPS[p.crop].seconds*(p.rich?1.4:1)*(p.fertilized?1.8:1)*(1+(farm.progress?.upgrades.greenhouse??0)*.08));}
export function tend(farm:FarmState,index:number,seed:CropId,random=Math.random):string{
 if(!Number.isInteger(index)||index<0||index>=farm.plots.length||!Object.hasOwn(CROPS,seed))return 'Choose a garden bed.';const p=farm.plots[index];
 if(!p.crop){if(seed!=='sunroot'&&farm.seeds[seed]<=0)return 'No seeds left. Find more in the wilds.';if(seed!=='sunroot')farm.seeds[seed]--;p.crop=seed;p.growth=0;p.watered=false;p.fertilized=false;return CROPS[seed].name+' planted. Water it to start growing.';}
 if(p.growth>=1){const id=p.crop,meta=progress(farm),amount=(p.rich?3:2)+(meta.bonusHarvests>0?1:0);if(meta.bonusHarvests>0)meta.bonusHarvests--;discover(farm,'crop:'+id);farm.crops[id]+=amount;farm.harvests+=amount;if(id!=='sunroot'&&farm.hero==='pomodoro'&&random()<.25)farm.seeds[id]++;p.crop=null;p.growth=0;p.watered=false;p.fertilized=false;return '+'+amount+' '+CROPS[id].name+' harvested!';}
 if(!p.watered){p.watered=true;return 'Watered! Your crop is growing.';}return 'Growing happily. Explore while your garden grows.';
}
export function improve(farm:FarmState,index:number,kind:'fertilizer'|'soil'):string{const p=farm.plots[index];if(!p)return 'Choose a garden bed.';if(kind==='soil'){if(p.rich)return 'This bed already has rich soil.';if(farm.soil<1)return 'Find rich soil in a dungeon.';farm.soil--;p.rich=true;return 'Rich soil: faster growth and +1 crop per harvest.';}if(!p.crop||p.growth>=1)return 'Plant a crop before adding fertilizer.';if(p.fertilized)return 'This crop is already fertilized.';if(farm.fertilizer<1)return 'Find fertilizer in a dungeon.';farm.fertilizer--;p.fertilized=true;return 'Fertilized! This crop now grows 80% faster.';}
export function cook(farm:FarmState,id:CropId):string{if(!Object.hasOwn(CROPS,id))return 'Choose a recipe.';if(farm.crops[id]<2)return 'You need 2 '+CROPS[id].name+'.';farm.crops[id]-=2;farm.meals[id]++;discover(farm,'recipe:'+id);return CROPS[id].meal+' prepared!';}
export const KEY_RECIPES={1:{name:'Grove Key',cost:{sunroot:24}},2:{name:'Hollow Key',cost:{moonberry:12,glowcap:6}}} as const;
const keyId=(tier:DungeonTier)=>tier===1?'grove':'hollow';
export function canCraftKey(farm:FarmState,tier:DungeonTier){return Object.entries(KEY_RECIPES[tier].cost).every(([id,n])=>farm.crops[id as CropId]>=n);}
export function craftKey(farm:FarmState,tier:DungeonTier){const recipe=KEY_RECIPES[tier];if(!canCraftKey(farm,tier))return 'Not enough crops.';for(const [id,n] of Object.entries(recipe.cost))farm.crops[id as CropId]-=n;farm.keys[keyId(tier)]++;if(tier===2)farm.unlocked=true;return recipe.name+' crafted.';}
export function offerHarvest(farm:FarmState):string{return craftKey(farm,2);}
export type Loot=Record<CropId,number>&{fertilizer:number;soil:number};
export const emptyLoot=():Loot=>({...cropCounts(),fertilizer:0,soil:0});
export function beginExpedition(farm:FarmState,tier:number){if(tier!==1&&tier!==2)throw new Error('Unknown expedition');const key=keyId(tier),name=KEY_RECIPES[tier].name;if(farm.keys[key]<1)throw new Error('Craft a '+name+' first');farm.keys[key]--;let meal:CropId|null=null;if(farm.meal&&farm.meals[farm.meal]>0){meal=farm.meal;farm.meals[meal]--;}farm.meal=null;const hpMeal=meal==='sunroot'?35:meal==='cloudmelon'?45:meal==='dewleaf'?25:meal==='crystalbean'?20:0,damageMeal=meal==='embercorn'?1.4:meal==='starpepper'?1.5:meal==='crystalbean'?1.2:1,speedMeal=meal==='moonberry'?1.25:meal==='glowcap'?1.3:meal==='dewleaf'?1.15:meal==='crystalbean'?1.2:1;const u=progress(farm).upgrades;return{hp:100+HEROES[farm.hero].health+hpMeal+u.vigor*10,damage:18*HEROES[farm.hero].damage*damageMeal*(1+u.power*.05),speed:6*HEROES[farm.hero].speed*speedMeal*(1+u.stride*.03),meal};}
export function settleExpedition(farm:FarmState,loot:Loot,outcome:'won'|'escaped'|'lost',tier:number):Loot{const result={...emptyLoot(),...loot};if(outcome==='won')farm.clears++;else for(const k of Object.keys(result) as (keyof Loot)[])result[k]=Math.ceil(result[k]/2);for(const id of CROP_IDS)farm.seeds[id]+=result[id];farm.fertilizer+=result.fertilizer;farm.soil+=result.soil;farm.runs++;farm.day++;return result;}
