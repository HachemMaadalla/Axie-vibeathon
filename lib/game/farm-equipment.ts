import * as T from 'three';
import {toonMaterial} from './toon';
import {CROPS} from './state';
import {FARM_SLOTS,isSeed,type FarmItem} from './farm-tools';
type Actor={root:T.Group};
function buildTool(item:FarmItem){
 const root=new T.Group();root.name='farm-item-'+item;
 const material=new Map<string,T.Material>();
 const add=(g:T.BufferGeometry,color:string,x=0,y=0,z=0)=>{
  if(!material.has(color))material.set(color,toonMaterial(color));
  const m=new T.Mesh(g,material.get(color)!);m.position.set(x,y,z);m.castShadow=true;root.add(m);return m;
 };
 const box=(c:string,x:number,y:number,z:number,w:number,h:number,d:number)=>add(new T.BoxGeometry(w,h,d),c,x,y,z);
 if(item==='water'){
  add(new T.CylinderGeometry(.29,.25,.46,12),'#39b9d0',0,-.32,.12);
  add(new T.TorusGeometry(.22,.045,6,16),'#155b79',0,.04,.12);
  add(new T.CylinderGeometry(.3,.3,.055,12),'#a0edeb',0,-.08,.12);
  const spout=add(new T.CylinderGeometry(.065,.1,.52,8),'#39b9d0',0,-.18,.49);spout.rotation.x=Math.PI/2-.36;
  const rose=add(new T.CylinderGeometry(.14,.12,.07,10),'#e5f5c7',0,-.085,.73);rose.rotation.x=Math.PI/2-.36;
  for(let i=0;i<5;i++){const a=i*1.256;add(new T.SphereGeometry(.013,5,3),'#285563',Math.cos(a)*.07,-.07+Math.sin(a)*.07,.77);}
  box('#aceeee',-.08,-.27,.371,.035,.21,.02);
 }else if(item==='sickle'){
  add(new T.CylinderGeometry(.05,.065,.65,8),'#a86c3d',0,.13,0);
  for(let i=0;i<4;i++)add(new T.TorusGeometry(.057,.015,4,8),'#f2c886',0,-.1+i*.055,0).rotation.x=Math.PI/2;
  const blade=new T.Shape();blade.moveTo(0,.42);blade.bezierCurveTo(.15,1.04,.84,.92,.7,.38);blade.bezierCurveTo(.77,.72,.29,.79,.2,.37);blade.closePath();
  const edge=add(new T.ExtrudeGeometry(blade,{depth:.055,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:1,steps:1,curveSegments:14}),'#244956',0,0,-.03);
  const shine=add(new T.ExtrudeGeometry(blade,{depth:.06,bevelEnabled:false,curveSegments:14}),'#d8f5df',.017,.027,-.036);shine.scale.set(.92,.94,1);
  box('#f5c66c',0,.36,0,.18,.12,.12);
 }else if(item==='fertilizer'){
  add(new T.CylinderGeometry(.2,.23,.42,10),'#5bd6a7',0,-.23,.04);
  add(new T.CylinderGeometry(.09,.12,.22,8),'#b9eee2',0,.07,.04);
  add(new T.CylinderGeometry(.105,.105,.07,8),'#a47545',0,.21,.04);
  box('#f5e9b5',0,-.21,.248,.23,.2,.02);
 }else{
  const c=isSeed(item)?CROPS[item].color:'#ba9264';
  const bag=add(new T.SphereGeometry(1,12,8),'#dab379',0,-.2,.02);bag.scale.set(.26,.36,.19);
  add(new T.CylinderGeometry(.13,.2,.13,8),'#996645',0,.1,.02);
  box(c,0,-.2,.205,.3,.31,.025);
  const leaf=add(new T.SphereGeometry(1,8,6),'#398356',.025,-.16,.235);leaf.scale.set(.075,.13,.025);leaf.rotation.z=-.55;
  box('#285941',-.025,-.24,.24,.018,.15,.02);
 }
 return root;
}
export function setFarmEquipment(actor:Actor,item:FarmItem|null){
 const weapon=findWeapon(actor.root);
 if(!weapon)return;
 weapon.visible=item===null;
 let rack=actor.root.getObjectByName('farm-tools') as T.Group|undefined;
 if(!rack&&item){
  rack=new T.Group();rack.name='farm-tools';rack.position.copy(weapon.position);rack.scale.copy(weapon.scale);rack.quaternion.copy(weapon.quaternion);
  for(const id of FARM_SLOTS)rack.add(buildTool(id));
  weapon.parent!.add(rack);
 }
 if(!rack)return;
 rack.visible=item!==null;rack.userData.item=item;rack.userData.age=1;
 for(const child of rack.children){child.visible=child.name==='farm-item-'+item;child.rotation.set(0,0,0);}
}
function findWeapon(root:T.Object3D){let found:T.Object3D|undefined;root.traverse(o=>{if(o.name.startsWith('equipment-'))found=o;});return found;}
export function useFarmEquipment(actor:Actor|undefined){const rack=actor?.root.getObjectByName('farm-tools');if(rack)rack.userData.age=0;}
export function updateFarmEquipment(actor:Actor|undefined,dt:number){
 const rack=actor?.root.getObjectByName('farm-tools');if(!rack?.visible)return;
 const age=rack.userData.age=Math.min(1,(rack.userData.age??1)+dt*2.3),swing=Math.sin(age*Math.PI);
 const item=rack.children.find(o=>o.visible);if(!item)return;
 item.rotation.x=rack.userData.item==='water'?swing*.7:swing*.25;
 item.rotation.y=rack.userData.item==='sickle'?-swing*1.1:0;
 item.rotation.z=rack.userData.item==='sickle'?-swing*.45:0;
}
