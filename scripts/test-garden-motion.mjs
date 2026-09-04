import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import * as T from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e}}});
const {windMaterial,waterMaterial,setGardenMotionTime}=await import('../lib/game/garden-motion.ts');
const {GardenArt,createGardenTree,createGardenCrop}=await import('../lib/game/garden-art.ts');
const {batchTrees}=await import('../lib/game/environment.ts');
function compile(material){const shader={uniforms:{},vertexShader:'void main(){vec3 transformed=position; #include <begin_vertex> gl_Position=vec4(transformed,1.);}',fragmentShader:'void main(){}'};material.onBeforeCompile(shader);return shader;}
const leaves=windMaterial('#44aa55',.14),wind=compile(leaves);assert.match(wind.vertexShader,/sin\(motionPhase\)/);assert.equal(wind.uniforms.motionStrength.value,.14);assert.equal(leaves.side,T.DoubleSide);
const stream=waterMaterial('#44bbdd'),water=compile(stream),fall=waterMaterial('#55ccee',true),waterfall=compile(fall);assert.match(water.vertexShader,/motionTime/);assert.match(waterfall.vertexShader,/position\.y\*1\.4-motionTime\*5\.0/);assert.equal(stream.name,'animated-stream');assert.equal(fall.side,T.DoubleSide);
setGardenMotionTime(7);assert.equal(wind.uniforms.motionTime.value,7);assert.equal(water.uniforms.motionTime.value,7);setGardenMotionTime(12,true);assert.equal(wind.uniforms.motionTime.value,0);
console.log('PASS Wind and water shaders share time, use distinct waterfall flow, and honor reduced motion');
const parent=new T.Group(),art=new GardenArt(parent),foam=parent.getObjectByName('waterfall-foam'),smoke=parent.getObjectByName('cottage-smoke'),windborne=parent.getObjectByName('windborne-leaves');
assert.equal(foam.count,60);assert.equal(smoke.count,8);assert.equal(windborne.count,48);const before=foam.instanceMatrix.array.slice(),foamVersion=foam.instanceMatrix.version,leafVersion=windborne.instanceMatrix.version;art.update(2);assert.notDeepEqual([...foam.instanceMatrix.array],[...before]);assert.ok(foam.instanceMatrix.version>foamVersion);assert.ok(windborne.instanceMatrix.version>leafVersion);
const movingCloud=art.clouds?.[0]?.mesh??art.root.children.find(o=>o.position.y< -10);const cloudBefore=movingCloud.position.x;art.update(20);assert.notEqual(movingCloud.position.x,cloudBefore);const moved=movingCloud.position.x;art.update(99,true);assert.equal(movingCloud.position.x,art.clouds?.[0]?.x??movingCloud.position.x);assert.notEqual(moved,movingCloud.position.x);
console.log('PASS Foam, smoke, drifting clouds, and 48 airborne leaves update without growing their pools');
const world=new T.Group();world.add(createGardenTree(8,2,1),createGardenCrop('moonberry',2));batchTrees(world);let animated=0;world.traverse(o=>{if(o.isMesh&&o.material.userData.motionTime)animated++;});assert.ok(animated>=4);for(const o of world.children)if(o.material?.userData?.motionTime){const shader=compile(o.material);assert.match(shader.vertexShader,/motionPhase/);}
console.log('PASS Tree crowns and crop leaves retain wind animation after scenery batching');
