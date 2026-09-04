import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from 'three';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(e){if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return next(specifier+'.ts',context);throw e;}}});
const {CartoonRenderer,toonify}=await import('../lib/game/toon.ts');
const {WildseedGame}=await import('../lib/game/scene.ts');
const {batchTrees}=await import('../lib/game/environment.ts');
const {terrainHeight}=await import('../lib/game/terrain.ts');
let checks=0;const check=(name,f)=>{f();checks++;console.log('PASS '+name);};
check('Cel shading preserves character textures, transparency, and geometry',()=>{
 const root=new T.Group(),map=new T.Texture(),material=new T.MeshStandardMaterial({color:'#eeaacc',map,transparent:true,opacity:.8});
 const mesh=new T.SkinnedMesh(new T.BoxGeometry(),material);root.add(mesh);const geometry=mesh.geometry,skeleton=mesh.skeleton;
 toonify(root);assert.ok(mesh.material.isMeshToonMaterial);assert.equal(mesh.material.map,map);assert.equal(mesh.material.opacity,.8);assert.equal(mesh.geometry,geometry);assert.equal(mesh.skeleton,skeleton);
 assert.equal(mesh.material.gradientMap.image.width,3);
 geometry.dispose();material.dispose();mesh.material.dispose();map.dispose();
});
check('Outline rendering resizes color and depth buffers and restores the caller target',()=>{
 let target=null;const passes=[];
 const renderer={getPixelRatio:()=>1.5,getRenderTarget:()=>target,setRenderTarget:t=>target=t,render:(s,c)=>passes.push({s,c,target})};
 const effect=new CartoonRenderer(renderer);effect.resize(800,600);assert.equal(effect.target.width,1200);assert.equal(effect.target.height,900);assert.ok(effect.target.depthTexture);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(60,4/3,.1,250);effect.render(scene,camera);
 assert.equal(passes.length,2);assert.equal(passes[0].target,effect.target);assert.equal(passes[0].s,scene);assert.equal(passes[1].target,null);assert.equal(target,null);
 renderer.render=()=>{throw Error('interrupted');};assert.throws(()=>effect.render(scene,camera));assert.equal(target,null);effect.dispose();
});
check('Complete farm and dungeon scenery assemble and batch with no pixel materials',()=>{
 const game=Object.assign(Object.create(WildseedGame.prototype),{farmWorld:new T.Group(),arena:new T.Group(),plots:[],plants:[],materialCache:new Map(),treeMats:new Map(),toonCache:new Map(),sharedSphere:new T.SphereGeometry(1,16,10)});
 game.makeFarm();game.makeArena();game.expandWorld(game.farmWorld,'farm');game.expandWorld(game.arena,'dungeon');
 batchTrees(game.farmWorld);batchTrees(game.arena);
 let triangles=0,meshes=0;const geos=new Set(),materials=new Set();
 for(const world of [game.farmWorld,game.arena])world.traverse(o=>{if(o instanceof T.Mesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);assert.ok(m.isMeshToonMaterial||m.isMeshBasicMaterial);assert.equal(m.map,null);}}});
 assert.ok(meshes>100);assert.ok(triangles<1500000,'Geometry budget: '+triangles);
 const surface=game.farmWorld.getObjectByName('terrain-surface');game.farmWorld.updateMatrixWorld(true);const ray=new T.Raycaster();
 for(let i=0;i<50;i++){const a=i*2.4,r=i%28,x=Math.cos(a)*r,z=Math.sin(a)*r;ray.set(new T.Vector3(x,50,z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(surface)[0];assert.ok(hit);assert.ok(Math.abs(hit.point.y-terrainHeight('farm',x,z)-.02)<.00001);}
 console.log('  '+meshes+' scenery meshes, '+Math.round(triangles)+' triangles');geos.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
});
console.log(checks+' cartoon integration checks passed. GPU appearance has not been visually tested.');

