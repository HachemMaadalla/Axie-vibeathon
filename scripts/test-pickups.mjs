import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e}}});
const {BattlePickups,rollDrops}=await import('../lib/game/pickups.ts');
const {freshFarm,hydrateFarm,PLOT_COUNT,CROP_IDS,emptyLoot,tend,settleExpedition}=await import('../lib/game/state.ts');
const {plotPosition,nearestPlot}=await import('../lib/game/farming.ts');
const {WildseedGame}=await import('../lib/game/scene.ts');
const {makeEnemy}=await import('../lib/game/enemies.ts');
const {freshBuild}=await import('../lib/game/build.ts');
const {ISLAND_SERVICES}=await import('../lib/game/island.ts');
let checks=0;const check=(name,f)=>{f();checks++;console.log('PASS '+name);};
check('Every legacy bed and resource survives expansion; all new beds work with E',()=>{
 const old=freshFarm();old.plots=old.plots.slice(0,12);old.plots[9]={crop:'embercorn',growth:.43,rich:true,fertilized:true,watered:true};
 old.day=12;old.unlocked=true;old.hero='xia';old.seeds.sunroot=77;old.crops.moonberry=23;old.coins=64;
 const f=hydrateFarm(old);assert.equal(f.plots.length,PLOT_COUNT);assert.equal(PLOT_COUNT,24);assert.deepEqual(f.plots.slice(0,12),old.plots);
 assert.equal(f.day,12);assert.equal(f.seeds.sunroot,77);assert.equal(f.crops.moonberry,23);assert.equal(f.hero,'xia');assert.ok(f.unlocked);assert.equal('coins' in f,false);
 for(let i=12;i<PLOT_COUNT;i++){assert.equal(f.plots[i].crop,null);assert.equal(nearestPlot(plotPosition(i)).index,i);tend(f,i,'sunroot');assert.equal(f.plots[i].crop,'sunroot');tend(f,i,'sunroot');assert.ok(f.plots[i].watered);}
 assert.deepEqual(hydrateFarm(f),f);assert.equal(ISLAND_SERVICES.some(s=>s.kind==='shop'),false);assert.equal(WildseedGame.prototype.tradeItem,undefined);
});
check('Seed rarity is 8%, deeper seeds stay gated, and boss supplies also become drops',()=>{
 for(const tier of [1,2]){
  const counts=emptyLoot();for(let i=0;i<10000;i++)for(const drop of rollDrops(tier,false,()=> (i+.5)/10000))counts[drop.kind]+=drop.amount;
  assert.equal(CROP_IDS.reduce((n,id)=>n+counts[id],0),800);assert.equal(counts.fertilizer,400);assert.equal(counts.soil,200);
  assert.equal(counts.sunroot,0);assert.equal(counts.embercorn,tier===1?0:200);
  assert.deepEqual(rollDrops(tier,true),[{kind:tier===1?'glowcap':'crystalbean',amount:1},{kind:'soil',amount:1}]);
 }
});
check('Killing an actual guardian gives no remote XP or seeds; nearby pickups award exactly once',()=>{
 const arena=new T.Group(),pickups=new BattlePickups(arena,()=>0,170),enemy=makeEnemy('guardian');enemy.mesh.position.set(12,0,0);enemy.hp=1;
 const xp=enemy.xpValue;
 const g=Object.assign(Object.create(WildseedGame.prototype),{farm:freshFarm(),player:new T.Group(),xp:0,kills:0,level:1,tier:1,mode:'dungeon',loot:emptyLoot(),enemies:[enemy],pickups,build:freshBuild(),upgrade:false,keys:new Set(),elapsed:1,pickupSoundAt:0,fx:{impact(){},burst(){},ring(){}},combatAudio:{play(){}},sound(){},emit(){}});
 g.hurtEnemy(enemy,2);assert.equal(g.kills,1);assert.equal(g.xp,0);assert.deepEqual(g.loot,emptyLoot());assert.equal(g.enemies.length,0);assert.equal(pickups.items.length,3);
 const collect=(...args)=>g.collectDrop(...args);
 for(let i=0;i<120;i++)pickups.update(1/60,g.player.position,collect);
 g.queueUpgrade();assert.equal(g.xp,0);assert.equal(g.level,1);assert.equal(g.loot.glowcap,0);
 g.player.position.set(12,0,0);
 for(let i=0;i<60;i++)pickups.update(1/60,g.player.position,collect);
 assert.equal(g.xp,xp);assert.equal(g.loot.glowcap,1);assert.equal(g.loot.soil,1);assert.equal(pickups.items.length,0);
 pickups.update(1,g.player.position,collect);assert.equal(g.xp,xp);assert.equal(g.loot.glowcap,1);
 g.xp=6;g.queueUpgrade();assert.equal(g.level,2);assert.ok(g.upgrade);pickups.dispose();
});
check('Drops rest above terrain, freeze with combat, attract during jumps and clear between runs',()=>{
 const parent=new T.Group(),drops=new BattlePickups(parent,()=>8,170),p=new T.Vector3(0,8,0);let amount=0;
 drops.spawn('xp',3,p);assert.ok(drops.items[0].position.y>8);
 drops.update(0,p,(_,n)=>amount+=n);assert.equal(drops.items[0].age,0);assert.equal(amount,0);
 drops.update(.1,p,(_,n)=>amount+=n);assert.equal(amount,0,'No immediate credit on spawning');
 p.y=11;
 for(let i=0;i<120;i++)drops.update(1/60,p,(_,n)=>amount+=n);
 assert.equal(amount,3);
 drops.spawn('moonberry',1,new T.Vector3(10,8,0));drops.clear();assert.equal(drops.items.length,0);assert.equal(drops.root.children.length,1);
 drops.dispose();assert.equal(parent.children.length,0);
});
check('A full pickup pool preserves all XP without crediting or discarding remote rewards',()=>{
 const drops=new BattlePickups(new T.Group(),()=>0,170);for(let i=0;i<800;i++)drops.spawn('xp',1,new T.Vector3(20,0,0));
 assert.equal(drops.items.reduce((sum,p)=>sum+p.amount,0),800);assert.equal(drops.items.length,768);
 let xp=0;for(let i=0;i<120;i++)drops.update(1/60,new T.Vector3(20,0,0),(_,n)=>xp+=n);
 assert.equal(xp,800);assert.equal(drops.items.length,0);drops.dispose();
});
check('Returning requires E nearby, and only collected loot enters the farm',()=>{
 let exits=0;const portal=new T.Group();portal.position.set(10,0,0);
 const g=Object.assign(Object.create(WildseedGame.prototype),{started:true,result:null,mode:'dungeon',returnPortal:portal,player:new T.Group(),paused:false,upgrade:false,finish:outcome=>{assert.equal(outcome,'escaped');exits++;}});
 g.interact();assert.equal(exits,0);g.player.position.set(10,0,0);g.paused=true;g.interact();assert.equal(exits,0);
 g.paused=false;g.upgrade=true;g.interact();assert.equal(exits,0);g.upgrade=false;g.interact();assert.equal(exits,1);
 const f=freshFarm(),before=structuredClone(f.seeds);settleExpedition(f,emptyLoot(),'won',1);assert.deepEqual(f.seeds,before);
});
console.log(checks+' pickup and farm expansion checks passed.');

