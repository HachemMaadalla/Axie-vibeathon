import * as T from 'three';
import {toonMaterial} from './toon';
import type {EnemyUnit} from './enemies';
// Animated cube parts share one draw call; non-cube robes and wings keep their geometry.
export class EnemyBatch{
 readonly mesh:T.InstancedMesh;
 private parts=new WeakMap<EnemyUnit,T.Mesh[]>();
 private color=new T.Color();
 constructor(parent:T.Group){
  this.mesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),toonMaterial('#ffffff'),4000);
  this.mesh.name='enemy-parts';this.mesh.count=0;this.mesh.castShadow=true;this.mesh.receiveShadow=true;this.mesh.frustumCulled=false;this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);parent.add(this.mesh);
 }
 update(enemies:EnemyUnit[]){
  let index=0;
  for(const e of enemies){
   let parts=this.parts.get(e);
   if(!parts){parts=[];e.visual.traverse(o=>{if(o instanceof T.Mesh&&o.geometry instanceof T.BoxGeometry){parts!.push(o);o.visible=false;}});this.parts.set(e,parts);}
   e.mesh.updateMatrixWorld(true);
   for(const part of parts){
    if(index>=4000)break;
    this.mesh.setMatrixAt(index,part.matrixWorld);
    const material=part.material as T.MeshToonMaterial;this.color.copy(material.color);
    if(e.flash>0)this.color.lerp(new T.Color('#fff9df'),.85);
    this.mesh.setColorAt(index,this.color);index++;
   }
  }
  this.mesh.count=index;this.mesh.instanceMatrix.needsUpdate=true;if(this.mesh.instanceColor)this.mesh.instanceColor.needsUpdate=true;
 }
 clear(){this.mesh.count=0;}
 dispose(){this.mesh.geometry.dispose();(this.mesh.material as T.Material).dispose();this.mesh.removeFromParent();}
}

