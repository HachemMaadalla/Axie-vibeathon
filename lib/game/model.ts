import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';

export function createAxieActor(g:GLTF,height:number){
 const root=new T.Group(),normalizer=new T.Group(),model=clone(g.scene);
 normalizer.add(model);root.add(normalizer);
 const mixer=new T.AnimationMixer(model);
 const actions=new Map(g.animations.map(c=>[c.name,mixer.clipAction(c)]));
 actions.get('Idle')?.play();mixer.update(0);
 // Cloned bones initially have stale world matrices. Measuring before this
 // update produces centimeter-scale bounds and a 100x oversized character.
 root.updateMatrixWorld(true);
 model.traverse(o=>{if(o instanceof T.SkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
 const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 if(!Number.isFinite(size.y)||size.y<=0)throw Error('Invalid Axie model bounds');
 const scale=height/size.y;
 normalizer.scale.setScalar(scale);normalizer.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
 root.updateMatrixWorld(true);
 model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});
 return {root,mixer,actions,current:'Idle'};
}

