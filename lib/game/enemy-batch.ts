import * as T from 'three';
import {toonMaterial} from './toon';
import type {EnemyUnit} from './enemies';
import {ENEMY_GEOMETRY} from './enemy-art';
// Every creature uses three shared geometry pools, including its animated details.
export class EnemyBatch{
 readonly mesh:T.InstancedMesh;
 readonly pools:Record<keyof typeof ENEMY_GEOMETRY,T.InstancedMesh>;
 private parts=new WeakMap<EnemyUnit,T.Mesh[]>();private color=new T.Color();private flashColor=new T.Color('#fff9df');
 constructor(parent:T.Group){
  this.pools=Object.fromEntries(Object.entries(ENEMY_GEOMETRY).map(([key,g])=>{
   const mesh=new T.InstancedMesh(g.clone(),toonMaterial('#ffffff'),6000);mesh.name='enemy-'+key;mesh.count=0;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);parent.add(mesh);return [key,mesh];
  })) as unknown as typeof this.pools;this.mesh=this.pools.round;
 }
 update(enemies:EnemyUnit[]){
  const counts={round:0,spike:0,block:0};
  for(const e of enemies){
   let parts=this.parts.get(e);
   if(!parts){parts=[];e.visual.traverse(o=>{if(o instanceof T.Mesh&&o.userData.enemyShape){parts!.push(o);o.visible=false;}});this.parts.set(e,parts);}
   e.mesh.updateMatrixWorld(true);
   for(const part of parts){
    const type=part.userData.enemyShape as keyof typeof this.pools,pool=this.pools[type],index=counts[type];if(index>=6000)continue;
    pool.setMatrixAt(index,part.matrixWorld);this.color.copy((part.material as T.MeshToonMaterial).color);if(e.flash>0)this.color.lerp(this.flashColor,.85);
    else if((part.material as T.MeshToonMaterial).userData.glow)this.color.lerp(e.enraged?new T.Color('#ff9b58'):this.flashColor,.23);
    pool.setColorAt(index,this.color);counts[type]++;
   }
  }
  for(const type of Object.keys(this.pools) as (keyof typeof this.pools)[]){const pool=this.pools[type];pool.count=counts[type];pool.instanceMatrix.needsUpdate=true;if(pool.instanceColor)pool.instanceColor.needsUpdate=true;}
 }
 clear(){Object.values(this.pools).forEach(p=>p.count=0);}
 dispose(){Object.values(this.pools).forEach(p=>{p.geometry.dispose();(p.material as T.Material).dispose();p.removeFromParent();});}
}
