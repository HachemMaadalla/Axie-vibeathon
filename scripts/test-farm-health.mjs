import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from 'three';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(e){if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return next(specifier+'.ts',context);throw e;}}});
const {WildseedGame}=await import('../lib/game/scene.ts');
const {plotPosition,nearestPlot}=await import('../lib/game/farming.ts');
const {freshFarm}=await import('../lib/game/state.ts');
const {HealthBar}=await import('../lib/game/health-bar.ts');
const {makeEnemy,updateEnemy,disposeEnemy}=await import('../lib/game/enemies.ts');
let checks=0;const check=(name,f)=>{f();checks++;console.log('PASS '+name);};
function fixture(){return Object.assign(Object.create(WildseedGame.prototype),{
 farm:freshFarm(),player:new T.Group(),mode:'farm',started:true,paused:false,result:null,upgrade:false,keys:new Set(),selected:11,inReach:false,seed:'sunroot',
 emit:()=>{},sound:()=>{},pulse:()=>{},changed:s=>s,toast:s=>s
});}
const pressE=g=>g.tendPlot();
check('Walking between beds only changes the highlighted target; E performs each action',()=>{
 const g=fixture(),before=JSON.stringify(g.farm);
 for(let i=0;i<12;i++){g.player.position.copy(plotPosition(i));g.syncNearbyPlot();assert.equal(g.selected,i);}
 assert.equal(JSON.stringify(g.farm),before,'Proximity must never tend automatically');
 const index=g.farm.plots.findIndex(p=>!p.crop);assert.ok(index>=0);g.player.position.copy(plotPosition(index));
 const seeds=g.farm.seeds.sunroot;pressE(g);assert.equal(g.farm.plots[index].crop,'sunroot');assert.equal(g.farm.plots[index].watered,false);assert.equal(g.farm.seeds.sunroot,seeds-1);
 g.syncNearbyPlot();assert.equal(g.farm.plots[index].watered,false);pressE(g);assert.equal(g.farm.plots[index].watered,true);
 g.farm.plots[index].growth=1;const crops=g.farm.crops.sunroot;g.syncNearbyPlot();assert.equal(g.farm.crops.sunroot,crops);
 pressE(g);assert.equal(g.farm.plots[index].crop,null);assert.ok(g.farm.crops.sunroot>crops);
});
check('E resolves the current nearest bed and refuses distant or paused interactions',()=>{
 const g=fixture();g.selected=11;g.player.position.copy(plotPosition(0));const count=g.farm.crops.sunroot;pressE(g);
 assert.equal(g.selected,0);assert.ok(g.farm.crops.sunroot>count);
 g.player.position.set(20,0,20);const saved=JSON.stringify(g.farm);pressE(g);assert.equal(JSON.stringify(g.farm),saved);
 g.player.position.copy(plotPosition(1));g.paused=true;pressE(g);assert.equal(JSON.stringify(g.farm),saved);
 assert.equal(nearestPlot(new T.Vector3(0,8,0)).inReach,false);
});
check('Health bars retain a stable left edge, clamp health, and show recent damage',()=>{
 const bar=new HealthBar(2,.2);bar.update(25,100,.1);assert.equal(bar.fill.scale.x,.25);assert.equal(bar.fill.position.x,-.75);assert.ok(bar.trail.scale.x>.25);
 bar.update(25,100,2);assert.equal(bar.trail.scale.x,.25);
 bar.update(200,100);assert.equal(bar.fill.scale.x,1);bar.update(-5,100);assert.equal(bar.fill.visible,false);
 const parent=new T.Group(),camera=new T.PerspectiveCamera();parent.rotation.set(.1,1.5,.2);parent.add(bar);camera.rotation.set(.4,-.7,0);bar.face(camera);
 assert.ok(Math.abs(bar.getWorldQuaternion(new T.Quaternion()).dot(camera.getWorldQuaternion(new T.Quaternion())))>.99999);bar.dispose();
});
check('Full-health enemies have visible health bars after spawning',()=>{
 const events={telegraph:()=>{},projectile:()=>{},slam:()=>{},damage:()=>{}};
 for(const kind of ['beetle','stalker','shaman','moth','guardian']){
  const e=makeEnemy(kind);updateEnemy(e,.3,new T.Vector3(0,0,20),.3,()=>0,1,events);
  assert.ok(e.bar.visible,kind);assert.equal(e.bar.fill.scale.x,1);assert.ok(e.bar.children.length>=3);disposeEnemy(e);
 }
});
console.log(checks+' farm interaction and health-bar checks passed.');


