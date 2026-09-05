import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e;}}});
const {freshFarm,hydrateFarm,tend,grow,cook,craftKey,beginExpedition,settleExpedition,emptyLoot,improve}=await import('../lib/game/state.ts');
const {grantQuality,takeQuality,qualityCounts,nextStars,qualityOdds,rollQuality,mealStars,ingredientStars}=await import('../lib/game/quality.ts');
const {foodBuffs}=await import('../lib/game/food.ts');
const {rollDrops,BattlePickups}=await import('../lib/game/pickups.ts');
let n=0;const check=(s,fn)=>{fn();console.log('PASS '+s);n++;};
check('Old supplies become one star and mixed quality survives save reload',()=>{
 const f=freshFarm();f.crops.sunroot=10;assert.deepEqual(qualityCounts(f,'crop:sunroot'),[10,0,0]);
 grantQuality(f,'crop:sunroot',4,3);grantQuality(f,'crop:sunroot',2,2);
 const loaded=hydrateFarm(JSON.parse(JSON.stringify(f)));assert.deepEqual(qualityCounts(loaded,'crop:sunroot'),[10,2,4]);
 assert.deepEqual(takeQuality(loaded,'crop:sunroot',5),[3,3,3,3,2]);assert.deepEqual(qualityCounts(loaded,'crop:sunroot'),[10,1,0]);
 const dirty={...loaded,quality:{'crop:sunroot':[Infinity,-2],'key:hollow':[99,99]}};const safe=hydrateFarm(dirty);assert.deepEqual(qualityCounts(safe,'crop:sunroot'),[11,0,0]);assert.deepEqual(qualityCounts(safe,'key:hollow'),[0,0,0]);
});
check('Score, ingredient quality and luck raise explicit normalized odds',()=>{
 for(let score=0;score<=3;score++){const odds=qualityOdds(score,.1,2);assert.ok(Math.abs(odds.reduce((a,b)=>a+b)-1)<1e-10);assert.ok(odds.every(p=>p>=0));}
 assert.ok(qualityOdds(3)[2]>qualityOdds(0)[2]);assert.ok(qualityOdds(2,.1,3)[2]>qualityOdds(2,0,1)[2]);
 assert.equal(rollQuality(0,0,1,()=>.4),1);assert.equal(rollQuality(3,0,1,()=>.4),2);assert.equal(rollQuality(3,0,1,()=>.01),3);
 const tally=[0,0,0];for(let i=0;i<10000;i++)tally[rollQuality(3,0,1,()=>i/10000)-1]++;assert.deepEqual(tally,[3200,4800,2000]);
});
check('Forging consumes exact best-quality ingredients once and preserves key stars',()=>{
 const f=freshFarm();grantQuality(f,'crop:sunroot',24,3);assert.equal(ingredientStars(f,{sunroot:24}),3);
 craftKey(f,1,3,()=>0);assert.equal(f.crops.sunroot,0);assert.deepEqual(qualityCounts(f,'key:grove'),[0,0,1]);assert.equal(f.lastCraft.stars,3);
 const before=JSON.stringify(f);craftKey(f,1,3,()=>0);assert.equal(JSON.stringify(f),before);
 grantQuality(f,'key:grove',1,1);const stats=beginExpedition(f,1,[],1);assert.equal(stats.keyStars,1);assert.deepEqual(qualityCounts(f,'key:grove'),[0,0,1]);
 assert.throws(()=>beginExpedition(f,1,[],2));assert.equal(f.keys.grove,1);
});
check('Cooking gives tiered portions and tray buffs match the consumed ranks',()=>{
 const f=freshFarm();grantQuality(f,'crop:cloudmelon',2,3);cook(f,'cloudmelon',3,()=>0);assert.deepEqual(qualityCounts(f,'meal:cloudmelon'),[0,0,2]);
 grantQuality(f,'meal:cloudmelon',1,1);f.keys.grove=1;const tray=['cloudmelon','cloudmelon','cloudmelon'],preview=foodBuffs(tray,mealStars(f,tray)),stats=beginExpedition(f,1,tray);
 assert.deepEqual(stats.mealStars,[3,3,1]);assert.deepEqual(stats.buffs,preview);assert.equal(f.meals.cloudmelon,0);
});
check('Free seeds remain free while seed, soil and fertilizer quality affects farming',()=>{
 const f=freshFarm();f.plots[4]={crop:null,growth:0,watered:false,rich:false,fertilized:false};grantQuality(f,'seed:moonberry',1,3);
 tend(f,4,'moonberry');assert.equal(f.plots[4].stars,3);tend(f,4,'moonberry');grow(f,60);tend(f,4,'moonberry',()=>0);assert.ok(qualityCounts(f,'crop:moonberry')[2]>=2);
 tend(f,4,'sunroot');assert.equal(f.plots[4].stars,1);tend(f,4,'sunroot');grantQuality(f,'soil',1,3);grantQuality(f,'fertilizer',1,3);improve(f,4,'soil');improve(f,4,'fertilizer');grow(f,5);assert.ok(f.plots[4].growth>5/30*1.4*1.8);
});
check('Higher-star keys improve supply drop rates without affecting XP',()=>{
 for(const s of [1,2,3]){let seeds=0;for(let i=0;i<10000;i++)seeds+=rollDrops(1,false,()=>i/10000,'stalker',s).filter(d=>d.kind==='moonberry').length;assert.equal(seeds,800*(1+(s-1)*.5));assert.equal(rollDrops(1,true,()=>.5,'guardian',s)[0].amount,s);}
});
check('Physical pickups keep quality and partial returns never duplicate loot',()=>{
 const p=new BattlePickups(new T.Group(),()=>0,30);p.spawn('moonberry',2,new T.Vector3(),3);let rank=0;p.update(1,new T.Vector3(),(_,__,___,s)=>rank=s);assert.equal(rank,3);p.dispose();
 const f=freshFarm(),loot=emptyLoot();loot.moonberry=4;loot.soil=2;const result=settleExpedition(f,loot,'lost',1,{moonberry:[1,2],soil:[0,1]});
 assert.equal(result.moonberry,2);assert.equal(f.seeds.moonberry,5);assert.deepEqual(qualityCounts(f,'seed:moonberry'),[3,0,2]);assert.equal(f.soil,2);assert.deepEqual(qualityCounts(f,'soil'),[1,0,1]);
});
console.log(n+' star-tier checks passed.');
