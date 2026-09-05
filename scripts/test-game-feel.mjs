import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import * as T from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e}}});
const {PlayerFeel}=await import('../lib/game/player-feel.ts');
const {CombatAudio}=await import('../lib/game/combat-audio.ts');
const {makeEnemy,updateEnemy,disposeEnemy}=await import('../lib/game/enemies.ts');
const {WildseedGame}=await import('../lib/game/scene.ts');
const {SpellEngine}=await import('../lib/game/spell-engine.ts');
const {freshFarm}=await import('../lib/game/state.ts');
let count=0;const check=(name,f)=>{f();count++;console.log('PASS '+name);};
check('Weapon recoil and landing recover without moving the player body',()=>{
 const body=new T.Group(),actor=new T.Group();body.position.set(4,2,7);body.add(actor);const feel=new PlayerFeel();
 feel.fire(new T.Vector3(0,0,1),true);feel.land(-16);feel.update(.016,actor,true,false);
 assert.ok(actor.position.z<0);assert.ok(actor.scale.y<1);assert.deepEqual(body.position.toArray(),[4,2,7]);
 for(let i=0;i<120;i++)feel.update(1/60,actor,false,false);
 assert.ok(actor.position.length()<.00001);assert.ok(Math.abs(actor.scale.y-1)<.00001);
 feel.fire(new T.Vector3(1,0,0));feel.reset(actor);assert.equal(actor.position.length(),0);assert.equal(actor.scale.y,1);
});
check('Only the struck enemy staggers, then resumes chasing',()=>{
 const hit=makeEnemy('stalker'),other=makeEnemy('stalker'),target=new T.Vector3(0,0,20),noop=()=>{},events={telegraph:noop,projectile:noop,slam:noop,damage:noop};
 hit.stagger=.055;
 updateEnemy(hit,.016,target,0,()=>0,1,events);updateEnemy(other,.016,target,0,()=>0,1,events);
 assert.ok(hit.mesh.position.z<other.mesh.position.z*.2);
 for(let i=0;i<10;i++)updateEnemy(hit,.016,target,0,()=>0,1,events);
 assert.equal(hit.stagger,0);const z=hit.mesh.position.z;updateEnemy(hit,.016,target,0,()=>0,1,events);assert.ok(hit.mesh.position.z-z>.03);
 disposeEnemy(hit);disposeEnemy(other);
});
check('Melee has a short wind-up and clearing a run cancels pending strikes',()=>{
 const engine=new SpellEngine(new T.Scene()),target={mesh:new T.Group(),hp:100,boss:false};target.mesh.position.z=2;
 const player=new T.Vector3(),build={items:{hammer:1},evolved:[]},hit=(t,n)=>t.hp-=n;
 engine.update(.016,player,build,18,[target],hit);assert.equal(target.hp,100);
 engine.clear();for(let i=0;i<20;i++)engine.update(.016,player,{items:{},evolved:[]},18,[target],hit);
 assert.equal(target.hp,100);engine.dispose();
});
check('Defeated enemies tumble, stay bounded, and release all temporary rigs',()=>{
 const arena=new T.Group(),game=Object.assign(Object.create(WildseedGame.prototype),{defeated:[]});
 let released=0;
 for(let i=0;i<30;i++){const e=makeEnemy('moth');e.spawnAge=1;arena.add(e.mesh);let mesh;e.visual.traverse(o=>{if(!mesh&&o instanceof T.Mesh)mesh=o;});mesh.material.addEventListener('dispose',()=>released++);game.leaveDefeated(e,new T.Vector3(1,0,0));}
 assert.equal(game.defeated.length,24);assert.equal(released,6);
 const e=game.defeated[0].enemy;game.updateDefeated(.1);assert.ok(e.mesh.position.x>0);assert.ok(e.mesh.rotation.z>0);assert.equal(e.bar.visible,false);
 game.updateDefeated(.3);assert.equal(game.defeated.length,0);assert.equal(arena.children.length,0);assert.equal(released,30);
});
check('Unchanged farm growth stages retain their existing meshes',()=>{
 const farm=freshFarm();farm.plots=farm.plots.slice(0,1);farm.plots[0].crop='sunroot';farm.plots[0].growth=.1;
 const plant=new T.Group(),game=Object.assign(Object.create(WildseedGame.prototype),{farm,plants:[plant],plots:[{}],sharedSphere:new T.SphereGeometry(),mat:()=>null,blob:(parent)=>parent.add(new T.Group())});
 game.refreshPlants();const first=plant.children[0];farm.plots[0].growth=.2;game.refreshPlants();assert.equal(plant.children[0],first);
 farm.plots[0].growth=.4;game.refreshPlants();assert.notEqual(plant.children[0],first);game.sharedSphere.dispose();
});
check('Audio caps crowded encounters, rises with XP chains, and mutes active voices',()=>{
 const param=()=>({value:0,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;}});
 const nodes=[],context={state:'running',currentTime:1,createGain:()=>({gain:param(),connect(){},disconnect(){}}),createOscillator(){const n={frequency:param(),connect(){},disconnect(){},start(){this.startHz=this.frequency.value;},stop(){}};nodes.push(n);return n;},close:async()=>{}};
 const audio=new CombatAudio();audio.context=context;audio.output=context.createGain();audio.muted=false;
 for(let i=0;i<20;i++){context.currentTime+=.04;audio.play('xp');}
 assert.equal(nodes.length,12);assert.ok(nodes[1].startHz>nodes[0].startHz);assert.ok(nodes[11].startHz>nodes[1].startHz);
 audio.muted=true;assert.equal(audio.output.gain.value,0);context.currentTime+=1;audio.play('hurt');assert.equal(nodes.length,12);audio.dispose();
 const files=fs.readdirSync('public/assets/audio');assert.equal(files.length,13);
 for(const file of files){const b=fs.readFileSync('public/assets/audio/'+file);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');assert.ok(b.length>1000);}
});
console.log(count+' combat-feel checks passed.');
