import assert from 'node:assert/strict';import fs from 'node:fs';import {registerHooks} from 'node:module';import * as T from 'three';
import {loadModel} from './model-fixture.mjs';
registerHooks({resolve(s,c,next){try{return next(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e}}});
const {createAxieActor}=await import('../lib/game/model.ts');
const {EQUIPMENT,equipAxie,equippedMotion}=await import('../lib/game/equipment.ts');
const {HERO_IDS,HEROES,freshFarm,hydrateFarm,beginExpedition}=await import('../lib/game/state.ts');
const {HERO_SPOTS,RESIDENTS,nearestService}=await import('../lib/game/island.ts');
const {WildseedGame}=await import('../lib/game/scene.ts');
const actors=new Map();let count=0;
for(const id of HERO_IDS){
 const a=createAxieActor(await loadModel('public/assets/axie/'+id+'.glb'),1.9);
 const weapon=equipAxie(a,await loadModel('public/assets/axie/equipment/'+EQUIPMENT[id].file+'.glb'),id);
 for(const moving of [false,true]){
  a.mixer.stopAllAction();a.actions.get(equippedMotion(a,id,moving)).reset().play();
  for(let f=0;f<45;f++){
   a.mixer.update(1/30);a.root.updateMatrixWorld(true);
   a.root.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
   const bounds=new T.Box3().setFromObject(a.root),size=bounds.getSize(new T.Vector3()),wsize=new T.Box3().setFromObject(weapon).getSize(new T.Vector3());
   assert.ok(size.y>1&&size.y<4.5,id+' actor height '+size.y);assert.ok(Math.max(size.x,size.z)<5,id+' oversized actor');
   assert.ok(Math.max(...wsize.toArray())>.6&&Math.max(...wsize.toArray())<3,id+' invalid weapon scale '+wsize.toArray());
   assert.ok(weapon.getWorldPosition(new T.Vector3()).distanceTo(weapon.parent.getWorldPosition(new T.Vector3()))<.0001,id+' weapon detached from hand');
  }
 }
 assert.ok(fs.existsSync('public/assets/axie/'+id+'.png'));actors.set(id,a);count++;console.log('PASS '+id+' equipped idle/run bounds and hand attachment');
 const farm=freshFarm();farm.hero=id;assert.equal(hydrateFarm(farm).hero,id);
 const stats=beginExpedition(farm,1);assert.equal(stats.hp,100+HEROES[id].health);assert.equal(stats.damage,18*HEROES[id].damage);assert.equal(stats.speed,6*HEROES[id].speed);
 const spot=HERO_SPOTS[id];assert.equal(nearestService({...spot,y:0},id==='pomodoro'?'bing':'pomodoro').service.hero,id);
}
for(const r of RESIDENTS){
 const a=createAxieActor(await loadModel('public/assets/axie/'+r.file+'.glb'),1.65);
 for(const name of ['Idle','Walk','Run'])assert.ok(a.actions.has(name),r.id+' missing '+name);
 const b=new T.Box3().setFromObject(a.root);assert.ok(Math.abs(b.max.y-b.min.y-1.65)<.01);
 count++;console.log('PASS '+r.id+' normalized resident with locomotion');
}
assert.equal(new Set(RESIDENTS.map(r=>r.id)).size,10);assert.equal(HERO_IDS.length,7);assert.equal(Object.keys(EQUIPMENT).length,7);
const game=Object.assign(Object.create(WildseedGame.prototype),{actors,farm:freshFarm(),player:new T.Group(),farmWorld:new T.Group(),mode:'farm',save:()=>{},emit:()=>{},animate:()=>{}});
for(const id of HERO_IDS){
 game.selectHero(id);assert.equal(game.farm.hero,id);assert.equal(game.player.children.length,1);assert.equal(game.farmWorld.children.length,6);
 for(const [other,a] of actors)assert.equal(a.root.parent,other===id?game.player:game.farmWorld);
}
console.log('PASS switching all seven companions keeps six armed companions on the island');
console.log(count+' real character assets and all seven weapons verified.');

