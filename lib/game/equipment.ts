import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import type {createAxieActor} from './model';
import type {HeroId} from './state';
export const EQUIPMENT:Record<HeroId,{file:string;prefix:string;height:number}>={
 pomodoro:{file:'pomodoro-staff',prefix:'Staff',height:1.65},
 bing:{file:'bing-cannon',prefix:'Cannon',height:1.05},
 kotaro:{file:'kotaro-sword',prefix:'Sword',height:1.25},
 kibo:{file:'kibo-hammer',prefix:'Hammer',height:1.4},
 paladill:{file:'paladill-axe',prefix:'Hammer',height:1.45},
 tripp:{file:'tripp-sword',prefix:'Axe',height:1.25},
 xia:{file:'xia-axe',prefix:'Axe',height:1.4}
};
export function equipAxie(actor:ReturnType<typeof createAxieActor>,g:GLTF,id:HeroId){
 const spec=EQUIPMENT[id],idle=spec.prefix+'.Idle';
 if(actor.actions.has(idle)){actor.mixer.stopAllAction();actor.actions.get(idle)!.play();actor.current=idle;actor.mixer.update(0);}
 actor.root.updateMatrixWorld(true);
 const socket=actor.root.getObjectByName('Weapon_R_JNT')??actor.root.getObjectByName('Axe_R_JNT')??actor.root.getObjectByName('Hand_R_JNT');
 if(!socket)throw Error('Missing weapon socket: '+id);
 const weapon=clone(g.scene);weapon.updateMatrixWorld(true);
 weapon.traverse(o=>{if(o instanceof T.SkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
 const bounds=new T.Box3().setFromObject(weapon),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 if(!Number.isFinite(size.y)||size.y<=0)throw Error('Invalid equipment: '+id);
 const holder=new T.Group();holder.name='equipment-'+spec.file;
 // Calibrate in the supplied armed idle pose. Inherited centimeter-scale bones
 // must not make the weapon tiny or change the already-normalized Axie.
 const scale=socket.getWorldScale(new T.Vector3());holder.scale.set(1/scale.x,1/scale.y,1/scale.z);
 holder.quaternion.copy(socket.getWorldQuaternion(new T.Quaternion())).invert();
 const orientation=new T.Group();if(id==='bing')orientation.rotation.x=Math.PI/2;
 const fit=new T.Group(),factor=spec.height/size.y;fit.scale.setScalar(factor);
 fit.position.set(-center.x*factor,-(bounds.min.y+size.y*(id==='bing'?.3:.18))*factor,-center.z*factor);
 fit.add(weapon);orientation.add(fit);holder.add(orientation);socket.add(holder);
 weapon.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});
 actor.root.updateMatrixWorld(true);return holder;
}
export function equippedMotion(actor:ReturnType<typeof createAxieActor>,id:HeroId,moving:boolean){
 const suffix=moving?'Run':'Idle',armed=EQUIPMENT[id].prefix+'.'+suffix;
 return actor.actions?.has(armed)?armed:suffix;
}

