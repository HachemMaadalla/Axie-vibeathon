import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import * as T from 'three';import {loadModel} from './model-fixture.mjs';
registerHooks({resolve(s,c,next){try{return next(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e}}});
const {HERO_IDS,freshFarm}=await import('../lib/game/state.ts');
const {freshBuild,STARTER_SPELL,eligibleChoices,applyChoice,EVOLUTIONS}=await import('../lib/game/build.ts');
const {WildseedGame}=await import('../lib/game/scene.ts');
const {SpellEngine}=await import('../lib/game/spell-engine.ts');
const {createAxieActor}=await import('../lib/game/model.ts');
const {EQUIPMENT,equipAxie}=await import('../lib/game/equipment.ts');
const {SpellVisuals}=await import('../lib/game/spell-visuals.ts');
function fixture(hero){
 const farm=freshFarm();farm.hero=hero;
 return Object.assign(Object.create(WildseedGame.prototype),{farm,ready:true,started:true,mode:'farm',pickups:{clear(){}},actionFx:{clear(){}},spells:{clear(){}},fx:{clear(){}},clearHostiles(){},motor:{reset(){}},player:new T.Group(),followCamera:{snap(){}},farmWorld:new T.Group(),arena:new T.Group(),scene:new T.Scene(),save(){},toast(){}});
}
for(const hero of HERO_IDS){
 const game=fixture(hero);game.build={items:{thorn:3,ember:3},evolved:['thorn']};game.expedition(1);
 assert.deepEqual(game.build,freshBuild(hero));assert.deepEqual(Object.entries(game.build.items),[[STARTER_SPELL[hero],1]]);assert.equal(game.upgrade,false);assert.deepEqual(game.choices,[]);assert.equal(game.level,1);assert.equal(game.xp,0);
 const engine=new SpellEngine(new T.Scene()),mesh=new T.Group();mesh.position.set(0,0,2.5);const target={mesh,hp:10000,boss:false};let damage=0;
 for(let i=0;i<150;i++)engine.update(1/60,new T.Vector3(),game.build,18,[target],(t,n)=>{damage+=n;t.hp-=n});
 assert.ok(damage>0,hero+' level-one weapon must attack');engine.dispose();
 const starter=STARTER_SPELL[hero];for(let level=2;level<=3;level++){assert.ok(applyChoice(game.build,eligibleChoices(game.build).find(c=>c.id===starter&&c.level===level)));}
 assert.ok(applyChoice(game.build,eligibleChoices(game.build).find(c=>c.id===EVOLUTIONS[starter].passive)));
 assert.ok(applyChoice(game.build,eligibleChoices(game.build).find(c=>c.id===starter&&c.kind==='evolution')));
 game.mode='farm';game.expedition(1);assert.deepEqual(game.build,freshBuild(hero),'Every new run resets to its selected starter');
 const actor=createAxieActor(await loadModel('public/assets/axie/'+hero+'.glb'),1.9);equipAxie(actor,await loadModel('public/assets/axie/equipment/'+EQUIPMENT[hero].file+'.glb'),hero);
 game.actors=new Map([[hero,actor]]);game.elapsed=10;game.weaponCast(starter,new T.Vector3(0,0,3));assert.equal(actor.current,EQUIPMENT[hero].prefix+'.Attack');
 for(let f=0;f<30;f++){actor.mixer.update(1/60);actor.root.updateMatrixWorld(true);actor.root.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});const size=new T.Box3().setFromObject(actor.root).getSize(new T.Vector3());assert.ok(size.y>.7&&size.y<5.5&&Math.max(size.x,size.z)<6,hero+' attack stays correctly scaled '+size.toArray());}
 console.log('PASS '+hero+' starts with '+starter+', attacks, upgrades, evolves, and resets correctly');
}
for(const id of ['sword','axe','hammer']){
 const engine=new SpellEngine(new T.Scene()),front={mesh:new T.Group(),hp:100,boss:false},back={mesh:new T.Group(),hp:100,boss:false},far={mesh:new T.Group(),hp:100,boss:false};
 front.mesh.position.set(0,0,2);back.mesh.position.set(0,0,-3);far.mesh.position.set(0,0,12);
 engine.update(.016,new T.Vector3(),{items:{[id]:1},evolved:[]},18,[front,back,far],(t,d)=>t.hp-=d);
 assert.equal(front.hp,100,"Melee waits for the swing wind-up");for(let i=0;i<10;i++)engine.update(.016,new T.Vector3(),{items:{[id]:1},evolved:[]},18,[front,back,far],(t,d)=>t.hp-=d);assert.ok(front.hp<100);assert.equal(far.hp,100);assert.equal(back.hp<100,id==='hammer');engine.dispose();
}
const visual=new SpellVisuals(),sword=visual.swordStrike(new T.Vector3(),3.55,0,'#65dfff'),axe=visual.axeCleave(new T.Vector3(),3.45,0,'#ff8d43');
const sb=new T.Box3().setFromObject(sword),ab=new T.Box3().setFromObject(axe),ss=sb.getSize(new T.Vector3()),as=ab.getSize(new T.Vector3());
assert.ok(ss.y>2.5&&ss.x<.3&&ss.z>3,'Sword is a vertical plane with a straight forward footprint');assert.ok(sb.min.z>=0);
assert.ok(as.x>5&&as.y<.4,'Axe is a broad horizontal crescent');
visual.release(sword);visual.release(axe);visual.dispose();
for(const id of ['sword','axe']){
 const scene=new T.Scene(),engine=new SpellEngine(scene),front={mesh:new T.Group(),hp:100,boss:false},side={mesh:new T.Group(),hp:100,boss:false},behind={mesh:new T.Group(),hp:100,boss:false};
 front.mesh.position.set(0,0,2);side.mesh.position.set(2.2,0,1.8);behind.mesh.position.set(0,0,-3);
 for(let i=0;i<11;i++)engine.update(.016,new T.Vector3(),{items:{[id]:1},evolved:[]},18,[front,side,behind],(t,n)=>t.hp-=n);
 assert.ok(front.hp<100);assert.equal(side.hp<100,id==='axe','Sword cuts a line, axe sweeps across the side');assert.equal(behind.hp,100);
 assert.ok(scene.getObjectByName(id==='sword'?'vertical-sword-strike':'heavy-axe-cleave'));
 engine.clear();assert.equal(scene.getObjectByName('vertical-sword-strike'),undefined);assert.equal(scene.getObjectByName('heavy-axe-cleave'),undefined);engine.dispose();
}
const evolvedScene=new T.Scene(),evolvedEngine=new SpellEngine(evolvedScene),front={mesh:new T.Group(),hp:100,boss:false},side={mesh:new T.Group(),hp:100,boss:false},back={mesh:new T.Group(),hp:100,boss:false};
front.mesh.position.z=2;side.mesh.position.set(1,0,2.7);back.mesh.position.z=-3;
for(let i=0;i<8;i++)evolvedEngine.update(.016,new T.Vector3(),{items:{sword:3},evolved:['sword']},18,[front,side,back],(t,n)=>t.hp-=n);
assert.ok(side.hp<100&&front.hp<100);assert.equal(back.hp,100);assert.equal(evolvedScene.getObjectByName('vertical-sword-strike').children.length,3);evolvedEngine.dispose();
console.log('PASS Sword vertical line, axe horizontal sweep, evolved lanes and VFX cleanup match their damage');
