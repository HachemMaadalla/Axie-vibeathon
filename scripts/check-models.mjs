import fs from 'node:fs';import assert from 'node:assert/strict';import {createAxieActor} from '../lib/game/model.ts';import {clone} from 'three/addons/utils/SkeletonUtils.js';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
for(const name of ['pomodoro','bing','kotaro','sapidae']){
const b=fs.readFileSync('public/assets/axie/'+name+'.glb');const length=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+length).toString());for(const m of j.meshes)for(const p of m.primitives)delete p.material;
j.materials=[];j.textures=[];j.images=[];const raw=Buffer.from(JSON.stringify(j));const pad=Buffer.alloc(Math.ceil(raw.length/4)*4,32);raw.copy(pad);const tail=b.subarray(20+length);const out=Buffer.alloc(20+pad.length+tail.length);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(pad.length,12);out.writeUInt32LE(0x4e4f534a,16);pad.copy(out,20);tail.copy(out,20+pad.length);
const g=await new GLTFLoader().parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength),'');
const actor=createAxieActor(g,1.9);
for(const animation of ['Idle','Walk','Run']){
actor.mixer.stopAllAction();actor.actions.get(animation).reset().play();
for(let frame=0;frame<120;frame++){actor.mixer.update(1/30);actor.root.updateMatrixWorld(true);actor.root.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
const box=new T.Box3().setFromObject(actor.root),size=box.getSize(new T.Vector3());
assert(size.y>1&&size.y<3,name+' '+animation+' invalid height '+size.y);assert(Math.max(size.x,size.z)<4,name+' '+animation+' oversized');
}
console.log('PASS '+name+' '+animation+' stays within expected character bounds');
}
}
