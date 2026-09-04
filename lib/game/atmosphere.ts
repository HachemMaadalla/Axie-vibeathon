import * as T from 'three';
import {toonMaterial} from './toon';
import {terrainHeight} from './terrain';
import {setGardenSeason} from './garden-motion';

const seasons=['Spring','Summer','Autumn','Winter'] as const;
export const seasonName=(day:number)=>seasons[Math.floor((day-1)/4)%4];
export class IslandAtmosphere{
 readonly root=new T.Group();
 private chickens:{body:T.Group;head:T.Group;x:number;z:number}[]=[];
 private butterflies:{body:T.Group;wings:T.Mesh[];phase:number}[]=[];
 private fireflies:T.InstancedMesh;private rotor=new T.Group();private matrix=new T.Matrix4();private quat=new T.Quaternion();private scarecrow?:T.Object3D;
 private night=new T.Color('#263d77');private morning=new T.Color('#8fd9f5');private dusk=new T.Color('#8983bd');
 private farm:T.Group;private arena:T.Group;
 constructor(farm:T.Group,arena:T.Group){
  this.farm=farm;this.arena=arena;this.root.name='farm-life';farm.add(this.root);this.scarecrow=farm.getObjectByName('scarecrow');
  const part=(p:T.Object3D,geometry:T.BufferGeometry,color:string,x:number,y:number,z:number,sx=1,sy=1,sz=1)=>{const m=new T.Mesh(geometry,toonMaterial(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.userData.cameraIgnore=true;p.add(m);return m;};
  for(let i=0;i<3;i++){
   const body=new T.Group(),head=new T.Group(),x=-17+i*1.4,z=8+i*.8;body.name='farm-chicken';this.root.add(body);body.add(head);head.position.set(0,.55,.3);
   part(body,new T.IcosahedronGeometry(.4,1),'#fff0c5',0,.42,0,1,.9,1.3);part(head,new T.IcosahedronGeometry(.22,1),'#fff6dd',0,0,0);
   part(head,new T.ConeGeometry(.1,.23,4),'#eda33f',0,-.04,.24).rotation.x=Math.PI/2;
   part(head,new T.SphereGeometry(.09,6,4),'#ee6453',0,.21,0,1,1.7,.7);
   for(const side of [-1,1]){part(body,new T.CylinderGeometry(.025,.035,.25,5),'#ce8733',side*.14,.12,.03);part(head,new T.SphereGeometry(.035,5,4),'#293738',side*.17,.03,.14);}
   this.chickens.push({body,head,x,z});
  }
  for(let i=0;i<12;i++){
   const body=new T.Group(),wings:T.Mesh[]=[];body.name='butterfly';this.root.add(body);
   part(body,new T.CapsuleGeometry(.025,.16,2,4),'#473b58',0,0,0).rotation.x=Math.PI/2;
   for(const side of [-1,1]){const wing=part(body,new T.CircleGeometry(.18,7),['#ffce61','#f095c4','#76d6ed'][i%3],side*.13,0,0,1,1.3,1);(wing.material as T.MeshToonMaterial).side=T.DoubleSide;wings.push(wing);}
   this.butterflies.push({body,wings,phase:i*2.4});
  }
  this.fireflies=new T.InstancedMesh(new T.SphereGeometry(.045,5,4),new T.MeshBasicMaterial({color:'#f2ff95',transparent:true,depthWrite:false}),48);this.fireflies.name='farm-fireflies';this.fireflies.frustumCulled=false;this.root.add(this.fireflies);
  const mill=new T.Group();mill.name='farm-windmill';mill.position.set(-17,terrainHeight('farm',-17,-4),-4);this.root.add(mill);
  const tower=part(mill,new T.CylinderGeometry(.55,.85,4,8),'#e1bd80',0,2,0);tower.userData.solid=true;tower.userData.cameraIgnore=false;
  part(mill,new T.ConeGeometry(1.05,1.1,6),'#cc6942',0,4.4,0);this.rotor.position.set(0,3.4,.8);mill.add(this.rotor);
  for(let i=0;i<4;i++){const blade=new T.Group();blade.rotation.z=i*Math.PI/2;this.rotor.add(blade);part(blade,new T.BoxGeometry(.12,2.1,.1),'#775638',0,1,0);part(blade,new T.BoxGeometry(.55,1.1,.07),'#ffe8a4',.2,1.5,0);}
  part(this.rotor,new T.SphereGeometry(.16,7,5),'#b18549',0,0,.1);
 }
 update(time:number,day:number,mode:'farm'|'dungeon',tier:number,reduced:boolean,scene:T.Scene,sun:T.DirectionalLight,improved=false){
  const cycle=(Math.sin(time/240*Math.PI*2+.9)+1)/2,night=1-T.MathUtils.smoothstep(cycle,.2,.65),isFarm=mode==='farm';
  const sky=isFarm?this.morning.clone().lerp(this.night,night):tier===1?this.morning:this.dusk;
  (scene.background as T.Color).lerp(sky,.03);
  if(scene.fog instanceof T.Fog){scene.fog.color.copy(scene.background as T.Color);scene.fog.near=isFarm?85:tier===1?45:36;scene.fog.far=isFarm?210:tier===1?85:72;}
  sun.intensity=T.MathUtils.lerp(sun.intensity,isFarm?2.8-night*1.7:tier===1?2.8:1.7,.025);
  sun.color.lerp(new T.Color(isFarm?night>.5?'#b5c9ff':'#fff0cc':tier===1?'#fff0cc':'#d8baff'),.025);
  const surface=this.arena.getObjectByName('battle-island-surface') as T.Mesh|undefined;if(surface)(surface.material as T.MeshToonMaterial).color.set(tier===1?'#ffffff':'#ccb1ed');
  setGardenSeason(Math.floor((day-1)/4)%4);
  this.rotor.rotation.z=reduced?0:time*.5;
  if(this.scarecrow)this.scarecrow.rotation.z=reduced?0:Math.sin(time*1.7)*.025;
  for(const [i,c] of this.chickens.entries()){
   const a=reduced?i:time*.16+i*2,cx=c.x+Math.sin(a)*1.1,cz=c.z+Math.cos(a*.8)*.6;
   c.body.position.set(cx,terrainHeight('farm',cx,cz),cz);c.body.rotation.y=reduced?0:Math.cos(a)*.7;c.head.rotation.x=reduced?0:Math.max(0,Math.sin(time*2+i))*.6;
  }
  for(const b of this.butterflies){
   const a=(reduced?0:time*.27)+b.phase,x=Math.cos(b.phase)*18+Math.sin(a)*1.2,z=Math.sin(b.phase)*18+Math.cos(a)*1.1;
   b.body.position.set(x,terrainHeight('farm',x,z)+1.6+Math.sin(a*2)*.4,z);b.body.visible=night<.7;
   b.wings.forEach((w,i)=>w.rotation.y=reduced?0:Math.sin(time*14+b.phase)*(i?1:-1)*.85);
  }
  (this.fireflies.material as T.MeshBasicMaterial).opacity=night*.8;this.fireflies.count=improved?48:32;
  for(let i=0;i<this.fireflies.count;i++){const a=i*2.4,t=reduced?0:time,x=Math.cos(a)*(12+i%8)+Math.sin(t*.4+a),z=Math.sin(a)*(12+i%8)+Math.cos(t*.3+a);this.matrix.compose(new T.Vector3(x,terrainHeight('farm',x,z)+1.4+Math.sin(t+i)*.6,z),this.quat,new T.Vector3().setScalar(.7+(Math.sin(t*2+i)+1)*.35));this.fireflies.setMatrixAt(i,this.matrix);}
  this.fireflies.instanceMatrix.needsUpdate=true;
 }
}
