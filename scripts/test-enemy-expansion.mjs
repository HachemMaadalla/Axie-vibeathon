import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e;}}});
const {makeEnemy,updateEnemy,disposeEnemy,enemyKindFor,bossKindFor,ENEMY_INFO,BOSS_KINDS}=await import('../lib/game/enemies.ts');
const {EnemyAttacks}=await import('../lib/game/enemy-attacks.ts');
const {EnemyBatch}=await import('../lib/game/enemy-batch.ts');
const {CollisionWorld}=await import('../lib/game/collisions.ts');
const {WildseedGame}=await import('../lib/game/scene.ts');
const {freshFarm}=await import('../lib/game/state.ts');
const {rollDrops}=await import('../lib/game/pickups.ts');
let passed=0;const check=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const noop=()=>{},fx={burst:noop,ring:noop,trail:noop},events={telegraph:noop,projectile:noop,slam:noop,damage:noop,lane:noop,zone:noop,summon:noop};
check('All seven regular creatures spawn; both tiers rotate real bosses',()=>{
 const kinds=new Set(Array.from({length:90},(_,i)=>enemyKindFor(45,i)));
 assert.equal(kinds.size,7);for(const k of kinds)assert.equal(ENEMY_INFO[k].boss,false);
 const bosses=new Set([1,2].flatMap(t=>Array.from({length:6},(_,i)=>bossKindFor(t,i))));assert.equal(bosses.size,3);
 for(const k of bosses){const e=makeEnemy(k);assert.equal(e.boss,true);assert.ok(e.max>=650);disposeEnemy(e);}
});
check('Bombers lock a marked impact, crystal sentries fire five bolts and brutes slam once',()=>{
 for(const [kind,expected] of [['bomber','zone'],['crystal','projectile'],['brute','slam']]){
  const e=makeEnemy(kind);e.spawnAge=.5;e.cooldown=0;const calls=[];const ev={...events,[expected]:(...args)=>calls.push(args)};
  const player=new T.Vector3(0,0,4);updateEnemy(e,.01,player,0,()=>0,1,ev);assert.equal(e.state,'windup');assert.equal(calls.length,0);
  const target=e.target.clone();player.x=8;for(let i=0;i<100;i++)updateEnemy(e,.01,player,i*.01,()=>0,1,ev);
  assert.equal(calls.length,kind==='crystal'?5:1,kind);if(kind==='bomber')assert.ok(calls[0][0].equals(target));disposeEnemy(e);
 }
});
check('Every boss has three attacks, an enraged phase and harmless wind-up',()=>{
 for(const kind of BOSS_KINDS){const patterns=[];
  for(let style=0;style<3;style++){
   const e=makeEnemy(kind);e.spawnAge=1;e.cooldown=0;e.attackIndex=style;let warnings=0;const calls={shot:0,wave:0,zone:0,summon:0};
   const ev={...events,telegraph:()=>warnings++,projectile:()=>calls.shot++,slam:()=>calls.wave++,zone:()=>calls.zone++,summon:(_,n)=>calls.summon+=n};
   for(let i=0;i<60;i++)updateEnemy(e,.01,new T.Vector3(0,0,5),i*.01,()=>0,1,ev);
   assert.equal(warnings,1);assert.deepEqual(Object.values(calls),[0,0,0,0]);
   for(let i=0;i<60;i++)updateEnemy(e,.01,new T.Vector3(0,0,5),i*.01,()=>0,1,ev);
   assert.ok(Object.values(calls).some(n=>n>0));patterns.push(JSON.stringify(calls));
   e.hp=e.max*.4;updateEnemy(e,.01,new T.Vector3(0,0,5),2,()=>0,1,ev);assert.equal(e.enraged,true);disposeEnemy(e);
  }assert.equal(new Set(patterns).size,3,kind);
 }
 // The entire radial volley stays at one height.
 const q=makeEnemy('broodqueen');q.state='windup';q.timer=.01;q.attackStyle=1;q.mesh.position.y=.85;
 const ys=[];updateEnemy(q,.02,new T.Vector3(0,0,5),0,()=>0,1,{...events,projectile:p=>ys.push(p.y)});
 assert.equal(new Set(ys).size,1);assert.ok(ys[0]<1.4);disposeEnemy(q);
});
check('Ground blasts warn first, hit once and can be escaped or jumped',()=>{
 for(const [player,hits] of [[new T.Vector3(),1],[new T.Vector3(5,0,0),0],[new T.Vector3(0,2,0),0]]){
  const scene=new T.Scene(),a=new EnemyAttacks(scene,()=>0,fx,noop);let n=0;a.zone(new T.Vector3(),2,.6,17,'#ffac66');
  a.update(.3,player,()=>n++);assert.equal(n,0);a.update(.31,player,()=>n++);assert.equal(n,hits);a.update(.3,player,()=>n++);assert.equal(n,hits);a.clear();assert.equal(scene.children.length,0);
 }
});
check('Expanding waves follow terrain and never damage beyond the warned circle',()=>{
 const height=(x,z)=>x*.04+Math.sin(z)*.1,scene=new T.Scene(),a=new EnemyAttacks(scene,height,fx,noop);let n=0;
 a.wave(new T.Vector3(),4);for(let i=0;i<20;i++)a.update(.05,new T.Vector3(3,height(3,0)+2,0),()=>n++);assert.equal(n,0);
 a.wave(new T.Vector3(),4);for(let i=0;i<20;i++)a.update(.05,new T.Vector3(7,height(7,0),0),()=>n++);assert.equal(n,0);
 a.wave(new T.Vector3(),4);a.update(.1,new T.Vector3(3,height(3,0),0),()=>n++);
 const t=a.threats[0],p=t.root.children[0].geometry.attributes.position;
 for(let j=0;j<p.count;j++)assert.ok(Math.abs(p.getY(j)-height(p.getX(j),p.getZ(j))-.14)<1e-5);
 for(let i=0;i<20;i++)a.update(.05,new T.Vector3(3,height(3,0),0),()=>n++);assert.equal(n,1);a.clear();
});
check('Projectiles use swept hit detection, respect cover and cancel on owner death',()=>{
 const scene=new T.Scene(),a=new EnemyAttacks(scene,()=>0,fx,noop);let damage=0;
 a.shot(new T.Vector3(0,.85,-2),new T.Vector3(0,.85,5),{speed:30,damage:13});a.update(.15,new T.Vector3(),n=>damage+=n);assert.equal(damage,13);
 const cover=new T.Group(),wall=new T.Mesh(new T.BoxGeometry(4,4,.5),new T.MeshBasicMaterial());wall.position.set(0,1,-1);wall.userData.solid=true;cover.add(wall);const c=new CollisionWorld();c.capture(cover,()=>0);
 a.shot(new T.Vector3(0,.85,-2),new T.Vector3(0,.85,5),{speed:30});a.update(.15,new T.Vector3(),n=>damage+=n,c);assert.equal(damage,13);
 const e=makeEnemy('bomber');a.zone(new T.Vector3(),2,.6,50,'#ff0000',e);a.shot(new T.Vector3(0,.85,-2),new T.Vector3(0,.85,2),{},e);e.hp=0;a.update(1,new T.Vector3(),n=>damage+=n);assert.equal(damage,13);assert.equal(a.threats.length,0);
 a.clear();disposeEnemy(e);wall.geometry.dispose();wall.material.dispose();
});
check('Attack and model pools stay bounded and preserve live geometry after deaths',()=>{
 const scene=new T.Scene(),a=new EnemyAttacks(scene,()=>0,fx,noop);
 for(let i=0;i<500;i++){a.shot(new T.Vector3(),new T.Vector3(0,0,5));a.warning(new T.Vector3(),2,1);}
 assert.ok(a.threats.length<=160);assert.ok(a.threats.filter(t=>t.kind==='shot').length<=80);a.clear();assert.equal(scene.children.length,0);
 const parent=new T.Group(),batch=new EnemyBatch(parent),enemies=Array.from({length:84},(_,i)=>makeEnemy(Object.keys(ENEMY_INFO)[i%10]));
 batch.update(enemies);for(const p of Object.values(batch.pools))assert.ok(p.count<6000);
 const alive=enemies.pop();disposeEnemy(enemies.pop());batch.update([alive]);assert.ok(batch.mesh.count>0);batch.clear();for(const p of Object.values(batch.pools))assert.equal(p.count,0);
 batch.dispose();disposeEnemy(alive);enemies.forEach(disposeEnemy);
});
check('Scene spawns alternate bosses and caps summons without changing drop rarity',()=>{
 const g=Object.assign(Object.create(WildseedGame.prototype),{farm:freshFarm(),tier:2,time:65,spawnIndex:0,enemies:[],player:new T.Group(),arena:new T.Group(),collisions:{dungeon:new CollisionWorld()},fx:{ring:noop},challenge:'calm'});
 g.spawn(true);assert.equal(g.enemies[0].kind,'golem');g.enemies.forEach(disposeEnemy);g.enemies=[];
 g.farm.progress.wins.pomodoro=1;g.spawn(true);assert.equal(g.enemies[0].kind,'broodqueen');
 for(let i=0;i<100;i++)g.spawn(false,0,'moth');assert.equal(g.enemies.length,60);g.enemies.forEach(disposeEnemy);
 for(const kind of ['bomber','crystal','brute']){let seeds=0;for(let i=0;i<10000;i++)seeds+=rollDrops(1,false,()=>i/10000,kind).filter(d=>!['soil','fertilizer'].includes(d.kind)).length;assert.equal(seeds,800);}
});
check('Flyers approach directly and casters hold their ground without retreating',()=>{
 for(const kind of ['moth','broodqueen']){
  const e=makeEnemy(kind);e.cooldown=99;const target=new T.Vector3(0,0,20);
  for(let i=0;i<100;i++)updateEnemy(e,.01,target,i*.01,()=>0,1,events);
  assert.ok(Math.abs(e.mesh.position.x)<1e-8);assert.ok(e.mesh.position.z>2);const y=e.mesh.position.y;
  updateEnemy(e,.1,target,20,()=>0,1,events);assert.equal(e.mesh.position.y,y);disposeEnemy(e);
 }
 for(const kind of ['shaman','bomber','crystal']){
  const e=makeEnemy(kind);e.cooldown=99;for(let i=0;i<100;i++)updateEnemy(e,.01,new T.Vector3(0,0,4),i*.01,()=>0,1,events);
  assert.equal(e.mesh.position.z,0);assert.equal(e.mesh.position.x,0);disposeEnemy(e);
 }
});
check('Attack poses snap through a short strike and stagger cannot stretch the wind-up',()=>{
 const e=makeEnemy('shaman');e.spawnAge=1;e.cooldown=0;let shots=0;const ev={...events,projectile:()=>shots++};
 for(let i=0;i<50;i++){e.stagger=.5;updateEnemy(e,.01,new T.Vector3(0,0,6),i*.01,()=>0,1,ev);}
 assert.equal(shots,3);assert.equal(e.state,'attack');
 for(let i=0;i<32;i++)updateEnemy(e,.01,new T.Vector3(0,0,6),i*.01,()=>0,1,ev);
 assert.equal(e.state,'seek');disposeEnemy(e);
 const reaver=makeEnemy('stalker');reaver.spawnAge=1;reaver.state='windup';reaver.timer=.24;
 updateEnemy(reaver,.06,new T.Vector3(0,0,3),0,()=>0,1,events);const first=reaver.rig.arms[0].rotation.x;
 updateEnemy(reaver,.06,new T.Vector3(0,0,3),.06,()=>0,1,events);
 assert.notEqual(first,reaver.rig.arms[0].rotation.x);disposeEnemy(reaver);
});
console.log(passed+' enemy expansion checks passed.');
