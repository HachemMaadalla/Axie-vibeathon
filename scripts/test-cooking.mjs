import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e;}}});
const {freshFarm,hydrateFarm,cook,beginExpedition,tend}=await import('../lib/game/state.ts');
const {foodBuffs,foodLabels}=await import('../lib/game/food.ts');
const {freshBuild,modifiers,spellStats}=await import('../lib/game/build.ts');
const {WildseedGame}=await import('../lib/game/scene.ts');
const {qualityCounts}=await import('../lib/game/quality.ts');
const {BattlePickups,rollDrops}=await import('../lib/game/pickups.ts');
let n=0;const check=(s,fn)=>{fn();console.log('PASS '+s);n++;};
check('Cooking grades have exact resource costs and masterful batches give two meals',()=>{
 for(const hits of [0,1,2,3]){const f=freshFarm();f.crops.sunroot=2;cook(f,'sunroot',hits);assert.equal(f.crops.sunroot,0);assert.equal(f.meals.sunroot,hits===3?2:1);cook(f,'sunroot',3);assert.equal(f.meals.sunroot,hits===3?2:1);}
});
check('Four portions including duplicate meals are consumed once with the key',()=>{
 const f=freshFarm();f.keys.grove=1;f.meals.sunroot=3;f.meals.embercorn=2;const tray=['sunroot','sunroot','embercorn','embercorn'],stats=beginExpedition(f,1,tray);
 assert.equal(f.keys.grove,0);assert.equal(f.meals.sunroot,1);assert.equal(f.meals.embercorn,0);assert.equal(stats.hp,170);assert.equal(stats.damage,18*1.8);assert.deepEqual(stats.meals,tray);assert.equal(stats.buffs.regen,.4);
 const before=JSON.stringify(f);assert.throws(()=>beginExpedition(f,1,[]));assert.equal(JSON.stringify(f),before);
});
check('Invalid trays and unavailable food never spend a meal or key',()=>{
 const f=freshFarm();f.keys.grove=2;f.meals.sunroot=1;const before=JSON.stringify(f);
 for(const tray of [['sunroot','sunroot'],['bad'],Array(5).fill('sunroot')]){assert.throws(()=>beginExpedition(f,1,tray));assert.equal(JSON.stringify(f),before);}
 assert.throws(()=>beginExpedition(f,3,['sunroot']));assert.equal(JSON.stringify(f),before);
 const stats=beginExpedition(f,1,[]);assert.equal(stats.hp,100);assert.equal(f.meals.sunroot,1);assert.deepEqual(stats.meals,[]);
});
check('Buff caps, casting speed and spell size match the food tray preview',()=>{
 assert.equal(foodBuffs(Array(4).fill('moonberry')).speed,.6);assert.equal(foodBuffs(Array(4).fill('starpepper')).damage,1.2);
 const glow=foodBuffs(Array(4).fill('glowcap'));assert.equal(glow.haste,.4);assert.equal(glow.magnet,4);
 assert.equal(foodBuffs(Array(4).fill('crystalbean')).armor,.35);
 const b=freshBuild(),plain=spellStats(b,'thorn');b.food=foodBuffs(['glowcap','embercorn','dewleaf']);
 const boosted=spellStats(b,'thorn');assert.ok(boosted.cooldown<plain.cooldown);assert.ok(boosted.area>plain.area);assert.equal(modifiers(b).regen,.6);assert.ok(foodLabels(b.food).includes('15% shorter cooldown'));
});
check('Food armor reduces actual received damage; fresh runs have no leftover food',()=>{
 const b=freshBuild();b.food=foodBuffs(['crystalbean','cloudmelon']);
 const g=Object.assign(Object.create(WildseedGame.prototype),{build:b,invuln:0,mode:'dungeon',hp:100,player:new T.Group(),motor:{velocity:new T.Vector3()},fx:{hurt(){}},combatAudio:{play(){}},reducedMotion:true});
 g.damagePlayer(20,new T.Vector3(1,0,0));assert.equal(g.hp,85.6);assert.equal(freshBuild().food,undefined);
});
check('Pickup range bonus attracts distant XP without instant credit',()=>{
 const p=new BattlePickups(new T.Group(),()=>0,30);p.spawn('xp',1,new T.Vector3(7,0,0));let credits=0;
 p.update(.4,new T.Vector3(),()=>credits++);assert.equal(p.items[0].pulling,false);
 p.update(.01,new T.Vector3(),()=>credits++,4);assert.equal(p.items[0].pulling,true);assert.equal(credits,0);p.dispose();
});
check('Existing meal inventories and legacy selection survive save migration',()=>{
 const f=freshFarm();f.meals.sunroot=3;f.meal='sunroot';f.keys.grove=1;const loaded=hydrateFarm(JSON.parse(JSON.stringify(f)));
 assert.equal(loaded.meals.sunroot,3);assert.equal(beginExpedition(loaded,1).meal,'sunroot');assert.equal(loaded.meals.sunroot,2);
});

check('Meal pairs reward different crops once, with no duplicate stacking',()=>{
 const comfort=foodBuffs(['sunroot','dewleaf']);assert.equal(comfort.health,85);assert.ok(Math.abs(comfort.regen-1.2)<1e-9);
 assert.equal(foodBuffs(['embercorn','starpepper']).area,.4);
 assert.equal(foodBuffs(['moonberry','glowcap']).magnet,3);
 assert.ok(Math.abs(foodBuffs(['cloudmelon','crystalbean']).armor-.28)<1e-9);
 assert.equal(foodBuffs(['sunroot','sunroot','dewleaf','dewleaf']).health,145);
 assert.equal(foodBuffs(['sunroot','sunroot','sunroot','sunroot']).loot,0);
 assert.equal(foodBuffs(['sunroot','moonberry','glowcap']).loot,.15);
 assert.equal(foodBuffs(['sunroot','moonberry','glowcap','embercorn']).loot,.25);
});
check('Varied food improves physical supply drops without changing XP or boss guarantees',()=>{
 assert.deepEqual(rollDrops(1,false,()=>.05),[]);
 assert.equal(rollDrops(1,false,()=>.05,undefined,1,.25)[0].kind,'soil');
 assert.equal(rollDrops(1,false,()=>.035,'stalker',1,.25)[0].kind,'moonberry');
 assert.deepEqual(rollDrops(2,true,()=>.9,undefined,2,.25),rollDrops(2,true,()=>.9,undefined,2));
});
check('Rare harvests sustain planting and keep the seed rank, with an extra gardener seed',()=>{
 for(const hero of ['bing','pomodoro']){
  const f=freshFarm();f.hero=hero;f.seeds.moonberry=0;
  f.plots[0]={crop:'moonberry',growth:1,watered:true,rich:false,fertilized:false,stars:2};
  tend(f,0,'moonberry',()=>0);
  assert.equal(f.seeds.moonberry,hero==='pomodoro'?2:1);
  assert.equal(qualityCounts(f,'seed:moonberry')[1],f.seeds.moonberry);
  tend(f,0,'moonberry',()=>0);assert.equal(f.plots[0].stars,2);
 }
});

console.log(n+' cooking and food checks passed.');
