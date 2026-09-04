import fs from 'node:fs';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export async function loadModel(path){
 const b=fs.readFileSync(path),length=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+length));
 for(const m of j.meshes)for(const p of m.primitives)delete p.material;j.materials=[];j.textures=[];j.images=[];
 const raw=Buffer.from(JSON.stringify(j)),pad=Buffer.alloc(Math.ceil(raw.length/4)*4,32);raw.copy(pad);
 const tail=b.subarray(20+length),out=Buffer.alloc(20+pad.length+tail.length);
 out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(pad.length,12);out.writeUInt32LE(0x4e4f534a,16);pad.copy(out,20);tail.copy(out,20+pad.length);
 return new GLTFLoader().parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength),'');
}
