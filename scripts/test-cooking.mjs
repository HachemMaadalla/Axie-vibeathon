import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e;}}});
const {freshFarm,hydrateFarm,cook,beginExpedition}=await import('../lib/game/state.ts');
const {foodBuffs,foodLabels,cookingHit,cookingPosition,COOK_TARGETS}=await import('../lib/game/food.ts');
const {freshBuild,modifiers,spellStats}=await import('../lib/game/build.ts');
const {WildseedGame}=await import('../lib/game/scene.ts');
const {BattlePickups}=await import('../lib/game/pickups.ts');
let n=0;const check=(s,fn)=>{fn();console.log('PASS '+s);n++;};
check('Three timing targets are reachable; misses and perfect cooks have exact costs',()=>{
 for(let round=0;round<3;round++){assert.ok(cookingHit(COOK_TARGETS[round]*900,round));assert.equal(cookingHit(0,round),false);assert.equal(cookingHit(2800,round),false);}
 for(let ms=0;ms<2800;ms+=15)assert.ok(cookingPosition(ms)>=0&&cookingPosition(ms)<=1);
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
 g.damagePlayer(20,new T.Vector3(1,0,0));assert.equal(g.hp,84);assert.equal(freshBuild().food,undefined);
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
console.log(n+' cooking and food checks passed.');
