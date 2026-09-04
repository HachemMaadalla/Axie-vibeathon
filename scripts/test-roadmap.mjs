import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e;}}});
const {freshFarm,hydrateFarm,tend,grow,beginExpedition}=await import('../lib/game/state.ts');
const {buyUpgrade,craftCompost,progress,discover,hydrateProgress,CHALLENGES}=await import('../lib/game/progression.ts');
const {freshBuild,spellStats,STARTER_SPELL,EVOLUTIONS}=await import('../lib/game/build.ts');
const {battleSpawn}=await import('../lib/game/arena-spawn.ts');
const {CollisionWorld}=await import('../lib/game/collisions.ts');
const {WildseedGame}=await import('../lib/game/scene.ts');
const {IslandAtmosphere}=await import('../lib/game/atmosphere.ts');
const {makeEnemy,disposeEnemy}=await import('../lib/game/enemies.ts');
const {rollDrops}=await import('../lib/game/pickups.ts');
const {terrainHeight,WORLD_RADIUS}=await import('../lib/game/terrain.ts');
let passed=0;const check=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
check('Permanent upgrades charge crops once, cap at three, survive saves and affect entry stats',()=>{
 const f=freshFarm();assert.equal(buyUpgrade(f,'vigor'),false);f.crops.sunroot=1000;
 for(let i=0;i<3;i++)assert.equal(buyUpgrade(f,'vigor'),true);
 assert.equal(f.crops.sunroot,904);assert.equal(buyUpgrade(f,'vigor'),false);
 f.keys.grove=1;const loaded=hydrateFarm(JSON.parse(JSON.stringify(f)));assert.equal(beginExpedition(loaded,1).hp,130);
 assert.equal(hydrateProgress({upgrades:{vigor:Infinity},wins:{pomodoro:NaN}}).upgrades.vigor,0);
 const old={...f};delete old.progress;assert.equal(hydrateFarm(old).progress.upgrades.vigor,0);
});
check('Compost preserves the free crop loop and grants exactly four bonus harvests',()=>{
 const f=freshFarm();f.crops.cloudmelon=2;f.fertilizer=2;assert.equal(craftCompost(f,'yield'),true);assert.equal(f.fertilizer,1);
 for(let i=0;i<5;i++){f.plots[6]={crop:'sunroot',growth:1,watered:true,rich:false,fertilized:false};const before=f.crops.sunroot;tend(f,6,'sunroot',()=>1);assert.equal(f.crops.sunroot-before,i<4?3:2);}
 f.crops.moonberry=2;assert.equal(craftCompost(f,'growth'),false);assert.equal(f.crops.moonberry,2);
 tend(f,6,'sunroot');tend(f,6,'sunroot');assert.equal(craftCompost(f,'growth'),true);assert.equal(f.plots[6].growth,.35);
 const seeds=f.seeds.sunroot;grow(f,30);tend(f,6,'sunroot');assert.equal(f.seeds.sunroot,seeds);
});
check('Every Axie mastery strengthens only its own evolved weapon',()=>{
 for(const [hero,id] of Object.entries(STARTER_SPELL)){
  const b=freshBuild(hero);b.items[id]=3;b.items[EVOLUTIONS[id].passive]=1;b.evolved=[id];
  const before=spellStats(b,id);b.heroMastery=hero;if(hero==='pomodoro')b.mastery='thorn';const after=spellStats(b,id);
  if(hero==='bing')assert.equal(after.count,before.count+1);
  if(['kotaro','kibo','xia'].includes(hero))assert.ok(after.area>before.area);
  if(['tripp','xia'].includes(hero))assert.ok(after.cooldown<before.cooldown);
  if(hero==='paladill')assert.ok(after.damage>before.damage);
  if(hero==='pomodoro')assert.equal(b.mastery,'thorn');
 }
});
const worldFixture=()=>{const farmWorld=new T.Group(),arena=new T.Group(),g=Object.assign(Object.create(WildseedGame.prototype),{farmWorld,arena,plots:[],plants:[],materialCache:new Map(),toonCache:new Map(),sharedSphere:new T.SphereGeometry(1,16,10)});g.makeArena();g.expandWorld(arena,'dungeon');const w=new CollisionWorld();w.capture(arena,(x,z)=>terrainHeight('dungeon',x,z));return {g,w,arena,farmWorld};};
check('Spawns stay on the compact island, outside cover, and away from the player at every edge',()=>{
 const {w}=worldFixture();
 for(let i=0;i<40;i++){const a=i*Math.PI/20,p=new T.Vector3(Math.cos(a)*27,0,Math.sin(a)*27);
 for(const radius of [.7,2]){const spawn=battleSpawn(p,a,19,radius,w);assert.ok(Math.hypot(spawn.x,spawn.z)<=WORLD_RADIUS.dungeon-3+.001);assert.ok(Math.hypot(spawn.x-p.x,spawn.z-p.z)>10);assert.equal(w.blocked(spawn,radius,5),false);}}
});
check('Enemy-specific seed drops retain the 8% rate and tier restrictions',()=>{
 for(const kind of ['beetle','stalker','shaman','moth']){let seeds=0;for(let i=0;i<10000;i++)seeds+=rollDrops(1,false,()=>i/10000,kind).filter(d=>['moonberry','cloudmelon','glowcap','dewleaf'].includes(d.kind)).length;assert.equal(seeds,800);}
 assert.equal(rollDrops(2,false,()=>.01,'beetle')[0].kind,'starpepper');
});
check('Challenge spawns apply speed, armor and elite rewards without changing normal runs',()=>{
 const {g,w,arena}=worldFixture();Object.assign(g,{player:new T.Group(),tier:1,time:20,spawnIndex:3,enemies:[],collisions:{dungeon:w},fx:{ring(){}}});
 g.challenge='elite';g.spawn();assert.equal(g.enemies[0].mesh.userData.elite,true);assert.ok(g.enemies[0].xpValue>=2);
 g.challenge='rush';g.spawn();const rush=g.enemies[1],normal=makeEnemy(rush.kind);assert.equal(rush.speed,normal.speed*1.25);disposeEnemy(normal);
 g.challenge='bounty';g.spawn();assert.ok(g.enemies[2].max>makeEnemy(g.enemies[2].kind).max*1.2);g.enemies.forEach(disposeEnemy);
});
check('Drought clear returns one key, records mastery and does not duplicate on a second finish',()=>{
 const g=Object.assign(Object.create(WildseedGame.prototype),{mode:'dungeon',farm:freshFarm(),loot:{},tier:1,challenge:'drought',kills:2,pickups:{clear(){}},clearReturnPortal(){},clearDefeated(){},playerFeel:{reset(){}},actors:new Map(),syncFarmEquipment(){},maxHp:100,farmWorld:new T.Group(),arena:new T.Group(),player:new T.Group(),followCamera:{snap(){}},motor:{reset(){}},keys:new Set(),enemies:[],spells:{clear(){}},fx:{clear(){}},clearHostiles(){},scene:new T.Scene(),refreshPlants(){},save(){},emit(){}});
 g.finish('won');assert.equal(g.farm.keys.grove,1);assert.equal(g.farm.progress.wins.pomodoro,1);assert.ok(g.farm.progress.challenges.includes('drought'));g.finish('won');assert.equal(g.farm.keys.grove,1);
});
check('Atmosphere animates bounded wildlife pools and changes tier lighting without farm props in combat',()=>{
 const farm=new T.Group(),arena=new T.Group(),scene=new T.Scene(),sun=new T.DirectionalLight();scene.background=new T.Color('#8fd9f5');
 const art=new IslandAtmosphere(farm,arena);art.update(20,1,'farm',1,false,scene,sun);const mill=farm.getObjectByName('farm-windmill');assert.ok(mill);assert.equal(arena.getObjectByName('farm-windmill'),undefined);
 let chickens=0;farm.traverse(o=>{if(o.name==='farm-chicken')chickens++;});assert.equal(chickens,3);
 const count=farm.getObjectByName('farm-fireflies').count;for(let i=0;i<120;i++)art.update(i,9,'dungeon',2,false,scene,sun);assert.equal(farm.getObjectByName('farm-fireflies').count,count);assert.ok(sun.intensity<1.8);
 art.update(40,9,'farm',1,true,scene,sun);assert.equal(art.rotor.rotation.z,0);
});
console.log(passed+' roadmap integration checks passed.');
