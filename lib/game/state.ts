export type CropId='sunroot'|'moonberry'|'embercorn';
export type HeroId='pomodoro'|'bing'|'kotaro'|'kibo'|'paladill'|'tripp'|'xia';
export type Plot={crop:CropId|null;growth:number;watered:boolean;rich:boolean;fertilized:boolean};
export const CROPS={
sunroot:{name:'Sunroot',color:'#ffc969',seconds:55,description:'A golden root that makes a hearty recovery broth.',meal:'Sunroot broth',effect:'+35 maximum health'},
moonberry:{name:'Moonberry',color:'#b79cfa',seconds:75,description:'Sweet twilight berries, full of quick-footed energy.',meal:'Moonberry tea',effect:'+25% movement speed'},
embercorn:{name:'Embercorn',color:'#ff8562',seconds:95,description:'A rare crop found beyond the Bramble Gate.',meal:'Embercorn roast',effect:'+40% attack damage'}
} as const;
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
export type FarmState={version:1;coins:number;hero:HeroId;seeds:Record<CropId,number>;crops:Record<CropId,number>;plots:Plot[];fertilizer:number;soil:number;meals:Record<CropId,number>;meal:CropId|null;unlocked:boolean;runs:number;harvests:number;clears:number;day:number};
export const freshFarm=():FarmState=>({version:1,coins:30,hero:'pomodoro',seeds:{sunroot:7,moonberry:3,embercorn:0},crops:{sunroot:0,moonberry:0,embercorn:0},plots:Array.from({length:12},(_,i)=>({crop:i<3?'sunroot':i===3?'moonberry':null,growth:i<4?1:0,watered:i<4,rich:false,fertilized:false})),fertilizer:2,soil:1,meals:{sunroot:0,moonberry:0,embercorn:0},meal:null,unlocked:false,runs:0,harvests:0,clears:0,day:1});
export function hydrateFarm(value:unknown):FarmState{
const fresh=freshFarm();if(!value||typeof value!=='object')return fresh;const v=value as FarmState;if(v.version!==1||!Array.isArray(v.plots)||v.plots.length!==12)return fresh;
const count=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.min(99999,Math.floor(n))):0;
for(const key of ['seeds','crops','meals'] as const)for(const id of Object.keys(CROPS) as CropId[])fresh[key][id]=count(v[key]?.[id]);
fresh.plots=v.plots.map(p=>({crop:p&&p.crop&&Object.hasOwn(CROPS,p.crop)?p.crop:null,growth:typeof p?.growth==='number'&&Number.isFinite(p.growth)?Math.max(0,Math.min(1,p.growth)):0,watered:p?.watered===true,rich:p?.rich===true,fertilized:p?.fertilized===true}));
fresh.hero=Object.hasOwn(HEROES,v.hero)?v.hero:'pomodoro';fresh.meal=v.meal&&Object.hasOwn(CROPS,v.meal)?v.meal:null;fresh.unlocked=v.unlocked===true;
for(const k of ['fertilizer','soil','runs','harvests','clears','day'] as const)fresh[k]=count(v[k]);fresh.day=Math.max(1,fresh.day);fresh.coins=v.coins===undefined?30:count(v.coins);return fresh;}
export function grow(farm:FarmState,seconds:number){for(const p of farm.plots)if(p.crop&&p.watered&&p.growth<1)p.growth=Math.min(1,p.growth+Math.max(0,seconds)/CROPS[p.crop].seconds*(p.rich?1.4:1)*(p.fertilized?1.8:1));}
export function tend(farm:FarmState,index:number,seed:CropId,random=Math.random):string{
if(!Number.isInteger(index)||index<0||index>=12||!(Object.hasOwn(CROPS,seed)))return 'Choose a garden bed.';const p=farm.plots[index];
if(!p.crop){if(farm.seeds[seed]<=0)return 'No seeds left. Find more in the wilds.';farm.seeds[seed]--;p.crop=seed;p.growth=0;p.watered=false;p.fertilized=false;return CROPS[seed].name+' planted. Water it to start growing.';}
if(p.growth>=1){const id=p.crop;const amount=p.rich?3:2;farm.crops[id]+=amount;farm.harvests+=amount;if(farm.hero==='pomodoro'&&random()<.25)farm.seeds[id]++;p.crop=null;p.growth=0;p.watered=false;p.fertilized=false;return '+'+amount+' '+CROPS[id].name+' harvested!';}
if(!p.watered){p.watered=true;return 'Watered! Your crop is growing.';}return 'Growing happily. Explore while your garden grows.';}
export function improve(farm:FarmState,index:number,kind:'fertilizer'|'soil'):string{const p=farm.plots[index];if(!p)return 'Choose a garden bed.';if(kind==='soil'){if(p.rich)return 'This bed already has rich soil.';if(farm.soil<1)return 'Find rich soil in a dungeon.';farm.soil--;p.rich=true;return 'Rich soil: faster growth and +1 crop per harvest.';}
if(!p.crop||p.growth>=1)return 'Plant a crop before adding fertilizer.';if(p.fertilized)return 'This crop is already fertilized.';if(farm.fertilizer<1)return 'Find fertilizer in a dungeon.';farm.fertilizer--;p.fertilized=true;return 'Fertilized! This crop now grows 80% faster.';}
export function cook(farm:FarmState,id:CropId):string{if(!(Object.hasOwn(CROPS,id)))return 'Choose a recipe.';if(farm.crops[id]<2)return 'You need 2 '+CROPS[id].name+'.';farm.crops[id]-=2;farm.meals[id]++;return CROPS[id].meal+' prepared!';}
export function offerHarvest(farm:FarmState):string{if(farm.unlocked)return 'The Bramble Gate is already open.';if(farm.crops.sunroot<4||farm.crops.moonberry<2)return 'The gate needs 4 Sunroot and 2 Moonberry.';farm.crops.sunroot-=4;farm.crops.moonberry-=2;farm.unlocked=true;return 'The Bramble Gate awakens. Embercorn awaits!';}
export type Loot={sunroot:number;moonberry:number;embercorn:number;fertilizer:number;soil:number};
export const emptyLoot=():Loot=>({sunroot:0,moonberry:0,embercorn:0,fertilizer:0,soil:0});
export function rewardKill(loot:Loot,kills:number,tier:number){if(kills%3===0)loot.sunroot++;if(kills%5===0)loot.moonberry++;if(kills%7===0)loot.fertilizer++;if(kills%11===0)loot.soil++;if(tier===2&&kills%6===0)loot.embercorn++;}
export function beginExpedition(farm:FarmState,tier:number){if(tier!==1&&tier!==2)throw new Error('Unknown expedition');if(tier===2&&!farm.unlocked)throw new Error('Open the Bramble Gate first');let meal:CropId|null=null;if(farm.meal&&farm.meals[farm.meal]>0){meal=farm.meal;farm.meals[meal]--;}farm.meal=null;return{hp:100+HEROES[farm.hero].health+(meal==='sunroot'?35:0),damage:18*HEROES[farm.hero].damage*(meal==='embercorn'?1.4:1),speed:6*HEROES[farm.hero].speed*(meal==='moonberry'?1.25:1),meal};}
export function settleExpedition(farm:FarmState,loot:Loot,outcome:'won'|'escaped'|'lost',tier:number):Loot{const result={...loot};if(outcome==='won'){result.sunroot+=3;result.moonberry+=2;result.fertilizer++;result.soil++;if(tier===2)result.embercorn+=3;farm.clears++;}else for(const k of Object.keys(result) as (keyof Loot)[])result[k]=Math.ceil(result[k]/2);result.sunroot=Math.max(1,result.sunroot);for(const id of Object.keys(CROPS) as CropId[])farm.seeds[id]+=result[id];farm.fertilizer+=result.fertilizer;farm.soil+=result.soil;farm.runs++;farm.day++;return result;}

