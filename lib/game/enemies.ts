import * as T from 'three';
import type {CollisionWorld} from './collisions';
import {HealthBar} from './health-bar';
import {makeEnemyRig,ENEMY_GEOMETRY,type EnemyRig} from './enemy-art';
export type EnemyKind='beetle'|'stalker'|'shaman'|'moth'|'guardian'|'bomber'|'crystal'|'brute'|'broodqueen'|'golem';
export const ENEMY_INFO={
 beetle:{name:'Bramble Scarab',color:'#f3a448',hp:40,speed:3.5,radius:.95,aim:.85,xp:1,scale:1,boss:false,tip:'Locked charge · melon / pepper seeds'},
 stalker:{name:'Root Reaver',color:'#8cc665',hp:29,speed:4.7,radius:.7,aim:1,xp:1,scale:1,boss:false,tip:'Leaping claws · berry / corn seeds'},
 shaman:{name:'Spore Hexer',color:'#b78be4',hp:35,speed:3,radius:.75,aim:1.1,xp:2,scale:1,boss:false,tip:'Three-bolt fan · glowcap / crystalbean seeds'},
 moth:{name:'Lantern Moth',color:'#76d6da',hp:18,speed:5.8,radius:.85,aim:.6,xp:1,scale:1,boss:false,tip:'Circling dive · dewleaf / melon seeds'},
 guardian:{name:'Elder Thornwarden',color:'#d1b875',hp:720,speed:3.3,radius:2,aim:2.3,xp:12,scale:2.15,boss:true,tip:'Shockwaves + root eruptions'},
 bomber:{name:'Cinder Puff',color:'#ff9655',hp:32,speed:3.4,radius:.8,aim:1.1,xp:2,scale:1,boss:false,tip:'Marked spore blasts · glowcap / crystalbean seeds'},
 crystal:{name:'Prism Sentry',color:'#77d8ed',hp:48,speed:2.2,radius:.85,aim:1.1,xp:2,scale:1,boss:false,tip:'Crystal volleys · dewleaf / melon seeds'},
 brute:{name:'Stoneback',color:'#8bb6c4',hp:85,speed:2.7,radius:1.1,aim:1.45,xp:3,scale:1.22,boss:false,tip:'Jumpable ground slam · melon / pepper seeds'},
 broodqueen:{name:'Lumina, Brood Queen',color:'#e998de',hp:650,speed:3.6,radius:1.8,aim:2,xp:12,scale:1.85,boss:true,tip:'Wing volleys + moth swarms'},
 golem:{name:'Prism Colossus',color:'#7eddef',hp:880,speed:2.5,radius:2.1,aim:2.6,xp:14,scale:2,boss:true,tip:'Crystal barrages + ground ruptures'}
} as const;
export const BOSS_KINDS:EnemyKind[]=['guardian','broodqueen','golem'];
export function bossKindFor(tier:number,clears=0):EnemyKind{const pool:EnemyKind[]=tier===1?['guardian','broodqueen']:['golem','broodqueen','guardian'];return pool[Math.max(0,Math.floor(clears))%pool.length];}
export type EnemyUnit={
 mesh:T.Group;visual:T.Group;kind:EnemyKind;hp:number;max:number;speed:number;boss:boolean;bar:HealthBar;
 phase:number;state:'seek'|'windup'|'attack'|'recover';timer:number;cooldown:number;heading:T.Vector3;push:T.Vector3;
 flash:number;stagger:number;rig:EnemyRig;radius:number;aimHeight:number;xpValue:number;spawnAge:number;
 target:T.Vector3;attackIndex:number;attackStyle:number;enraged:boolean;hasHit:boolean;
};
export type ShotStyle={color?:string;speed?:number;damage?:number;size?:number;form?:'spore'|'crystal'|'thorn'|'petal'};
export type EnemyEvents={
 telegraph:(point:T.Vector3,radius:number,duration:number)=>void;
 projectile:(from:T.Vector3,to:T.Vector3,style?:ShotStyle)=>void;
 slam:(point:T.Vector3,radius:number)=>void;
 damage:(amount:number,origin:T.Vector3)=>void;
 lane?:(point:T.Vector3,heading:T.Vector3,length:number,width:number,duration:number)=>void;
 zone?:(point:T.Vector3,radius:number,delay:number,damage:number,color:string)=>void;
 summon?:(kind:EnemyKind,count:number)=>void;
};
export function enemyKindFor(time:number,index:number,tier=1):EnemyKind{
 const early:EnemyKind[]=['stalker','beetle','stalker','moth'];
 const mid:EnemyKind[]=['stalker','beetle','moth','shaman','bomber','stalker','crystal'];
 const late:EnemyKind[]=['stalker','beetle','moth','shaman','bomber','crystal','brute','stalker','beetle'];
 const pattern=time<12?early:time<28&&tier===1?mid:late;return pattern[index%pattern.length];
}
export function makeEnemy(kind:EnemyKind,tier=1,phase=0):EnemyUnit{
 const info=ENEMY_INFO[kind],mesh=new T.Group(),visual=new T.Group();mesh.name=info.name;mesh.add(visual);
 const rig=makeEnemyRig(kind,visual);visual.scale.setScalar(info.scale);
 const bar=new HealthBar(info.boss?3.4:1.4,info.boss?.24:.18,info.boss?'#ffba66':'#f36768');bar.position.y=info.boss?6.8:kind==='moth'?2.3:kind==='brute'?3.6:3.1;mesh.add(bar);
 const max=info.hp*(1+(tier-1)*.4);
 return {mesh,visual,kind,hp:max,max,speed:info.speed,boss:info.boss,bar,phase,state:'seek',timer:0,cooldown:.7+phase%1.5,heading:new T.Vector3(),push:new T.Vector3(),flash:0,stagger:0,rig,radius:info.radius,aimHeight:info.aim,xpValue:info.xp,spawnAge:0,target:new T.Vector3(),attackIndex:0,attackStyle:0,enraged:false,hasHit:false};
}
export function disposeEnemy(e:EnemyUnit){
 e.mesh.removeFromParent();const geometry=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();
 e.mesh.traverse(o=>{if(o instanceof T.Mesh){if(!Object.values(ENEMY_GEOMETRY).includes(o.geometry))geometry.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});
 geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
const UP=new T.Vector3(0,1,0);
function volley(e:EnemyUnit,events:EnemyEvents,count:number,spread:number,radial=false){
 const from=e.mesh.position.clone().add(new T.Vector3(0,radial?.85:e.aimHeight,0)),aim=e.target.clone().add(new T.Vector3(0,.8,0)).sub(from);
 if(radial&&e.kind==='broodqueen')from.y-=.85;
 for(let i=0;i<count;i++){const angle=radial?i*Math.PI*2/count:(i-(count-1)/2)*spread,direction=aim.clone().applyAxisAngle(UP,angle);
  if(radial)direction.set(Math.sin(angle),0,Math.cos(angle));
  events.projectile(from.clone(),from.clone().add(direction),{color:ENEMY_INFO[e.kind].color,speed:e.kind==='crystal'||e.kind==='golem'?12:9,damage:e.boss?14:11,size:e.boss?.29:.23,form:e.kind==='crystal'||e.kind==='golem'?'crystal':e.kind==='guardian'?'thorn':e.kind==='broodqueen'?'petal':'spore'});
 }
}
export function updateEnemy(e:EnemyUnit,dt:number,player:T.Vector3,time:number,height:(x:number,z:number)=>number,slow:number,events:EnemyEvents,collisions?:CollisionWorld){
 if(e.hp<=0)return;
 const previous=collisions?e.mesh.position.clone():null,hitStop=e.stagger>0;e.stagger=Math.max(0,e.stagger-dt);const moveDt=hitStop?dt*.12:dt;
 e.spawnAge+=dt;e.cooldown-=moveDt;e.flash=Math.max(0,e.flash-dt);
 if(e.boss&&e.hp<=e.max*.5&&!e.enraged){e.enraged=true;e.flash=.2;}
 const delta=player.clone().sub(e.mesh.position);delta.y=0;const distance=delta.length(),direction=delta.normalize(),flying=e.kind==='moth'||e.kind==='broodqueen';
 const {body,legs,arms,wings,materials}=e.rig,phase=time*(flying?12:8)+e.phase,wind=e.state==='windup',attacking=e.state==='attack';
 legs.forEach((leg,i)=>{leg.rotation.x=e.state==='seek'?Math.sin(phase+i*Math.PI)*.6:Math.sin(phase*.4+i)*.1;});
 arms.forEach((arm,i)=>{arm.rotation.x=wind?-1.3:attacking?.9:Math.sin(phase+i*Math.PI)*.18;});
 wings.forEach((wing,i)=>{wing.rotation.y=Math.sin(phase)*(i===0?1:-1)*(wind?.3:.75);});
 body.position.y=wind?-.12:Math.abs(Math.sin(phase))*.065;body.rotation.x=wind?-.13:attacking?.15:0;
 const size=ENEMY_INFO[e.kind].scale,spawn=Math.min(1,e.spawnAge*5),flash=Math.min(1,e.flash/.09),squash=wind?.08:0;
 e.visual.scale.set(size*(1+flash*.12+squash)*spawn,size*(1-flash*.15-squash)*spawn,size*(1+flash*.12+squash)*spawn);
 for(const m of materials){m.emissive.set(e.flash>0?'#fff4d4':m.userData.glow?(e.enraged?'#ff7748':m.color):'#000000');m.emissiveIntensity=e.flash>0?1.2:m.userData.glow?(wind?1:.65):0;}
 e.bar.visible=e.hp>0&&e.spawnAge>.2;e.bar.update(e.hp,e.max,dt);
 if(e.state==='seek'){
  const ranged=['shaman','bomber','crystal','broodqueen'].includes(e.kind),range=ranged?15:e.boss?12:e.kind==='beetle'?11:e.kind==='brute'?5:3.5;
  const movement=ranged?(distance<7?-1:distance>11?1:0):1,travel=direction.clone();
  if(flying&&distance>4)travel.applyAxisAngle(UP,Math.sin(e.phase)>=0?.5:-.5);
  if(collisions)travel.copy(collisions.steer(e.mesh.position,travel,e.radius,e.boss?5:1.5,Math.sin(e.phase)>=0?1:-1));
  e.mesh.rotation.y=Math.atan2(direction.x,direction.z);
  if(distance>1.1||movement<0)e.mesh.position.addScaledVector(travel,e.speed*(e.enraged?1.12:1)*(distance>26?1.8:1)*movement*moveDt*slow);
  if(distance<range&&e.cooldown<=0&&e.spawnAge>.25){
   e.state='windup';e.timer=e.boss?1.05:e.kind==='beetle'?.7:e.kind==='brute'?.85:ranged?.8:e.kind==='moth'?.55:.4;
   e.heading.copy(direction);e.target.copy(player);e.target.y=height(player.x,player.z);e.hasHit=false;e.attackStyle=e.attackIndex++%(e.boss?3:1);
   const style=e.attackStyle;
   if(e.kind==='beetle'||e.kind==='stalker'||e.kind==='moth'){
    if(events.lane)events.lane(e.mesh.position.clone(),e.heading.clone(),e.kind==='beetle'?10:3.5,e.radius*2,e.timer);
    else events.telegraph(e.mesh.position.clone().addScaledVector(e.heading,4),e.radius,e.timer);
   }else if(e.kind==='brute'||e.kind==='guardian'&&style===0||e.kind==='golem'&&style===0)events.telegraph(e.mesh.position.clone(),e.boss?8:4.5,e.timer);
   else if(e.kind==='bomber'||e.kind==='guardian'&&style===1||e.kind==='golem'&&style===2)events.telegraph(e.target.clone(),e.boss?3:2.5,e.timer);
   else events.telegraph(e.mesh.position.clone(),e.radius+1,e.timer);
  }
 }else if(wind){
  e.timer-=moveDt;
  if(e.timer<=0){
   e.state='attack';e.timer=e.kind==='beetle'?.6:e.kind==='moth'?.4:.24;
   if(e.kind==='shaman')volley(e,events,3,.2);
   if(e.kind==='crystal')volley(e,events,5,.22);
   if(e.kind==='bomber')events.zone?.(e.target.clone(),2.5,.25,15,'#ffc35c');
   if(e.kind==='brute')events.slam(e.mesh.position.clone(),4.5);
   if(e.boss){
    const n=e.enraged?2:1;
    if(e.kind==='guardian'){
     if(e.attackStyle===0)events.slam(e.mesh.position.clone(),8);
     if(e.attackStyle===1)for(let i=0;i<2+n;i++){const p=e.target.clone().addScaledVector(e.heading,(i-1)*3.5);events.zone?.(p,2.4,.45+i*.22,18,'#badf69');}
     if(e.attackStyle===2)volley(e,events,e.enraged?10:8,0,true);
    }else if(e.kind==='broodqueen'){
     if(e.attackStyle===0)volley(e,events,e.enraged?9:5,.22);
     if(e.attackStyle===1){events.summon?.('moth',e.enraged?4:2);volley(e,events,8,0,true);}
     if(e.attackStyle===2)for(let i=0;i<2+n;i++){const a=i*2.4,p=e.target.clone().add(new T.Vector3(Math.sin(a)*3,0,Math.cos(a)*3));events.zone?.(p,2.4,.65+i*.18,16,'#ed9cdf');}
    }else{
     if(e.attackStyle===0)events.slam(e.mesh.position.clone(),8);
     if(e.attackStyle===1)volley(e,events,e.enraged?9:5,.2);
     if(e.attackStyle===2)for(let i=0;i<2+n;i++){const p=e.target.clone().add(new T.Vector3((i-1)*3.6,0,0));events.zone?.(p,2.7,.5+i*.2,20,'#81e6fb');}
    }
   }
  }
 }else if(attacking){
  e.timer-=moveDt;
  if(e.kind==='beetle')e.mesh.position.addScaledVector(e.heading,17*moveDt*slow);
  else if(e.kind==='stalker'||e.kind==='moth')e.mesh.position.addScaledVector(e.heading,(e.kind==='moth'?12:10)*moveDt*slow);
  const d=Math.hypot(player.x-e.mesh.position.x,player.z-e.mesh.position.z);
  if(!e.hasHit&&['beetle','stalker','moth'].includes(e.kind)&&d<e.radius+.7&&Math.abs(player.y-e.mesh.position.y)<1.4){events.damage(e.kind==='beetle'?15:9,e.mesh.position);e.hasHit=true;}
  if(e.timer<=0){e.state='recover';e.timer=e.boss?.85:e.kind==='beetle'?.8:.55;}
 }else{e.timer-=moveDt;if(e.timer<=0){e.state='seek';e.cooldown=(e.boss?2.4:['shaman','bomber','crystal'].includes(e.kind)?2:1)*(e.enraged?.75:1);}}
 e.mesh.position.addScaledVector(e.push,dt);e.push.multiplyScalar(Math.exp(-dt*12));
 if(collisions&&previous)collisions.move(previous,e.mesh.position,e.push,e.radius,e.boss?5:1.5);
 e.mesh.position.y=height(e.mesh.position.x,e.mesh.position.z)+(flying?(e.kind==='moth'&&e.state==='attack'?.25:.85+Math.sin(time*3+e.phase)*.22):e.kind==='stalker'&&e.state==='attack'?Math.sin(Math.max(0,e.timer)/.24*Math.PI)*.6:0);
}
