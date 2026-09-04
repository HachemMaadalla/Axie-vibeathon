import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e}}});
const {freshFarm,hydrateFarm}=await import('../lib/game/state.ts');
const {nearestService,HERO_SPOTS,ISLAND_SERVICES}=await import('../lib/game/island.ts');
const {WildseedGame}=await import('../lib/game/scene.ts');
let checks=0;
function check(name,f){f();checks++;console.log('PASS '+name)}
function fixture(){return Object.assign(Object.create(WildseedGame.prototype),{
 farm:freshFarm(),player:new T.Group(),farmWorld:new T.Group(),actors:new Map(['pomodoro','bing','kotaro'].map(id=>[id,{root:new T.Group()}])),
 mode:'farm',started:true,paused:false,result:null,upgrade:false,keys:new Set(),selected:0,inReach:false,nearby:null,seed:'sunroot',
 emit:()=>{},save:()=>{},animate:()=>{},toast:()=>{},changed:()=>{},tendPlot:()=>{}
})}
check('Only nearby services and inactive companions are available',()=>{
 for(const service of ISLAND_SERVICES)assert.equal(nearestService({...service,y:0},'pomodoro').service.kind,service.kind);
 for(const active of Object.keys(HERO_SPOTS))for(const [id,pos] of Object.entries(HERO_SPOTS)){
  const found=nearestService({...pos,y:0},active).service;
  assert.equal(found?.hero,id===active?undefined:id);
 }
 assert.equal(nearestService({x:50,y:0,z:50},'pomodoro').service,null);
 assert.equal(nearestService({x:-8,y:5,z:8.6},'pomodoro').service,null);
});
check('Walking only highlights; E opens and pauses one nearby service',()=>{
 for(const service of ISLAND_SERVICES){
  const g=fixture();let opened=0;g.onInteract=s=>{assert.equal(s.kind,service.kind);opened++};g.player.position.set(service.x,0,service.z);
  const before=JSON.stringify(g.farm);g.syncNearbyPlot();assert.equal(opened,0);assert.equal(JSON.stringify(g.farm),before);
  g.interact();assert.equal(opened,1);assert.ok(g.paused);g.interact();assert.equal(opened,1);
 }
 const g=fixture();let opened=0;g.onInteract=()=>opened++;g.player.position.set(-8,0,8.6);g.mode='dungeon';g.interact();assert.equal(opened,0);
});
check('Changing companions moves the active Axie into the player and leaves the others on the island',()=>{
 const g=fixture();g.syncHeroes();
 for(const chosen of ['bing','kotaro','pomodoro']){
  g.selectHero(chosen);assert.equal(g.farm.hero,chosen);
  for(const [id,a] of g.actors){assert.equal(a.root.parent,id===chosen?g.player:g.farmWorld);assert.ok(a.root.visible);if(id===chosen)assert.equal(a.root.position.length(),0);else{assert.equal(a.root.position.x,HERO_SPOTS[id].x);assert.equal(a.root.position.z,HERO_SPOTS[id].z)}}
 }
});
console.log(checks+' island interaction checks passed.');

