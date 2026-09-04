import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from 'three';
import {MovementMotor} from '../lib/game/movement.ts';
import {WORLD_RADIUS,terrainHeight} from '../lib/game/terrain.ts';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(e){if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return next(specifier+'.ts',context);throw e;}}});
const {makeLandscape}=await import('../lib/game/landscape.ts');
const {SpellEngine}=await import('../lib/game/spell-engine.ts');
let passed=0;function check(name,fn){fn();console.log('PASS '+name);passed++;}
const flat=()=>0,step=(m,p,input=new T.Vector3(),sprint=false,height=flat,r=60)=>m.step(1/120,p,input,9,sprint,r,height);
check('Single jump leaves the ground and lands; double jump gains height without infinite jumps',()=>{
 const m=new MovementMotor(),p=new T.Vector3();m.requestJump();let apex=0;
 for(let i=0;i<240;i++){step(m,p);apex=Math.max(apex,p.y);}
 assert.ok(apex>2.5&&apex<3);assert.equal(p.y,0);assert.ok(m.grounded);
 m.requestJump();for(let i=0;i<30;i++)step(m,p);
 m.requestJump();step(m,p);assert.equal(m.jumpsUsed,2);const v=m.vertical;
 m.requestJump();step(m,p);assert.ok(m.vertical<v);assert.equal(m.jumpsUsed,2);
 let doubleApex=p.y;for(let i=0;i<250;i++){step(m,p);doubleApex=Math.max(doubleApex,p.y);}
 assert.ok(doubleApex>apex+1);assert.ok(m.grounded);assert.equal(m.jumpsUsed,0);
});
check('Sprint is faster, dash moves from rest, and dash cooldown is enforced',()=>{
 const walk=new MovementMotor(),run=new MovementMotor(),a=new T.Vector3(),b=new T.Vector3(),dir=new T.Vector3(1,0,0);
 for(let i=0;i<120;i++){step(walk,a,dir);step(run,b,dir,true);}
 assert.ok(b.x>a.x*1.5);
 const dash=new MovementMotor(),p=new T.Vector3();assert.ok(dash.dash(dir));assert.equal(dash.dash(dir),false);
 for(let i=0;i<24;i++)step(dash,p);
 assert.ok(p.x>5);for(let i=0;i<150;i++)step(dash,p);assert.ok(dash.dash(dir));
});
check('Terrain steps can be climbed; tall walls stop a dash and jumping lands on a ledge',()=>{
 const m=new MovementMotor(),p=new T.Vector3(),dir=new T.Vector3(1,0,0),stairs=x=>Math.max(0,Math.min(2,Math.floor(x)*.5));
 for(let i=0;i<120;i++)step(m,p,dir,false,(x)=>stairs(x));
 assert.equal(p.y,2);assert.ok(p.x>4);
 const wall=(x)=>x>=2?5:0;m.reset();p.set(0,0,0);m.dash(dir);
 for(let i=0;i<60;i++)step(m,p,dir,false,wall);
 assert.ok(p.x<2);assert.equal(p.y,0);
 const ledge=x=>x>=2?1.5:0;m.reset();p.set(0,0,0);m.requestJump();
 for(let i=0;i<150;i++)step(m,p,i<50?dir:new T.Vector3(),false,ledge);
 assert.ok(p.x>2);assert.equal(p.y,1.5);assert.ok(m.grounded);
});
check('World boundary only clamps horizontal position, including during an air dash',()=>{
 const m=new MovementMotor(),p=new T.Vector3(59,0,0),dir=new T.Vector3(1,0,0);
 m.requestJump();step(m,p,dir);m.dash(dir);
 for(let i=0;i<25;i++)step(m,p,dir);
 assert.ok(Math.hypot(p.x,p.z)<=60.00001);assert.ok(p.y>1);
 m.reset();assert.equal(m.vertical,0);assert.equal(m.dashCooldown,0);assert.equal(m.velocity.length(),0);
});
check('Terrain visuals match collision heights across the smaller battle map',()=>{
 const g=new T.Group(),chunks=makeLandscape(g);g.updateMatrixWorld(true);const ray=new T.Raycaster();let highest=0;
 for(let i=0;i<80;i++){const a=i*2.4,r=20+i/79*(WORLD_RADIUS.dungeon-23),x=Math.cos(a)*r,z=Math.sin(a)*r;ray.set(new T.Vector3(x,100,z),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(chunks,false)[0];assert.ok(hit);const y=terrainHeight('dungeon',x,z);assert.ok(Math.abs(hit.point.y-y-.02)<.00001);highest=Math.max(highest,y);}
 assert.ok(highest>=15);assert.equal(WORLD_RADIUS.dungeon,170);assert.equal(WORLD_RADIUS.farm,30);
 for(const c of chunks)c.geometry.dispose();chunks[0].material.map?.dispose();chunks[0].material.dispose();
 assert.equal(terrainHeight('farm',0,0),0);assert.equal(terrainHeight('farm',-7,-5),0);
});
check('Spore and meteor effects work at elevated ground heights',()=>{
 const scene=new T.Scene(),e=new SpellEngine(scene),player=new T.Vector3(0,6,0),mesh=new T.Group();mesh.position.set(.5,6,0);const target={mesh,hp:1000,boss:false};
 const b={items:{spore:3,dew:1,ember:3},evolved:['spore','ember']};
 let damage=0;for(let i=0;i<70;i++)e.update(1/60,player,b,18,[target],(_,n)=>damage+=n);
 assert.ok(damage>0);assert.equal(e.healingAt(player),3);
 for(const object of scene.children[0].children)assert.ok(object.position.y>=6,'Spell geometry should not fall below the raised ground');
 e.dispose();
});
console.log(passed+' traversal checks passed.');

