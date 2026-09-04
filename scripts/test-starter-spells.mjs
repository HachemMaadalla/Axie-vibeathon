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
 assert.ok(front.hp<100);assert.equal(far.hp,100);assert.equal(back.hp<100,id==='hammer');engine.dispose();
}
const visual=new SpellVisuals(),arc=visual.slash(new T.Vector3(),3,0,Math.PI*.9,'#ffffff');arc.geometry.computeBoundingBox();assert.ok(arc.geometry.boundingBox.min.z>=0,'Forward slash points toward +Z, matching its damage cone');visual.release(arc);visual.dispose();
console.log('PASS Melee range, forward arcs, and shockwave coverage agree with their visuals');

