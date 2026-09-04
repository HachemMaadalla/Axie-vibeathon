import * as T from 'three';
import type {CombatFX,CombatAudio} from './combat-fx';
import {WEAPONS,ITEMS,itemLevel,spellStats,type Build,type WeaponId} from './build';
export type SpellTarget={mesh:T.Group;hp:number;boss:boolean;radius?:number;aimHeight?:number};
const center=(t:SpellTarget)=>t.mesh.position.clone().add(new T.Vector3(0,t.aimHeight??.7,0));
type Projectile={mesh:T.Mesh;velocity:T.Vector3;life:number;damage:number;remaining:number;hit:Set<SpellTarget>;burst:boolean};
type Zone={mesh:T.Mesh;radius:number;life:number;damage:number;slow:boolean;heal:boolean;tick:number};
type Meteor={mesh:T.Mesh;marker:T.Mesh;point:T.Vector3;life:number;radius:number;damage:number;burn:boolean};
export class SpellEngine{
 private root=new T.Group();
 private timers:Partial<Record<WeaponId,number>>={};
 private projectiles:Projectile[]=[];
 private zones:Zone[]=[];
 private meteors:Meteor[]=[];
 private petals:T.Mesh[]=[];
 private flashes:{object:T.Object3D;life:number}[]=[];
 private clock=0;
 private orbitTick=0;private trailAt=0;
 constructor(scene:T.Scene,private feedback:{fx?:CombatFX;audio?:CombatAudio}={}){scene.add(this.root);}
 private discard(object:T.Object3D){
  object.removeFromParent();object.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});
 }
 private sphere(color:string,size:number){return new T.Mesh(new T.IcosahedronGeometry(size,1),new T.MeshBasicMaterial({color}));}
 private ring(point:T.Vector3,radius:number,color:string){
  const mesh=new T.Mesh(new T.RingGeometry(radius*.85,radius,40),new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.65}));
  mesh.rotation.x=-Math.PI/2;mesh.position.copy(point);mesh.position.y=point.y+.22;this.root.add(mesh);return mesh;
 }
 private line(from:T.Vector3,to:T.Vector3,color:string){
  const group=new T.Group(),delta=to.clone().sub(from),points=[from,from.clone().addScaledVector(delta,.3).add(new T.Vector3(.25,.35,-.2)),from.clone().addScaledVector(delta,.65).add(new T.Vector3(-.2,.1,.3)),to];
  for(let i=0;i<points.length-1;i++){
   const d=points[i+1].clone().sub(points[i]),length=d.length(),mid=points[i].clone().add(points[i+1]).multiplyScalar(.5);
   for(const [radius,tint] of [[.07,color],[.025,'#ffffff']] as const){const bolt=new T.Mesh(new T.CylinderGeometry(radius,radius,length,5),new T.MeshBasicMaterial({color:tint,transparent:true,opacity:.85,blending:T.AdditiveBlending,depthWrite:false}));bolt.position.copy(mid);bolt.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());group.add(bolt);}
  }
  this.root.add(group);this.flashes.push({object:group,life:.16});
 }

 private zone(point:T.Vector3,radius:number,life:number,damage:number,slow:boolean,heal:boolean,color:string){
  const mesh=new T.Mesh(new T.CircleGeometry(radius,32),new T.MeshBasicMaterial({color,transparent:true,opacity:.22,side:T.DoubleSide}));
  mesh.rotation.x=-Math.PI/2;mesh.position.copy(point);mesh.position.y=point.y+.16;this.root.add(mesh);
  this.zones.push({mesh,radius,life,damage,slow,heal,tick:0});
 }
 speedMultiplier(target:SpellTarget){return this.zones.some(z=>z.slow&&z.mesh.position.distanceTo(target.mesh.position)<z.radius)? .65:1;}
 healingAt(position:T.Vector3){return this.zones.some(z=>z.heal&&z.mesh.position.distanceTo(position)<z.radius)?3:0;}
 update(dt:number,player:T.Vector3,build:Build,baseDamage:number,targets:SpellTarget[],hit:(target:SpellTarget,damage:number)=>void){
  this.clock+=dt;this.trailAt-=dt;const emitTrail=this.trailAt<=0;if(emitTrail)this.trailAt=.03;
  const alive=()=>targets.filter(t=>t.hp>0);
  const near=(origin:T.Vector3)=>alive().sort((a,b)=>a.mesh.position.distanceToSquared(origin)-b.mesh.position.distanceToSquared(origin));
  const hurt=(t:SpellTarget,n:number)=>{if(t.hp>0)hit(t,n);};
  const splash=(p:T.Vector3,r:number,n:number)=>{for(const t of alive())if(t.mesh.position.distanceTo(p)<r+(t.boss?1.3:.4))hurt(t,n);};
  for(const id of WEAPONS){
   if(!itemLevel(build,id)||id==='petal')continue;
   this.timers[id]=(this.timers[id]??0)-dt;
   if(this.timers[id]!>0)continue;
   const list=near(player),target=list[0];if(!target||target.mesh.position.distanceTo(player)>17)continue;
   const s=spellStats(build,id),damage=baseDamage*s.damage,color=s.evolved?'#fff1b8':ITEMS[id].color;
   this.timers[id]=s.cooldown;this.feedback.audio?.play(id==='storm'?'storm':id==='ember'?'cast':'cast');
   if(id==='thorn'){
    for(let i=0;i<s.count;i++){
     const target=list[i%Math.min(list.length,3)];
     const origin=player.clone().add(new T.Vector3(0,.9,0));
     const aim=center(target).sub(origin).normalize();
     aim.applyAxisAngle(new T.Vector3(0,1,0),(i-(s.count-1)/2)*.055);
     const mesh=this.sphere(color,s.evolved?.24:.18);mesh.scale.set(.65,.65,3);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),aim);mesh.position.copy(origin);this.feedback.fx?.burst(origin,color,3,1);this.root.add(mesh);
     this.projectiles.push({mesh,velocity:aim.multiplyScalar(23),life:1.3,damage,remaining:s.pierce+1,hit:new Set(),burst:s.evolved});
    }
   }
   if(id==='spore')this.zone(target.mesh.position,s.area,s.duration,damage,s.level===3,s.evolved,color);
   if(id==='storm'){
    let from=player.clone().add(new T.Vector3(0,1,0));const visited=new Set<SpellTarget>();
    for(let i=0;i<s.count;i++){
     const t=near(from).find(t=>!visited.has(t)&&(i===0||t.mesh.position.distanceTo(from)<s.area));
     if(!t)break;visited.add(t);
     const to=center(t);this.line(from,to,color);
     if(s.evolved)this.line(from.clone().add(new T.Vector3(.15,0,.15)),to,'#d4b7ff');
     hurt(t,damage);from=to;
    }
   }
   if(id==='ember'){
    for(let i=0;i<s.count;i++){
     const point=list[i%list.length].mesh.position.clone();
     if(i>=list.length)point.add(new T.Vector3(Math.cos(i*2.4),0,Math.sin(i*2.4)).multiplyScalar(.7));
     const mesh=this.sphere(color,.45);mesh.scale.set(.85,1.7,.85);mesh.position.copy(point).y=point.y+8;this.root.add(mesh);
     this.meteors.push({mesh,marker:this.ring(point,s.area,'#ffb269'),point,life:.7+i*.08,radius:s.area,damage,burn:s.evolved});
    }
   }
  }
  const petalLevel=itemLevel(build,'petal');
  if(petalLevel){
   const s=spellStats(build,'petal');
   while(this.petals.length<s.count){const p=new T.Mesh(new T.OctahedronGeometry(.38,0),new T.MeshBasicMaterial({color:s.evolved?'#fff0b5':'#f5a9d0'}));p.scale.set(.6,.3,1.8);this.root.add(p);this.petals.push(p);}
   while(this.petals.length>s.count)this.discard(this.petals.pop()!);
   this.petals.forEach((p,i)=>{const angle=this.clock*(s.evolved?3.5:1.5+s.level*.3)+i/s.count*Math.PI*2;p.position.copy(player).add(new T.Vector3(Math.cos(angle)*s.area,.85,Math.sin(angle)*s.area));p.rotation.set(0,-angle,Math.PI/5);if(emitTrail)this.feedback.fx?.trail(p.position,s.evolved?'#fff0b5':'#f7b0d1',.1);(p.material as T.MeshBasicMaterial).color.set(s.evolved?'#fff0b5':'#f5a9d0');});
   this.orbitTick-=dt;
   if(this.orbitTick<=0){this.orbitTick=s.cooldown;for(const t of alive())if(this.petals.some(p=>p.position.distanceTo(center(t))<((t.radius??(t.boss?2:.7))+.3)))hurt(t,baseDamage*s.damage);}
  }
  for(let i=this.projectiles.length-1;i>=0;i--){
   const p=this.projectiles[i];p.life-=dt;const previous=p.mesh.position.clone();p.mesh.position.addScaledVector(p.velocity,dt);const segment=new T.Line3(previous,p.mesh.position);if(emitTrail)this.feedback.fx?.trail(p.mesh.position,p.burst?'#ffe6a0':'#d6f293',.12);
   for(const t of alive()){
    if(p.hit.has(t)||segment.closestPointToPoint(center(t),true,new T.Vector3()).distanceTo(center(t))>(t.radius??(t.boss?2:.85)))continue;
    p.hit.add(t);hurt(t,p.damage);
    if(p.burst){splash(t.mesh.position,1.3,p.damage*.25);this.flashes.push({object:this.ring(t.mesh.position,1.3,'#ffe592'),life:.22});}
    if(--p.remaining<=0){p.life=0;break;}
   }
   if(p.life<=0){this.discard(p.mesh);this.projectiles.splice(i,1);}
  }
  for(let i=this.meteors.length-1;i>=0;i--){
   const m=this.meteors[i];m.life-=dt;m.mesh.position.y=m.point.y+Math.max(.35,m.life*10);m.mesh.rotation.y+=dt*7;if(emitTrail){this.feedback.fx?.trail(m.mesh.position,'#ffae58',.3);this.feedback.fx?.trail(m.mesh.position.clone().add(new T.Vector3(0,.45,0)),'#fa7053',.2);}
   if(m.life<=0){this.feedback.fx?.burst(m.point.clone().add(new T.Vector3(0,.3,0)),'#ffc578',28,7);this.feedback.fx?.ring(m.point,m.radius*1.2,'#ffe7ab',.4);this.feedback.audio?.play('meteor');splash(m.point,m.radius,m.damage);this.discard(m.mesh);this.discard(m.marker);this.flashes.push({object:this.ring(m.point,m.radius,'#ffe2a1'),life:.3});if(m.burn)this.zone(m.point,m.radius,4,m.damage*.15,false,false,'#ff9757');this.meteors.splice(i,1);}
  }
  for(let i=this.zones.length-1;i>=0;i--){
   const z=this.zones[i];z.life-=dt;z.tick-=dt;if(emitTrail){const a=this.clock*3+i*2;this.feedback.fx?.trail(z.mesh.position.clone().add(new T.Vector3(Math.cos(a)*z.radius*.7,.3+Math.sin(a)*.15,Math.sin(a)*z.radius*.7)),z.heal?'#c1f6bc':'#a3dabc',.12);}
   if(z.tick<=0){z.tick=.5;splash(z.mesh.position,z.radius,z.damage);}
   (z.mesh.material as T.MeshBasicMaterial).opacity=Math.min(.24,z.life*.2);
   if(z.life<=0){this.discard(z.mesh);this.zones.splice(i,1);}
  }
  for(let i=this.flashes.length-1;i>=0;i--){const f=this.flashes[i];f.life-=dt;if(f.life<=0){this.discard(f.object);this.flashes.splice(i,1);}}
 }
 clear(){for(const child of [...this.root.children])this.discard(child);this.timers={};this.projectiles=[];this.zones=[];this.meteors=[];this.petals=[];this.flashes=[];this.clock=0;this.orbitTick=0;}
 dispose(){this.clear();this.root.removeFromParent();}
}

