import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e}}});
const {freshFarm,hydrateFarm}=await import('../lib/game/state.ts');
const {trade,PRICES}=await import('../lib/game/economy.ts');
const {nearestService,HERO_SPOTS,ISLAND_SERVICES}=await import('../lib/game/island.ts');
const {WildseedGame}=await import('../lib/game/scene.ts');
let checks=0;
function check(name,f){f();checks++;console.log('PASS '+name)}
function fixture(){return Object.assign(Object.create(WildseedGame.prototype),{
 farm:freshFarm(),player:new T.Group(),farmWorld:new T.Group(),actors:new Map(['pomodoro','bing','kotaro'].map(id=>[id,{root:new T.Group()}])),
 mode:'farm',started:true,paused:false,result:null,upgrade:false,keys:new Set(),selected:0,inReach:false,nearby:null,seed:'sunroot',
 emit:()=>{},save:()=>{},animate:()=>{},toast:()=>{},tendPlot:()=>{}
})}
check('Legacy saves gain coins without losing farm progress',()=>{
 const old=freshFarm();delete old.coins;old.day=7;old.seeds.sunroot=64;old.hero='kotaro';old.unlocked=true;
 const restored=hydrateFarm(old);assert.equal(restored.coins,30);assert.equal(restored.day,7);assert.equal(restored.seeds.sunroot,64);assert.equal(restored.hero,'kotaro');assert.ok(restored.unlocked);
 for(const coins of [-1,NaN,Infinity])assert.equal(hydrateFarm({...old,coins}).coins,0);
 assert.equal(hydrateFarm({...old,coins:42}).coins,42);
});
check('Buying and selling all goods applies the exact price and quantity',()=>{
 for(const kind of ['seeds','crops'])for(const id of Object.keys(PRICES[kind])){
  const f=freshFarm();f.unlocked=true;f.coins=100;const count=f[kind][id],p=PRICES[kind][id];
  assert.equal(trade(f,'buy',kind,id),'Bought');assert.equal(f.coins,100-p.buy);assert.equal(f[kind][id],count+1);
  assert.equal(trade(f,'sell',kind,id),'Sold');assert.equal(f.coins,100-p.buy+p.sell);assert.equal(f[kind][id],count);
 }
});
check('Rejected trades never spend coins or change stock',()=>{
 const cases=[
  f=>{f.coins=0;return ['buy','seeds','sunroot']},
  f=>{f.crops.sunroot=0;return ['sell','crops','sunroot']},
  f=>{f.coins=100;return ['buy','seeds','embercorn']},
  f=>{f.coins=100;f.seeds.sunroot=99999;return ['buy','seeds','sunroot']},
  f=>{f.coins=99999;return ['sell','seeds','sunroot']},
  ()=>['buy','seeds','invalid'],()=>['invalid','seeds','sunroot'],()=>['buy','invalid','sunroot']
 ];
 for(const setup of cases){const f=freshFarm(),args=setup(f),before=JSON.stringify(f);trade(f,...args);assert.equal(JSON.stringify(f),before);}
 const f=freshFarm();f.coins=6;assert.equal(trade(f,'buy','seeds','sunroot'),'Bought');assert.equal(trade(f,'buy','seeds','sunroot'),'Not enough coins');assert.equal(f.coins,0);
});
check('Only nearby services and the two inactive companions are available',()=>{
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
check('Changing companions moves the active Axie into the player and leaves two on the island',()=>{
 const g=fixture();g.syncHeroes();
 for(const chosen of ['bing','kotaro','pomodoro']){
  g.selectHero(chosen);assert.equal(g.farm.hero,chosen);
  for(const [id,a] of g.actors){assert.equal(a.root.parent,id===chosen?g.player:g.farmWorld);assert.ok(a.root.visible);if(id===chosen)assert.equal(a.root.position.length(),0);else{assert.equal(a.root.position.x,HERO_SPOTS[id].x);assert.equal(a.root.position.z,HERO_SPOTS[id].z)}}
 }
});
check('Shop transactions require being at the stall',()=>{
 const g=fixture();g.player.position.set(30,0,30);const before=g.farm.coins;g.tradeItem('buy','seeds','sunroot');assert.equal(g.farm.coins,before);
 g.player.position.set(-8,0,8.6);g.paused=true;g.tradeItem('buy','seeds','sunroot');assert.equal(g.farm.coins,before-6);
});
console.log(checks+' island interaction and economy checks passed.');

