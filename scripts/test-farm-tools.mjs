import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';import * as T from 'three';import {loadModel} from './model-fixture.mjs';
registerHooks({resolve(s,c,next){try{return next(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e}}});
const {WildseedGame}=await import('../lib/game/scene.ts');
const {freshFarm,HERO_IDS}=await import('../lib/game/state.ts');
const {FARM_SLOTS,farmAction}=await import('../lib/game/farm-tools.ts');
const {setFarmEquipment,useFarmEquipment,updateFarmEquipment}=await import('../lib/game/farm-equipment.ts');
const {plotPosition}=await import('../lib/game/farming.ts');
const {createAxieActor}=await import('../lib/game/model.ts');
const {equipAxie,EQUIPMENT,equippedMotion}=await import('../lib/game/equipment.ts');
function fixture(){return Object.assign(Object.create(WildseedGame.prototype),{farm:freshFarm(),held:'sunroot',seed:'sunroot',player:new T.Group(),mode:'farm',started:true,paused:false,result:null,selected:4,inReach:true,actors:new Map(),emit(){},toast:s=>s,changed(){},sound(){},pulse(){}});}
const g=fixture();g.player.position.copy(plotPosition(4));
for(const item of ['water','sickle','fertilizer']){g.selectFarmItem(item);const before=structuredClone(g.farm);g.tendPlot();assert.deepEqual(g.farm,before,'Wrong item never plants');}
g.selectFarmItem('moonberry');const seeds=g.farm.seeds.moonberry;g.tendPlot();assert.equal(g.farm.plots[4].crop,'moonberry');assert.equal(g.farm.seeds.moonberry,seeds-1);assert.equal(g.held,'moonberry');
g.tendPlot();assert.equal(g.farm.plots[4].watered,false);
g.selectFarmItem('sickle');g.tendPlot();assert.equal(g.farm.plots[4].crop,'moonberry');assert.equal(g.farm.plots[4].watered,false);
g.selectFarmItem('water');g.tendPlot();assert.ok(g.farm.plots[4].watered);assert.equal(g.held,'water');const watered=structuredClone(g.farm);g.tendPlot();assert.deepEqual(g.farm,watered);
g.selectFarmItem('fertilizer');g.tendPlot();assert.equal(g.farm.fertilizer,1);assert.ok(g.farm.plots[4].fertilized);g.tendPlot();assert.equal(g.farm.fertilizer,1);
g.selectFarmItem('soil');g.tendPlot();assert.equal(g.farm.soil,0);assert.ok(g.farm.plots[4].rich);
g.farm.plots[4].growth=1;for(const item of ['water','sunroot','soil']){g.selectFarmItem(item);g.tendPlot();assert.equal(g.farm.plots[4].crop,'moonberry');}
g.selectFarmItem('sickle');g.tendPlot();assert.equal(g.farm.crops.moonberry,3);assert.equal(g.farm.plots[4].crop,null);assert.equal(g.held,'sickle');
g.selectFarmItem('embercorn');assert.equal(farmAction(g.farm,4,g.held).label,'No seeds');
console.log('PASS E requires the correct held item, spends supplies once, and never switches slots');
for(const id of HERO_IDS){
 const actor=createAxieActor(await loadModel('public/assets/axie/'+id+'.glb'),1.9),weapon=equipAxie(actor,await loadModel('public/assets/axie/equipment/'+EQUIPMENT[id].file+'.glb'),id);
 for(const item of FARM_SLOTS){
  setFarmEquipment(actor,item);const rack=actor.root.getObjectByName('farm-tools');assert.ok(rack.visible);assert.equal(weapon.visible,false);assert.equal(rack.children.filter(c=>c.visible).length,1);assert.equal(rack.parent,weapon.parent);
  const held=rack.children.find(c=>c.visible);useFarmEquipment(actor);updateFarmEquipment(actor,.15);assert.ok(Math.abs(held.rotation.x)>0);
  actor.actions.get(equippedMotion(actor,id,true))?.play();actor.mixer.update(.12);actor.root.updateMatrixWorld(true);
  const size=new T.Box3().setFromObject(held).getSize(new T.Vector3());assert.ok(size.toArray().every(Number.isFinite));assert.ok(size.length()>.3&&size.length()<2.5,id+' tool stays hand sized '+size.toArray());
  updateFarmEquipment(actor,1);assert.ok(Math.abs(held.rotation.x)<1e-6);
  assert.ok(Math.abs(held.rotation.y)<1e-6);
 }
 setFarmEquipment(actor,null);assert.ok(weapon.visible);assert.equal(actor.root.getObjectByName('farm-tools').visible,false);
 setFarmEquipment(actor,'water');assert.equal(actor.root.getObjectByName('farm-tools').children.length,12);
 console.log('PASS '+id+' hand tools stay scaled in motion and restore the combat weapon');
}
