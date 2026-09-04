import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {TILE} from './terrain';
export type PixelSurface='grass'|'soil'|'stone'|'wood'|'leaves'|'water'|'tile';
export function pixelMaterial(color:string,surface:PixelSurface='stone'){
 const size=16,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const noise=((x*37+y*61+(x*y)*13)%101)/100;
  let shade=noise>.8?1:noise<.2?.72:.88;
  if(surface==='grass'||surface==='leaves')shade=((Math.floor(x/2)*17+Math.floor(y/2)*29)%11)<3?.7:noise>.72?1:.88;
  if(surface==='soil')shade=y%4===0?.68:noise>.86?1:.85;
  if(surface==='wood')shade=x%5===0?.58:(x+y*3)%13===0?.73:.96;
  if(surface==='water')shade=y%5===0&&x%8<5?1:noise>.75?.85:.72;
  if(surface==='tile')shade=y%8===0||(x+(Math.floor(y/8)%2)*8)%16===0?.61:noise>.85?1:.9;
  const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=Math.round(shade*255);data[i+3]=255;
 }
 const map=new T.DataTexture(data,size,size);map.colorSpace=T.SRGBColorSpace;
 map.magFilter=T.NearestFilter;map.minFilter=T.NearestFilter;map.generateMipmaps=false;
 map.wrapS=map.wrapT=T.RepeatWrapping;map.needsUpdate=true;
 return new T.MeshStandardMaterial({color,map,roughness:1,flatShading:true});
}

export function voxelIsland(parent:T.Group,radius:number,grass:T.Material,earth:T.Material,stone:T.Material,height:(x:number,z:number)=>number=()=>0){
 const step=TILE,cells:{x:number;z:number;depth:number}[]=[];
 for(let x=-radius;x<=radius;x+=step)for(let z=-radius;z<=radius;z+=step){
  if(x*x+z*z>(radius+.25)**2)continue;
  const edge=Math.sqrt(x*x+z*z)>radius-2;
  cells.push({x,z,depth:edge?1.5+((Math.round((x+radius)/step)*7+Math.round((z+radius)/step)*3)%4)*.35:2.1});
 }
 const geo=new T.BoxGeometry(1,1,1),top=new T.InstancedMesh(geo,grass,cells.length),dirt=new T.InstancedMesh(geo,earth,cells.length),base=new T.InstancedMesh(geo,stone,cells.length);
 top.name='terrain-surface';
 const m=new T.Matrix4(),q=new T.Quaternion(),tint=new T.Color();
 cells.forEach((c,i)=>{
  m.compose(new T.Vector3(c.x,height(c.x,c.z)-.105,c.z),q,new T.Vector3(step,.25,step));top.setMatrixAt(i,m);
  tint.setScalar(.86+(i*17%13)/100);top.setColorAt(i,tint);
  m.compose(new T.Vector3(c.x,(height(c.x,c.z)-.46-c.depth)/2,c.z),q,new T.Vector3(step,height(c.x,c.z)+c.depth,step));dirt.setMatrixAt(i,m);
  m.compose(new T.Vector3(c.x,-.23-c.depth-.2,c.z),q,new T.Vector3(step,.4,step));base.setMatrixAt(i,m);
 });
 for(const mesh of [top,dirt,base]){mesh.receiveShadow=true;mesh.castShadow=true;mesh.userData.cameraIgnore=true;mesh.instanceMatrix.needsUpdate=true;parent.add(mesh);}
 return {top,dirt,base};
}


export function batchTrees(world:T.Group){
 world.updateMatrixWorld(true);
 const inverse=world.matrixWorld.clone().invert(),groups=new Map<string,{material:T.Material;geometries:T.BufferGeometry[]}>();
 for(const root of [...world.children]){
  if(!root.userData.voxelTree)continue;
  root.traverse(object=>{if(object instanceof T.Mesh&&!Array.isArray(object.material)){
   const geometry=object.geometry.clone().applyMatrix4(inverse.clone().multiply(object.matrixWorld));
   const matrix=inverse.clone().multiply(object.matrixWorld),key=object.material.uuid+':'+Math.floor(matrix.elements[12]/32)+':'+Math.floor(matrix.elements[14]/32);
   const group:{material:T.Material;geometries:T.BufferGeometry[]}=groups.get(key)??{material:object.material,geometries:[]};group.geometries.push(geometry);groups.set(key,group);
   object.geometry.dispose();
  }});
  world.remove(root);
 }
 for(const {material,geometries} of groups.values()){
  const geometry=mergeGeometries(geometries,false);
  if(geometry){const mesh=new T.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;world.add(mesh);}
  geometries.forEach(g=>g.dispose());
 }
}

