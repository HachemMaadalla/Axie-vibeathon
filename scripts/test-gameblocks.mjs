import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from 'three';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(e){if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return next(specifier+'.ts',context);throw e;}}});
const {makeLandscape}=await import('../lib/game/landscape.ts');
const {terrainHeight,dungeonTerrain,terrainRoads,WORLD_RADIUS,BRIDGES,riverX}=await import('../lib/game/terrain.ts');
const {NaturalTerrainSampler}=await import('../lib/gameblocks/modules/world/environment/TerrainSampler.js');
const {MovementMotor}=await import('../lib/game/movement.ts');
const {batchTrees}=await import('../lib/game/environment.ts');
const parent=new T.Group();const t=performance.now(),chunks=makeLandscape(parent);parent.updateMatrixWorld(true);
let passed=0;const check=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
check('Live terrain uses GameBlocks samplers and world-aligned textured meshes',()=>{
 assert.ok(dungeonTerrain instanceof NaturalTerrainSampler);
 assert.equal(terrainRoads.distanceToRoad(0,0),0);
 assert.ok(chunks.length>100&&chunks.length<300);
 let triangles=0;
 for(const c of chunks){assert.ok(c.geometry.attributes.uv);assert.equal(c.material.map.magFilter,T.NearestFilter);assert.ok(c.material.flatShading);triangles+=c.geometry.index.count/3;}
 assert.ok(triangles<65000,'Triangle budget: '+triangles);
 assert.ok(parent.getObjectByName('river-water'));assert.ok(parent.getObjectByName('coastal-water'));assert.ok(parent.getObjectByName('gameblocks-rocks').children.length>200);
 console.log('  '+chunks.length+' chunks, '+triangles+' triangles; generation '+Math.round(performance.now()-t)+' ms');
});
check('Neighboring chunks share identical heights and upward-facing triangles',()=>{
 const heights=new Map();let shared=0;
 for(const c of chunks){
  const pos=c.geometry.attributes.position,normal=c.geometry.attributes.normal;
  for(let i=0;i<pos.count;i++){
   const key=pos.getX(i)+':'+pos.getZ(i),y=pos.getY(i);
   if(heights.has(key)){assert.equal(y,heights.get(key));shared++;}else heights.set(key,y);
   assert.ok(normal.getY(i)>=0);
  }
 }
 assert.ok(shared>1000);
});
check('Rendered triangles agree with character ground heights across slopes and chunk borders',()=>{
 const ray=new T.Raycaster();
 for(let i=0;i<250;i++){
  const a=i*2.4,r=5+(i%94)*2,x=Math.cos(a)*r,z=Math.sin(a)*r;
  ray.set(new T.Vector3(x,100,z),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(chunks,false)[0];
  assert.ok(hit);assert.ok(Math.abs(hit.point.y-terrainHeight('dungeon',x,z)-.02)<.00001);
 }
});
check('The movement motor can sprint and dash across every river bridge',()=>{
 for(const z of BRIDGES){
  const m=new MovementMotor(),x=riverX(z),p=new T.Vector3(x-20,terrainHeight('dungeon',x-20,z),z),dir=new T.Vector3(1,0,0);
  for(let i=0;i<360;i++){if(i===60)m.dash(dir);m.step(1/120,p,dir,9,true,WORLD_RADIUS.dungeon-2.5,(x,z)=>terrainHeight('dungeon',x,z));assert.ok(p.y>=terrainHeight('dungeon',p.x,p.z)-.00001);}
  assert.ok(p.x>x+18,'Crossing failed at '+z);assert.ok(m.grounded);
 }
});
check('GameBlocks rocks and vegetation batch without losing geometry',()=>{
 let before=0;parent.traverse(o=>{if(o instanceof T.Mesh)before+=o.geometry.attributes.position.count;});
 batchTrees(parent);let after=0;parent.traverse(o=>{if(o instanceof T.Mesh)after+=o.geometry.attributes.position.count;});
 assert.equal(after,before);assert.equal(parent.getObjectByName('gameblocks-rocks'),undefined);
});
parent.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();o.material.map?.dispose();o.material.dispose();}});
console.log(passed+' GameBlocks integration checks passed.');

