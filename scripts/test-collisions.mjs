import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e}}});
const {CollisionWorld}=await import('../lib/game/collisions.ts');
const {MovementMotor}=await import('../lib/game/movement.ts');
const {WildseedGame}=await import('../lib/game/scene.ts');
const {makeEnemy,updateEnemy,disposeEnemy}=await import('../lib/game/enemies.ts');
const {SpellEngine}=await import('../lib/game/spell-engine.ts');
const {batchTrees}=await import('../lib/game/environment.ts');
const {plotPosition}=await import('../lib/game/farming.ts');
const {PLOT_COUNT}=await import('../lib/game/state.ts');
const {ISLAND_SERVICES}=await import('../lib/game/island.ts');
const {terrainHeight,BRIDGES,riverX,WORLD_RADIUS}=await import('../lib/game/terrain.ts');
let count=0;const check=(name,f)=>{f();count++;console.log('PASS '+name);};
const step=(m,p,dir,w,n=120)=>{for(let i=0;i<n;i++)m.step(1/60,p,dir,9,false,120,()=>0,w);};
check('Sprinting and dashing stop at thin walls; diagonal movement slides along them',()=>{
 const w=new CollisionWorld();w.addBox(2,2.12,-20,20,0,8);
 const p=new T.Vector3(),m=new MovementMotor();m.dash(new T.Vector3(1,0,0));step(m,p,new T.Vector3(1,0,0),w);
 assert.ok(p.x<=1.381&&p.x>1.2);assert.ok(!w.blocked(p));
 p.set(0,0,-5);m.reset();step(m,p,new T.Vector3(1,0,1).normalize(),w,60);
 assert.ok(p.z>0&&p.x<1.381,'Wall should preserve tangential movement');
});
check('Low fences can be jumped; raised objects support landing and walking off',()=>{
 const w=new CollisionWorld();w.addBox(2,5,-2,2,0,1.2);
 const p=new T.Vector3(),m=new MovementMotor();m.requestJump();step(m,p,new T.Vector3(1,0,0),w,23);
 step(m,p,new T.Vector3(),w,80);assert.ok(p.x>2&&p.x<5);assert.ok(m.grounded);assert.equal(p.y,1.2);
 step(m,p,new T.Vector3(1,0,0),w,70);assert.ok(p.x>6&&m.grounded);assert.equal(p.y,0);
 const roof=new CollisionWorld();roof.addBox(-3,3,-3,3,2,3);p.set(0,0,0);m.reset();m.requestJump();
 for(let i=0;i<60;i++){m.step(1/60,p,new T.Vector3(),9,false,120,()=>0,roof);assert.ok(p.y+1.55<=2.001,'Jumping must not pass through a ceiling');}
});
check('Tree trunks slide naturally and charges cannot tunnel through scenery',()=>{
 const w=new CollisionWorld();w.addCircle(3,0,.45,0,5);const p=new T.Vector3(0,0,.35),m=new MovementMotor();
 step(m,p,new T.Vector3(1,0,0),w,80);assert.ok(p.x>5);assert.ok(!w.blocked(p));
 const wall=new CollisionWorld();wall.addBox(1,1.1,-8,8,0,5);
 const e=makeEnemy('beetle');e.state='attack';e.timer=1;e.heading.set(1,0,0);
 const noop=()=>{},events={telegraph:noop,projectile:noop,slam:noop,damage:noop};
 for(let i=0;i<30;i++)updateEnemy(e,1/60,new T.Vector3(10,0,0),i/60,()=>0,1,events,wall);
 assert.ok(e.mesh.position.x<=.051);assert.ok(!wall.blocked(e.mesh.position,e.radius,1.5));disposeEnemy(e);
});
check('Projectile collision uses the first wall and leaves overhead space open',()=>{
 const w=new CollisionWorld();w.addBox(3,4,-2,2,0,3);w.addBox(7,8,-2,2,0,3);
 assert.ok(Math.abs(w.firstHit(new T.Vector3(0,1,0),new T.Vector3(10,1,0)).x-2.9)<.001);
 assert.equal(w.firstHit(new T.Vector3(0,5,0),new T.Vector3(10,5,0)),null);
 const engine=new SpellEngine(new T.Scene(),{collision:(a,b)=>w.firstHit(a,b)}),enemy={hp:100,mesh:new T.Group(),boss:false};enemy.mesh.position.x=6;
 for(let i=0;i<120;i++)engine.update(1/60,new T.Vector3(),{items:{thorn:1},evolved:[]},18,[enemy],(e,n)=>e.hp-=n);
 assert.equal(enemy.hp,100);engine.dispose();
});
check('Actual farm beds, entrances and bridge gaps remain open after mesh batching',()=>{
 const farmWorld=new T.Group(),arena=new T.Group(),g=Object.assign(Object.create(WildseedGame.prototype),{farmWorld,arena,plants:[],plots:[],materialCache:new Map(),treeMats:new Map(),toonCache:new Map(),sharedSphere:new T.SphereGeometry(1,16,10)});
 g.makeFarm();g.expandWorld(farmWorld,'farm');const w=new CollisionWorld();w.capture(farmWorld,(x,z)=>terrainHeight('farm',x,z));assert.ok(w.count>40);
 assert.ok(w.blocked(new T.Vector3(-7,0,-5)),'Cottage is solid');assert.ok(w.blocked(new T.Vector3(-11.7,0,8.7)),'Barn is solid');
 for(let i=0;i<PLOT_COUNT;i++)assert.equal(w.blocked(plotPosition(i)),false,'Bed '+i+' is accessible');
 for(const s of ISLAND_SERVICES)assert.equal(w.blocked(new T.Vector3(s.x,0,s.z)),false,s.kind+' approach');
 assert.equal(w.blocked(new T.Vector3(0,0,13.7)),false,'Farm gate remains open');
 g.makeArena();g.expandWorld(arena,'dungeon');const dungeon=new CollisionWorld();dungeon.capture(arena,(x,z)=>terrainHeight('dungeon',x,z));assert.ok(dungeon.count>80);assert.equal(dungeon.blocked(new T.Vector3()),false,'Expedition arrival stays open');
 for(const z of BRIDGES){const x=riverX(z),at=new T.Vector3(x-18,terrainHeight('dungeon',x-18,z),z),motor=new MovementMotor();for(let i=0;i<300;i++)motor.step(1/60,at,new T.Vector3(1,0,0),9,false,WORLD_RADIUS.dungeon-2.5,(x,z)=>terrainHeight('dungeon',x,z),dungeon);assert.ok(at.x>x+16,'Actual bridge stays traversable at '+z+' x='+x+' at='+at.toArray());}
 const n=w.count;batchTrees(farmWorld);assert.equal(w.count,n);assert.ok(w.blocked(new T.Vector3(-7,0,-5)));
 const bridge=new CollisionWorld();bridge.addBox(-12,12,-2.1,-1.9,0,1.3);bridge.addBox(-12,12,1.9,2.1,0,1.3);
 const p=new T.Vector3(-10,0,0),m=new MovementMotor();step(m,p,new T.Vector3(1,0,0),bridge,160);assert.ok(p.x>10);assert.ok(!bridge.blocked(p));
});
console.log(count+' solid collision checks passed.');
