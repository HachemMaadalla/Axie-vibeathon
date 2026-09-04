import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e;}}});
const {SpellVisuals,SPELL_COLORS,inkMaterial}=await import('../lib/game/spell-visuals.ts');
const {SpellEngine}=await import('../lib/game/spell-engine.ts');
const {CombatFX}=await import('../lib/game/combat-fx.ts');
const visuals=new SpellVisuals();
for(const evolved of [false,true])for(const create of ['thorn','petal','meteor','mushroom','puff']){
 const mesh=visuals[create](evolved);
 assert.ok(mesh.material.isMeshToonMaterial&&mesh.material.vertexColors,create);
 assert.equal(mesh.material.blending,T.NormalBlending);
 assert.ok(mesh.geometry.getAttribute('color'));
 assert.equal(mesh.children[0].material.side,T.BackSide);
 assert.equal(mesh.children[0].material.depthTest,true);
 assert.ok(mesh.geometry.boundingSphere.radius>0);
 visuals.release(mesh);
}
console.log('PASS Every spell model uses colored cel-shaded geometry and a depth-tested ink hull');
const height=(x,z)=>x*.35+Math.sin(z*.7);
const point=new T.Vector3(4,height(4,3),3),ring=visuals.ring(point,3,SPELL_COLORS.spore.evolved,height),positions=ring.geometry.getAttribute('position');
for(let i=0;i<positions.count;i++){
 const clearance=positions.getY(i)+point.y-height(point.x+positions.getX(i),point.z+positions.getZ(i));
 assert.ok(clearance>.098&&clearance<.115,'Boundary follows terrain at every vertex');
}
let ringDisposed=0;ring.geometry.addEventListener('dispose',()=>ringDisposed++);visuals.release(ring);assert.equal(ringDisposed,1);
console.log('PASS Ground boundaries conform to slopes and release their unique geometry');
const one=visuals.thorn(false),two=visuals.thorn(false);assert.equal(one.geometry,two.geometry);let cachedDisposed=0;two.geometry.addEventListener('dispose',()=>cachedDisposed++);visuals.release(one);assert.equal(cachedDisposed,0);
const material=inkMaterial(.04),shader={uniforms:{},vertexShader:'#include <begin_vertex>'};material.onBeforeCompile(shader,{});assert.ok(shader.vertexShader.includes('normalize(normal)'));assert.ok(!shader.vertexShader.includes('objectNormal'));assert.equal(shader.uniforms.inkWidth.value,.04);material.dispose();
visuals.release(two);visuals.dispose();assert.equal(cachedDisposed,1);
console.log('PASS Shared models survive individual effect cleanup; hull shader uses an available vertex normal');
const scene=new T.Scene(),fx=new CombatFX(scene),engine=new SpellEngine(scene,{fx,height});
const target={mesh:new T.Group(),hp:100000,boss:false};target.mesh.position.set(2,height(2,0),0);
const build={items:{thorn:3,petal:3,spore:3,storm:3,ember:3,echo:3},evolved:['thorn','petal','spore','storm','ember']};
let transient=0,released=0;const seen=new Set();
for(let i=0;i<600;i++){
 engine.update(1/60,new T.Vector3(),build,18,[target],()=>{});fx.update(1/60);
 scene.traverse(o=>{if(o.userData.transientGeometry&&!seen.has(o.geometry)){seen.add(o.geometry);transient++;o.geometry.addEventListener('dispose',()=>released++);}if(o.isMesh)assert.notEqual(o.material.blending,T.AdditiveBlending);});
 assert.ok(scene.children[0].children[0].count<=600);
}
engine.clear();fx.clear();assert.equal(released,transient);assert.equal(fx.root.children[0].children[0].count,0);engine.dispose();fx.dispose();assert.equal(scene.children.length,0);
console.log('PASS Full evolved VFX load remains bounded, avoids additive glow, and releases temporary geometry');

