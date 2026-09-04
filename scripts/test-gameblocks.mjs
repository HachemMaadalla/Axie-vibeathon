import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from 'three';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(e){if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return next(specifier+'.ts',context);throw e;}}});
const {makeLandscape}=await import('../lib/game/landscape.ts');
const {terrainHeight,dungeonTerrain,WORLD_RADIUS}=await import('../lib/game/terrain.ts');
const {NaturalTerrainSampler}=await import('../lib/gameblocks/modules/world/environment/TerrainSampler.js');
const {MovementMotor}=await import('../lib/game/movement.ts');
const {batchTrees}=await import('../lib/game/environment.ts');
const parent=new T.Group();const t=performance.now(),chunks=makeLandscape(parent);parent.updateMatrixWorld(true);
let passed=0;const check=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
check('GameBlocks builds one home-sized cel-shaded battle island',()=>{
 assert.ok(dungeonTerrain instanceof NaturalTerrainSampler);assert.equal(WORLD_RADIUS.dungeon,WORLD_RADIUS.farm);assert.equal(WORLD_RADIUS.dungeon,30);assert.equal(chunks.length,1);
 assert.ok(parent.getObjectByName('battle-island-surface'));assert.ok(parent.getObjectByName('battle-island-cliffs'));assert.equal(parent.getObjectByName('garden-cottage'),undefined);assert.equal(parent.getObjectByName('river-water'),undefined);
 let triangles=0;parent.traverse(o=>{if(o instanceof T.Mesh){assert.ok(o.material.isMeshToonMaterial||o.material.isMeshBasicMaterial);triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
 assert.ok(triangles<9000,'Triangle budget: '+triangles);console.log('  '+triangles+' triangles; generation '+Math.round(performance.now()-t)+' ms');
});
check('The grassy surface and floating cliffs share the same 30-unit silhouette',()=>{
 const surface=parent.getObjectByName('battle-island-surface'),cliffs=parent.getObjectByName('battle-island-cliffs');
 surface.geometry.computeBoundingBox();cliffs.geometry.computeBoundingBox();
 const groundSize=surface.geometry.boundingBox.getSize(new T.Vector3()),cliffSize=cliffs.geometry.boundingBox.getSize(new T.Vector3());
 assert.ok(groundSize.x>=58&&groundSize.x<=61);assert.ok(cliffSize.x>=58&&cliffSize.x<=62);assert.ok(Math.abs(groundSize.x-cliffSize.x)<3);
 const normal=surface.geometry.attributes.normal;for(let i=0;i<normal.count;i++)assert.ok(normal.getY(i)>=0);
});
check('Rendered triangles agree with character ground heights across the island',()=>{
 const ray=new T.Raycaster();
 for(let i=0;i<250;i++){
  const a=i*2.4,r=4+(i%94)/93*(WORLD_RADIUS.dungeon-5),x=Math.cos(a)*r,z=Math.sin(a)*r;
  ray.set(new T.Vector3(x,100,z),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(chunks,false)[0];
  assert.ok(hit);assert.ok(Math.abs(hit.point.y-terrainHeight('dungeon',x,z)-.02)<.00001);
 }
});
check('The movement motor can sprint and dash across the open center',()=>{
 const m=new MovementMotor(),p=new T.Vector3(-23,terrainHeight('dungeon',-23,0),0),dir=new T.Vector3(1,0,0);
 for(let i=0;i<720;i++){if(i===60)m.dash(dir);m.step(1/120,p,dir,9,true,WORLD_RADIUS.dungeon-2.5,(x,z)=>terrainHeight('dungeon',x,z));assert.ok(p.y>=terrainHeight('dungeon',p.x,p.z)-.00001);}
 assert.ok(p.x>23);assert.ok(m.grounded);
});
check('Natural rocks and meadow grass batch without losing geometry',()=>{
 let before=0;parent.traverse(o=>{if(o instanceof T.Mesh)before+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
 batchTrees(parent);let after=0;parent.traverse(o=>{if(o instanceof T.Mesh)after+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
 assert.equal(after,before);assert.equal(parent.getObjectByName('battle-island-rocks'),undefined);assert.equal(parent.getObjectByName('battle-meadow'),undefined);
});
parent.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();o.material.map?.dispose();o.material.dispose();}});
console.log(passed+' GameBlocks island checks passed.');
