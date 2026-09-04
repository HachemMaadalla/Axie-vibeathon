import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from 'three';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(e){if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return next(specifier+'.ts',context);throw e;}}});
const {makeEnemy,updateEnemy,disposeEnemy,ENEMY_INFO,enemyKindFor}=await import('../lib/game/enemies.ts');
const {EnemyBatch}=await import('../lib/game/enemy-batch.ts');
const {CombatFX}=await import('../lib/game/combat-fx.ts');
const {SpellEngine}=await import('../lib/game/spell-engine.ts');
const {WORLD_RADIUS,terrainHeight,terrainBiome,BRIDGES,riverX,isWater}=await import('../lib/game/terrain.ts');
const {freshBuild,eligibleChoices,applyChoice,xpNeeded}=await import('../lib/game/build.ts');
let passed=0;const check=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const noop=()=>{};const events={telegraph:noop,projectile:noop,slam:noop,damage:noop};
check('Creature rigs have different silhouettes and animated limbs',()=>{
 const creatures=Object.keys(ENEMY_INFO).map(k=>makeEnemy(k));
 assert.equal(creatures[0].rig.legs.length,6);assert.equal(creatures[1].rig.legs.length,2);
 assert.equal(creatures[3].rig.wings.length,2);assert.ok(creatures[2].rig.arms.length>=1);
 const sizes=creatures.map(e=>new T.Box3().setFromObject(e.visual).getSize(new T.Vector3()));
 assert.ok(sizes[3].x>sizes[1].x);assert.ok(sizes[4].y>sizes[1].y*2);
 for(const e of creatures){updateEnemy(e,.1,new T.Vector3(0,0,15),.2,()=>0,1,events);assert.ok(Number.isFinite(e.mesh.position.y));disposeEnemy(e);}
 assert.equal(new Set(Array.from({length:7},(_,i)=>enemyKindFor(20,i))).size,4);
});
check('Scarab wind-up is harmless, charge locks direction, and caster fires three bolts',()=>{
 let damage=0,telegraphs=0,shots=0;const ev={...events,damage:()=>damage++,telegraph:()=>telegraphs++,projectile:()=>shots++};
 const e=makeEnemy('beetle');e.cooldown=0;const player=new T.Vector3(0,0,3);
 updateEnemy(e,.01,player,0,()=>0,1,ev);assert.equal(e.state,'windup');assert.equal(telegraphs,1);
 for(let i=0;i<30;i++)updateEnemy(e,.01,player,i*.01,()=>0,1,ev);
 assert.equal(damage,0);const heading=e.heading.clone();
 player.set(8,0,3);for(let i=0;i<60;i++)updateEnemy(e,.01,player,i*.01,()=>0,1,ev);
 assert.ok(e.heading.equals(heading));assert.ok(e.mesh.position.z>2);assert.ok(Math.abs(e.mesh.position.x)<.1);
 const caster=makeEnemy('shaman');caster.cooldown=0;
 for(let i=0;i<100;i++)updateEnemy(caster,.01,new T.Vector3(0,0,10),i*.01,()=>0,1,ev);
 assert.equal(shots,3);disposeEnemy(e);disposeEnemy(caster);
});
check('Boss warns before the expanding ground slam',()=>{
 const e=makeEnemy('guardian');e.cooldown=0;let warnings=0,slams=0;
 const ev={...events,telegraph:()=>warnings++,slam:()=>slams++};
 for(let i=0;i<60;i++)updateEnemy(e,.01,new T.Vector3(0,0,5),i*.01,()=>0,1,ev);
 assert.equal(warnings,1);assert.equal(slams,0);
 for(let i=0;i<60;i++)updateEnemy(e,.01,new T.Vector3(0,0,5),i*.01,()=>0,1,ev);
 assert.equal(slams,1);disposeEnemy(e);
});
check('Projectile targeting hits flying and tall enemies at elevated terrain heights',()=>{
 for(const kind of Object.keys(ENEMY_INFO)){
  const e=makeEnemy(kind);e.mesh.position.set(0,6+(kind==='moth'?1.1:0),6);
  const engine=new SpellEngine(new T.Scene());let damage=0;
  for(let i=0;i<90;i++)engine.update(1/60,new T.Vector3(0,6,0),freshBuild(),18,[e],(_,n)=>damage+=n);
  assert.ok(damage>0,kind);engine.dispose();disposeEnemy(e);
 }
});
check('Enemy batches follow animated transforms and release killed creatures',()=>{
 const parent=new T.Group(),batch=new EnemyBatch(parent),enemies=Array.from({length:60},(_,i)=>makeEnemy(enemyKindFor(30,i)));
 enemies.forEach((e,i)=>{parent.add(e.mesh);e.mesh.position.set(i,2,0);updateEnemy(e,.1,new T.Vector3(),.5,()=>2,1,events);});
 batch.update(enemies);assert.ok(batch.mesh.count>1000&&batch.mesh.count<4000);
 const first=enemies[0];let part;first.visual.traverse(o=>{if(!part&&o instanceof T.Mesh&&o.geometry instanceof T.BoxGeometry)part=o;});
 const matrix=new T.Matrix4();batch.mesh.getMatrixAt(0,matrix);
 matrix.elements.forEach((n,i)=>assert.ok(Math.abs(n-part.matrixWorld.elements[i])<1e-5));
 batch.update([]);assert.equal(batch.mesh.count,0);batch.dispose();enemies.forEach(disposeEnemy);
});
check('Particle and warning pools remain bounded and reduced motion disables camera shake',()=>{
 const scene=new T.Scene(),fx=new CombatFX(scene,true),p=new T.Vector3();
 for(let i=0;i<1000;i++){fx.impact(p,20,'#ffcc88',true);fx.ring(p,2,'#ffffff');}
 const camera=new T.PerspectiveCamera();camera.position.set(1,2,3);fx.update(.016,camera);
 assert.ok(camera.position.equals(new T.Vector3(1,2,3)));assert.ok(fx.root.children.length<=41);
 assert.ok(fx.root.children[0].count<=600);
 fx.update(2);assert.equal(fx.root.children[0].count,0);assert.equal(fx.root.children.length,1);
 fx.dispose();assert.equal(scene.children.length,0);
});
check('Four biomes, river crossings, peaks, and the compact 120-unit arena',()=>{
 assert.equal(WORLD_RADIUS.dungeon,120);
 assert.equal(new Set([[0,0],[100,0],[-100,0],[0,100]].map(([x,z])=>terrainBiome(x,z))).size,4);
 for(const z of BRIDGES){assert.ok(terrainHeight('dungeon',riverX(z),z)>=1);assert.equal(isWater(riverX(z),z),false);}
 assert.ok(terrainHeight('dungeon',-104*120/170,-85*120/170)>12);assert.equal(terrainHeight('dungeon',0,0),0);
});
check('A full mixed-enemy run earns levels and an evolution while traversing the terrain',()=>{
 const engine=new SpellEngine(new T.Scene()),b=freshBuild();applyChoice(b,eligibleChoices(b).find(c=>c.id==='storm'));
 let enemies=[],spawn=0,index=0,kills=0,xp=0,level=1;const kinds=new Set();
 for(let frame=0;frame<5400;frame++){
  const time=frame/60,player=new T.Vector3(Math.cos(time*.35)*14,0,Math.sin(time*.35)*14);player.y=terrainHeight('dungeon',player.x,player.z);
  spawn-=1/60;
  if(spawn<=0&&enemies.length<60){const kind=enemyKindFor(time,index),e=makeEnemy(kind);const a=index++*2.4;e.mesh.position.copy(player).add(new T.Vector3(Math.cos(a)*19,0,Math.sin(a)*19));enemies.push(e);kinds.add(kind);spawn=Math.max(.28,.85-time*.006);}
  for(const e of enemies)updateEnemy(e,1/60,player,time,(x,z)=>terrainHeight('dungeon',x,z),engine.speedMultiplier(e),events);
  engine.update(1/60,player,b,18,enemies,(e,n)=>{e.hp-=n;if(e.hp<=0){kills++;xp+=e.xpValue;}});
  enemies=enemies.filter(e=>{if(e.hp>0)return true;disposeEnemy(e);return false;});
  while(xp>=xpNeeded(level)){xp-=xpNeeded(level++);const c=eligibleChoices(b);applyChoice(b,c.find(c=>c.kind==='evolution')??c.find(c=>c.id==='thorn')??c.find(c=>c.id==='sun')??c.find(c=>c.id==='storm')??c[0]);}
 }
 assert.ok(level>=6&&level<=12,'Mixed roster should not flood the player with upgrades: '+level);
 assert.equal(kinds.size,4);assert.ok(kills>25,'Kills: '+kills);assert.ok(b.evolved.length>0,'Focused build should evolve');
 console.log('  Mixed roster: '+kills+' kills, level '+level+', evolved '+b.evolved.join(', '));enemies.forEach(disposeEnemy);engine.dispose();
});
console.log(passed+' enemy, terrain, and feedback checks passed.');

