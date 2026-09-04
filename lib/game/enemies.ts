import * as T from 'three';
import {toonMaterial} from './toon';
import {HealthBar} from './health-bar';
export type EnemyKind='beetle'|'stalker'|'shaman'|'moth'|'guardian';
export const ENEMY_INFO={
 beetle:{name:'Bramble Scarab',color:'#df9963',hp:40,speed:3.5,radius:.95,aim:.85,xp:1},
 stalker:{name:'Root Reaver',color:'#93b978',hp:29,speed:4.7,radius:.7,aim:1,xp:1},
 shaman:{name:'Spore Hexer',color:'#b79de5',hp:35,speed:3,radius:.75,aim:1.1,xp:2},
 moth:{name:'Lantern Moth',color:'#76d6da',hp:18,speed:5.8,radius:.85,aim:.6,xp:1},
 guardian:{name:'Elder Thornwarden',color:'#d1b875',hp:720,speed:3.6,radius:2,aim:2.3,xp:12}
} as const;
export type EnemyUnit={
 mesh:T.Group;visual:T.Group;kind:EnemyKind;hp:number;max:number;speed:number;boss:boolean;bar:HealthBar;
 phase:number;state:'seek'|'windup'|'attack'|'recover';timer:number;cooldown:number;heading:T.Vector3;push:T.Vector3;
 flash:number;stagger:number;rig:{legs:T.Group[];arms:T.Group[];wings:T.Group[];head:T.Group;body:T.Group;materials:T.MeshToonMaterial[]};
 radius:number;aimHeight:number;xpValue:number;spawnAge:number;
};
export type EnemyEvents={
 telegraph:(point:T.Vector3,radius:number,duration:number)=>void;
 projectile:(from:T.Vector3,to:T.Vector3)=>void;
 slam:(point:T.Vector3,radius:number)=>void;
 damage:(amount:number,origin:T.Vector3)=>void;
};
export function enemyKindFor(time:number,index:number):EnemyKind{
 const pattern:EnemyKind[]=time<12?['stalker','beetle','stalker','moth']:['stalker','beetle','moth','shaman','stalker','beetle','shaman'];
 return pattern[index%pattern.length];
}
export function makeEnemy(kind:EnemyKind,tier=1,phase=0):EnemyUnit{
 const info=ENEMY_INFO[kind],mesh=new T.Group(),visual=new T.Group();mesh.name=info.name;mesh.add(visual);
 const materials=new Map<string,T.MeshToonMaterial>(),geometry=new T.BoxGeometry(1,1,1);
 const mat=(color:string,glow=false)=>{const key=color+glow;let m=materials.get(key);if(!m){m=toonMaterial(color);m.emissive.set(glow?color:'#000000');m.emissiveIntensity=glow?.65:0;m.userData.glow=glow;materials.set(key,m);}return m;};
 const box=(p:T.Object3D,c:string,x:number,y:number,z:number,w:number,h:number,d:number,glow=false)=>{const o=new T.Mesh(geometry,mat(c,glow));o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;};
 const pivot=(p:T.Object3D,x:number,y:number,z:number)=>{const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;};
 const body=pivot(visual,0,0,0),head=pivot(body,0,0,0),legs:T.Group[]=[],arms:T.Group[]=[],wings:T.Group[]=[];
 const eye=(p:T.Object3D,x:number,y:number,z:number,w=.15)=>{box(p,'#243239',x,y,z,w*1.6,w*1.5,.08);box(p,'#fff3b0',x,y,z+.05,w,w*.7,.07,true);};
 if(kind==='beetle'){
  box(body,'#593e35',0,.58,0,1.45,.64,1.85);
  for(const side of [-1,1]){const shell=box(body,side<0?'#ca783f':'#e3a65b',side*.38,1,0,.76,.6,1.65);shell.rotation.z=side*-.15;
   for(let i=0;i<3;i++){const leg=pivot(body,side*.65,.48,(i-1)*.6);box(leg,'#614744',side*.32,0,.05,.7,.17,.18).rotation.z=side*-.35;box(leg,'#d2b68d',side*.62,-.23,.1,.14,.48,.14);legs.push(leg);}
   const claw=pivot(head,side*.4,.48,1);box(claw,'#ead7a3',side*.12,0,.25,.18,.18,.8).rotation.y=side*-.4;arms.push(claw);
   eye(head,side*.29,.7,.98);
  }
  box(body,'#f6d380',0,1.35,-.4,.2,.55,.24);box(head,'#6c5549',0,.68,.93,.87,.47,.55);
  eye(head,-.25,.75,1.24);eye(head,.25,.75,1.24);
 }else if(kind==='stalker'||kind==='guardian'){
  const boss=kind==='guardian',scale=boss?2.15:1;
  visual.scale.setScalar(scale);
  box(body,boss?'#5a5145':'#647e51',0,1.08,0,.88,1.15,.65);
  box(body,'#3e5849',0,1.03,.37,.65,.76,.12);box(body,boss?'#f4c467':'#adee9e',0,1.15,.46,.3,.4,.1,true);
  for(const side of [-1,1]){
   const leg=pivot(body,side*.29,.61,0);box(leg,'#544838',0,-.28,0,.24,.62,.3);box(leg,'#8d9a69',0,-.53,.16,.4,.2,.6);legs.push(leg);
   const arm=pivot(body,side*.57,1.48,0);box(arm,boss?'#8d8c68':'#8eac68',side*.11,-.17,0,.34,.52,.4);box(arm,'#5b493b',side*.2,-.62,.12,.22,.68,.25);
   for(let c=0;c<3;c++)box(arm,'#e3d6ad',side*.19+(c-1)*.12,-1,.3,.08,.3,.3).rotation.x=-.4;
   arms.push(arm);
  }
  head.position.y=1.65;box(head,'#a2a570',0,.22,0,.82,.56,.7);box(head,'#465440',0,.14,.38,.6,.26,.12);
  eye(head,-.2,.23,.46);eye(head,.2,.23,.46);
  for(const side of [-1,1]){box(head,'#634e3a',side*.37,.64,-.1,.14,.64,.16).rotation.z=side*-.35;box(head,'#91b56e',side*.58,.9,-.1,.48,.14,.25);if(boss)box(head,'#e2c375',side*.75,1.12,-.1,.14,.55,.15);}
  box(head,'#6b7e47',0,.62,-.12,.55,.15,.5);
 }else if(kind==='shaman'){
  const robe=new T.Mesh(new T.CylinderGeometry(.35,.7,1.15,6),mat('#685283'));robe.position.y=.73;body.add(robe);robe.castShadow=true;
  box(body,'#b4a38d',0,.98,.48,.65,.17,.1);head.position.set(0,1.45,0);
  box(head,'#9477b0',0,0,0,.86,.65,.75);box(head,'#332d45',0,-.04,.4,.58,.38,.12);
  eye(head,-.14,-.03,.5,.1);eye(head,.14,-.03,.5,.1);
  box(head,'#c2a7df',0,.35,0,1.02,.14,.93);box(head,'#a28aba',-.12,.53,0,.6,.28,.58);
  const staff=pivot(body,.73,1.05,0);box(staff,'#ac8b65',0,.1,0,.13,2,.13);box(staff,'#b2ea86',0,1.18,0,.35,.4,.35,true);box(staff,'#dfc582',0,.9,0,.6,.1,.15);arms.push(staff);
  for(const side of [-1,1]){const arm=pivot(body,side*.4,1.13,0);box(arm,'#a58dbd',side*.1,-.14,.1,.24,.5,.3);arms.push(arm);}
 }else{
  box(body,'#3e6070',0,.65,0,.35,.9,.5);box(body,'#ffda79',0,.45,.1,.28,.38,.47,true);box(head,'#c1e5c6',0,1.17,.1,.56,.44,.52);
  eye(head,-.16,1.2,.38,.13);eye(head,.16,1.2,.38,.13);
  for(const side of [-1,1]){
   box(head,'#525e66',side*.18,1.55,.03,.07,.48,.07).rotation.z=side*-.3;
   const wing=pivot(body,side*.16,.92,0);
   const shape=new T.Shape();shape.moveTo(0,0);shape.lineTo(side*1.8,.45);shape.lineTo(side*1.5,-.7);shape.lineTo(side*.65,-1.05);shape.lineTo(0,-.2);
   const wm=new T.Mesh(new T.ShapeGeometry(shape),mat('#76bbca'));(wm.material as T.MeshToonMaterial).side=T.DoubleSide;wm.castShadow=true;wing.add(wm);
   box(wing,'#efcf79',side*.95,-.16,.04,.45,.38,.09);box(wing,'#405b74',side*1.35,-.27,.04,.24,.55,.08);wings.push(wing);
  }
 }
 const bar=new HealthBar(kind==='guardian'?3.2:1.4,kind==='guardian'?.24:.18,'#f36768');
 bar.position.y=kind==='guardian'?6.8:kind==='moth'?2.05:2.65;mesh.add(bar);
 const max=info.hp*(1+(tier-1)*.4);
 return {mesh,visual,kind,hp:max,max,speed:info.speed,boss:kind==='guardian',bar,phase,state:'seek',timer:0,cooldown:.7+phase%1.5,heading:new T.Vector3(),push:new T.Vector3(),flash:0,stagger:0,rig:{legs,arms,wings,head,body,materials:[...materials.values()]},radius:info.radius,aimHeight:info.aim,xpValue:info.xp,spawnAge:0};
}
export function disposeEnemy(e:EnemyUnit){
 e.mesh.removeFromParent();const geometry=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();
 e.mesh.traverse(o=>{if(o instanceof T.Mesh){geometry.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});
 geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
export function updateEnemy(e:EnemyUnit,dt:number,player:T.Vector3,time:number,height:(x:number,z:number)=>number,slow:number,events:EnemyEvents){
 const hitStop=e.stagger>0;e.stagger=Math.max(0,e.stagger-dt);const moveDt=hitStop?dt*.12:dt;
 e.spawnAge+=dt;e.cooldown-=moveDt;e.flash=Math.max(0,e.flash-dt);
 const delta=player.clone().sub(e.mesh.position);delta.y=0;const distance=delta.length(),direction=delta.normalize();
 const {body,legs,arms,wings,materials}=e.rig;
 const phase=time*(e.kind==='moth'?12:8)+e.phase;
 legs.forEach((leg,i)=>{leg.rotation.x=Math.sin(phase+i*Math.PI)*.65;});
 arms.forEach((arm,i)=>{arm.rotation.x=e.state==='windup'?-1.3:Math.sin(phase+i*Math.PI)*.2;});
 wings.forEach((wing,i)=>{wing.rotation.y=Math.sin(phase)*(i===0?1:-1)*.75;});
 body.position.y=Math.abs(Math.sin(phase))*.06;
 const size=e.boss?2.15:1,spawn=Math.min(1,e.spawnAge*5);
 e.visual.scale.set(size*(1+Math.min(1,e.flash/.09)*.12)*spawn,size*(1-Math.min(1,e.flash/.09)*.15)*spawn,size*(1+Math.min(1,e.flash/.09)*.12)*spawn);
 for(const m of materials){m.emissive.set(e.flash>0?'#fff4d4':m.userData.glow?m.color:'#000000');m.emissiveIntensity=e.flash>0?1.2:m.userData.glow?.65:0;}
 e.bar.visible=e.hp>0&&e.spawnAge>.2;e.bar.update(e.hp,e.max,dt);
 if(e.state==='seek'){
  e.mesh.rotation.y=Math.atan2(direction.x,direction.z);
  const range=e.kind==='shaman'?12:e.boss?8:e.kind==='beetle'?10:2.1;
  const movement=e.kind==='shaman'?(distance<8?-1:distance>12?1:0):1;
  if(distance>1.1||movement<0)e.mesh.position.addScaledVector(direction,e.speed*(distance>26?1.8:1)*movement*moveDt*slow);
  if(distance<range&&e.cooldown<=0){
   e.state='windup';e.timer=e.boss?1:e.kind==='beetle'?.7:e.kind==='shaman'?.8:.32;
   e.heading.copy(direction);
   if(e.boss)events.telegraph(e.mesh.position.clone(),8,e.timer);
   else if(e.kind==='beetle')events.telegraph(e.mesh.position.clone().addScaledVector(e.heading,4),1.1,e.timer);
  }
 }else if(e.state==='windup'){
  e.timer-=moveDt;
  if(e.timer<=0){
   e.state='attack';e.timer=e.kind==='beetle'?.65:.18;
   if(e.kind==='shaman'){
    const from=e.mesh.position.clone().add(new T.Vector3(0,1.9,0));const to=player.clone().add(new T.Vector3(0,.8,0));
    for(const angle of [-.16,0,.16]){const aim=to.clone().sub(from).applyAxisAngle(new T.Vector3(0,1,0),angle);events.projectile(from.clone(),from.clone().add(aim));}
   }
   if(e.boss)events.slam(e.mesh.position.clone(),10);
  }
 }else if(e.state==='attack'){
  e.timer-=moveDt;
  if(e.kind==='beetle')e.mesh.position.addScaledVector(e.heading,17*moveDt*slow);
  else if(e.kind==='stalker'||e.kind==='moth')e.mesh.position.addScaledVector(e.heading,9*moveDt*slow);
  const attackDistance=Math.hypot(player.x-e.mesh.position.x,player.z-e.mesh.position.z);
  if(e.kind!=='shaman'&&!e.boss&&attackDistance<e.radius+.7&&Math.abs(player.y-e.mesh.position.y)<1.4)events.damage(e.kind==='beetle'?15:9,e.mesh.position);
  if(e.timer<=0){e.state='recover';e.timer=e.boss?1:e.kind==='beetle'?.8:.45;}
 }else{e.timer-=moveDt;if(e.timer<=0){e.state='seek';e.cooldown=e.boss?2.8:e.kind==='shaman'?1.8:1;}}
 e.mesh.position.addScaledVector(e.push,dt);e.push.multiplyScalar(Math.exp(-dt*12));
 e.mesh.position.y=height(e.mesh.position.x,e.mesh.position.z)+(e.kind==='moth'?(e.state==='attack'?.25:1.1+Math.sin(time*3+e.phase)*.25):0);
}

