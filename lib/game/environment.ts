import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export type Surface='grass'|'soil'|'stone'|'wood'|'leaves'|'water'|'tile';
export {toonMaterial} from './toon';

export function batchTrees(world:T.Group){
 world.updateMatrixWorld(true);
 const inverse=world.matrixWorld.clone().invert(),groups=new Map<string,{material:T.Material;geometries:T.BufferGeometry[];cameraIgnore:boolean}>();
 for(const root of [...world.children]){
  if(!root.userData.batchable)continue;
  root.traverse(object=>{if(object instanceof T.Mesh&&!Array.isArray(object.material)){
   const geometry=(object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone()).applyMatrix4(inverse.clone().multiply(object.matrixWorld));
   const cameraIgnore=Boolean(object.userData.cameraIgnore);
   const matrix=inverse.clone().multiply(object.matrixWorld),key=object.material.uuid+':'+cameraIgnore+':'+Math.floor(matrix.elements[12]/32)+':'+Math.floor(matrix.elements[14]/32);
   const group:{material:T.Material;geometries:T.BufferGeometry[];cameraIgnore:boolean}=groups.get(key)??{material:object.material,geometries:[],cameraIgnore};group.geometries.push(geometry);groups.set(key,group);
   object.geometry.dispose();
  }});
  world.remove(root);
 }
 for(const {material,geometries,cameraIgnore} of groups.values()){
  const geometry=mergeGeometries(geometries,false);
  if(geometry){const mesh=new T.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.cameraIgnore=cameraIgnore;world.add(mesh);}
  geometries.forEach(g=>g.dispose());
 }
}

