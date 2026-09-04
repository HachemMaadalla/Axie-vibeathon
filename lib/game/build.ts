import type {HeroId} from './state';
export type WeaponId='thorn'|'petal'|'spore'|'storm'|'ember'|'cannon'|'sword'|'hammer'|'axe';
export type PassiveId='sun'|'wind'|'dew'|'echo'|'heart';
export type ItemId=WeaponId|PassiveId;
export type Build={items:Partial<Record<ItemId,number>>;evolved:WeaponId[]};
export const WEAPONS:WeaponId[]=['thorn','petal','spore','storm','ember','cannon','sword','hammer','axe'];
export const PASSIVES:PassiveId[]=['sun','wind','dew','echo','heart'];
export const SLOT_LIMIT=4;
export const ITEMS:Record<ItemId,{name:string;kind:'spell'|'passive';color:string;levels:string[]}>={
 cannon:{name:'Cannon Shot',kind:'spell',color:'#65d6f0',levels:['Fire an explosive cannonball.','Fire two cannonballs with wider blasts.','Fire three cannonballs with stronger blasts.']},
 sword:{name:'Sword Slash',kind:'spell',color:'#b9eaff',levels:['Slash through enemies in front of you.','A wider, stronger slash.','A powerful slash with greater reach.']},
 hammer:{name:'Hammer Slam',kind:'spell',color:'#ffc675',levels:['Slam nearby enemies with a shockwave.','A wider, stronger shockwave.','A heavy slam with greater reach.']},
 axe:{name:'Axe Cleave',kind:'spell',color:'#f5ae83',levels:['Sweep your axe through nearby enemies.','A wider cleave with more damage.','A powerful cleave with greater reach.']},
 thorn:{name:'Thorn Bolt',kind:'spell',color:'#d8e986',levels:['Fire a thorn at the nearest enemy.','Fire two thorns; each pierces one enemy.','Fire three thorns; each pierces two enemies.']},
 petal:{name:'Petal Orbit',kind:'spell',color:'#f5b5d5',levels:['Two petals orbit you and cut nearby enemies.','Three petals, a wider orbit, and more damage.','Four petals with faster rotation and more damage.']},
 spore:{name:'Spore Cloud',kind:'spell',color:'#a8dbaf',levels:['Leave damaging spore patches beneath nearby enemies.','Larger patches last longer and deal more damage.','Patches slow enemies by 35% and last 4 seconds.']},
 storm:{name:'Storm Seed',kind:'spell',color:'#a5d8ff',levels:['Lightning strikes an enemy and chains to a second.','Lightning chains through three enemies.','Lightning chains through four enemies and fires faster.']},
 ember:{name:'Ember Rain',kind:'spell',color:'#ffb277',levels:['A falling ember explodes on a marked enemy.','Two falling embers with larger explosions.','Three falling embers with stronger explosions.']},
 sun:{name:'Sun Charm',kind:'passive',color:'#ffe18a',levels:['All spells deal 12% more damage.','All spells deal 24% more damage.','All spells deal 36% more damage.']},
 wind:{name:'Wind Bell',kind:'passive',color:'#b5eddd',levels:['Spell cooldowns are 10% shorter.','Spell cooldowns are 20% shorter.','Spell cooldowns are 30% shorter.']},
 dew:{name:'Dew Vial',kind:'passive',color:'#88d7e5',levels:['+12 max health; regenerate 0.5 health per second.','+24 max health; regenerate 1 health per second.','+36 max health; regenerate 1.5 health per second.']},
 echo:{name:'Echo Seed',kind:'passive',color:'#c9b9ff',levels:['+1 projectile, petal, or lightning target.','+2 projectiles, petals, or lightning targets.','+3 projectiles, petals, or lightning targets.']},
 heart:{name:'Ember Heart',kind:'passive',color:'#ffa694',levels:['Spell areas and petal reach grow by 15%.','Spell areas and petal reach grow by 30%.','Spell areas and petal reach grow by 45%.']}
};
export const EVOLUTIONS:Record<WeaponId,{passive:PassiveId;name:string;text:string}>={
 cannon:{passive:'echo',name:'Broadside',text:'A rapid barrage of larger explosive cannonballs.'},
 sword:{passive:'wind',name:'Blade Cyclone',text:'Fast slashes strike all around you.'},
 hammer:{passive:'heart',name:'Earthshaker',text:'Huge shockwaves crush surrounding enemies.'},
 axe:{passive:'sun',name:'Crescent Reaper',text:'A powerful circular cleave with extended reach.'},
 thorn:{passive:'sun',name:'Sunlance',text:'Golden lances pierce entire lines of enemies and burst on impact.'},
 petal:{passive:'wind',name:'Bloom Cyclone',text:'Eight swift petals carve a wide circle around your Axie.'},
 spore:{passive:'dew',name:'Dream Garden',text:'Long-lived spores slow enemies and heal you while you stand inside.'},
 storm:{passive:'echo',name:'Thunder Grove',text:'Lightning jumps through eight enemies and strikes each one twice.'},
 ember:{passive:'heart',name:'Solar Harvest',text:'A shower of huge meteors leaves burning ground behind.'}
};
export type Choice={id:ItemId|'heal';kind:'spell'|'passive'|'evolution'|'heal';name:string;text:string;level:number;color:string};
export const STARTER_SPELL:Record<HeroId,WeaponId>={pomodoro:'thorn',bing:'cannon',kotaro:'sword',kibo:'hammer',paladill:'axe',tripp:'sword',xia:'axe'};
export const freshBuild=(hero:HeroId='pomodoro'):Build=>({items:{[STARTER_SPELL[hero]]:1},evolved:[]});
export const itemLevel=(b:Build,id:ItemId)=>b.items[id]??0;
export const isWeapon=(id:ItemId):id is WeaponId=>WEAPONS.includes(id as WeaponId);
export function canEvolve(b:Build,id:WeaponId){return itemLevel(b,id)===3&&itemLevel(b,EVOLUTIONS[id].passive)>0&&!b.evolved.includes(id);}
export function eligibleChoices(b:Build):Choice[]{
 const result:Choice[]=[];
 for(const id of WEAPONS)if(canEvolve(b,id))result.push({id,kind:'evolution',name:EVOLUTIONS[id].name,text:EVOLUTIONS[id].text,level:4,color:ITEMS[id].color});
 for(const id of [...WEAPONS,...PASSIVES]){
  const n=itemLevel(b,id),def=ITEMS[id],slots=(isWeapon(id)?WEAPONS:PASSIVES).filter(key=>itemLevel(b,key)>0).length;
  if(n>=3||n===0&&slots>=SLOT_LIMIT)continue;
  result.push({id,kind:def.kind,name:def.name,text:def.levels[n],level:n+1,color:def.color});
 }
 if(!result.length)result.push({id:'heal',kind:'heal',name:'Garden Remedy',text:'Restore 35 health.',level:1,color:'#a8dbaf'});
 return result;
}
// Offer at least one owned upgrade and one new tool when both are available.
// Ready evolutions are always offered; drafts remain unchanged until a selection.
export function draftChoices(b:Build,rng:()=>number=Math.random):Choice[]{
 const pool=eligibleChoices(b),picked:Choice[]=[];
 const take=(c:Choice|undefined)=>{if(c&&!picked.some(x=>x.id===c.id)){picked.push(c);pool.splice(pool.indexOf(c),1);}};
 const random=(list:Choice[])=>list[Math.floor(Math.min(.999999,Math.max(0,rng()))*list.length)];
 take(pool.find(c=>c.kind==='evolution'));
 const owned=pool.filter(c=>c.kind!=='evolution'&&c.id!=='heal'&&itemLevel(b,c.id)>0);
 const ownedSpells=owned.filter(c=>c.kind==='spell');
 const pairedSpells=ownedSpells.filter(c=>c.id!=='heal'&&isWeapon(c.id)&&itemLevel(b,EVOLUTIONS[c.id].passive)>0);
 take(random(pairedSpells.length?pairedSpells:ownedSpells.length?ownedSpells:owned));
 const partners=pool.filter(c=>c.id!=='heal'&&itemLevel(b,c.id)===0&&WEAPONS.some(w=>itemLevel(b,w)>0&&EVOLUTIONS[w].passive===c.id));
 take(random(partners.length?partners:pool.filter(c=>c.id!=='heal'&&itemLevel(b,c.id)===0)));
 while(picked.length<3&&pool.length)take(random(pool));
 return picked;
}
export function applyChoice(b:Build,c:Choice){
 if(!eligibleChoices(b).some(x=>x.id===c.id&&x.kind===c.kind&&x.level===c.level))return false;
 if(c.id==='heal')return true;
 if(c.kind==='evolution')b.evolved.push(c.id as WeaponId);else b.items[c.id]=c.level;
 return true;
}
export function modifiers(b:Build){return{damage:1+itemLevel(b,'sun')*.12,cooldown:1-itemLevel(b,'wind')*.1,area:1+itemLevel(b,'heart')*.15,extra:itemLevel(b,'echo'),health:itemLevel(b,'dew')*12,regen:itemLevel(b,'dew')*.5};}
// Growing costs give each upgrade time in combat.
export const xpNeeded=(level:number)=>{
 const progress=Math.max(0,Math.floor(level)-1);
 return 6+progress*2+Math.floor(progress*progress/5);
};
export function spellStats(b:Build,id:WeaponId){
 const level=itemLevel(b,id),evolved=b.evolved.includes(id),m=modifiers(b);
 const base={
  cannon:{damage:1+level*.2,cooldown:1.25,count:level,area:1.25+level*.2,pierce:0,duration:0},
  sword:{damage:.95+level*.2,cooldown:.85,count:1,area:3.2+level*.35,pierce:0,duration:0},
  hammer:{damage:1.2+level*.3,cooldown:1.3,count:1,area:2.8+level*.35,pierce:0,duration:0},
  axe:{damage:1.1+level*.25,cooldown:1.1,count:1,area:3.1+level*.35,pierce:0,duration:0},
  thorn:{damage:.95+level*.15,cooldown:.85,count:level,area:.2,pierce:level-1,duration:0},
  petal:{damage:.28+level*.09,cooldown:.42,count:level+1,area:2.2+level*.25,pierce:0,duration:0},
  spore:{damage:.19+level*.065,cooldown:3,count:1,area:1.5+level*.3,pierce:0,duration:2.5+level*.5},
  storm:{damage:.8+level*.2,cooldown:2.6-level*.25,count:level+1,area:5,pierce:0,duration:0},
  ember:{damage:1+level*.3,cooldown:3.5,count:level,area:1.1+level*.25,pierce:0,duration:0}
 }[id];
 if(evolved){
  if(id==='cannon'){base.count=4;base.area=2.3;base.damage*=1.25;base.cooldown=.85;}
  if(id==='sword'){base.area=4.5;base.damage*=1.35;base.cooldown=.6;}
  if(id==='hammer'){base.area=5;base.damage*=1.5;base.cooldown=1.05;}
  if(id==='axe'){base.area=4.8;base.damage*=1.5;base.cooldown=.85;}
  if(id==='thorn'){base.pierce=99;base.damage*=1.4;base.cooldown=.55;}
  if(id==='petal'){base.count=8;base.area=3.8;base.damage*=1.45;}
  if(id==='spore'){base.area=3;base.duration=7;base.cooldown=2.6;base.damage*=1.4;}
  if(id==='storm'){base.count=8;base.damage*=2;base.cooldown=1.4;}
  if(id==='ember'){base.count=5;base.area=2.6;base.damage*=1.4;base.duration=4;}
 }
 return {...base,count:base.count+(['spore','sword','hammer','axe'].includes(id)?0:m.extra),area:base.area*m.area,damage:base.damage*m.damage,cooldown:base.cooldown*m.cooldown,level,evolved};
}

