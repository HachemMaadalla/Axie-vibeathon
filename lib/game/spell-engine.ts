import * as T from 'three';
import {SpellVisuals,SPELL_COLORS} from './spell-visuals';
import type {CombatFX,CombatAudio} from './combat-fx';
import {WEAPONS,ITEMS,itemLevel,spellStats,type Build,type WeaponId} from './build';
export type SpellTarget={mesh:T.Group;hp:number;boss:boolean;radius?:number;aimHeight?:number};
const center=(t:SpellTarget)=>t.mesh.position.clone().add(new T.Vector3(0,t.aimHeight??.7,0));
type Projectile={mesh:T.Mesh;velocity:T.Vector3;life:number;damage:number;remaining:number;hit:Set<SpellTarget>;burst:boolean;explosion?:number;color?:string};
type Zone={mesh:T.Group;radius:number;life:number;max:number;damage:number;slow:boolean;heal:boolean;tick:number;motes:T.Mesh[];fire:boolean};
type Meteor={mesh:T.Mesh;marker:T.Mesh;point:T.Vector3;life:number;radius:number;damage:number;burn:boolean};
export class SpellEngine{
 private root=new T.Group();
 private visuals=new SpellVisuals();private petalEvolved=false;
 private timers:Partial<Record<WeaponId,number>>={};
 private projectiles:Projectile[]=[];
 private zones:Zone[]=[];
 private meteors:Meteor[]=[];
 private petals:T.Mesh[]=[];
 private flashes:{object:T.Object3D;life:number}[]=[];
 private clock=0;
 private orbitTick=0;private trailAt=0;
 constructor(scene:T.Scene,private feedback:{fx?:CombatFX;audio?:CombatAudio;height?:(x:number,z:number)=>number;cast?:(id:WeaponId,target:T.Vector3)=>void}={}){scene.add(this.root);}
 private discard(object:T.Object3D){this.visuals.release(object);}
 private ring(point:T.Vector3,radius:number,color:string){
  const mesh=this.visuals.ring(point,radius,color,this.feedback.height);this.root.add(mesh);return mesh;
 }
 private line(from:T.Vector3,to:T.Vector3,evolved:boolean){
  const bolt=this.visuals.lightning(from,to,evolved);this.root.add(bolt);this.flashes.push({object:bolt,life:.19});
 }
 private zone(point:T.Vector3,radius:number,life:number,damage:number,slow:boolean,heal:boolean,color:string,fire=false){
  const mesh=new T.Group();mesh.name=fire?'solar-burning-ground':heal?'dream-garden':'spore-cloud';mesh.position.copy(point);
  const boundary=this.visuals.ring(point,radius,color,this.feedback.height);boundary.position.set(0,0,0);mesh.add(boundary);
  const motes:T.Mesh[]=[];
  if(!fire)for(let i=0;i<(heal?3:2);i++){
   const a=i*2.4,offset=radius*(heal?.45:.32),m=this.visuals.mushroom(heal),x=Math.cos(a)*offset,z=Math.sin(a)*offset;
   m.position.set(x,(this.feedback.height?.(point.x+x,point.z+z)??point.y)-point.y,z);m.scale.setScalar(heal?1.05:.9);mesh.add(m);
  }
  for(let i=0;i<(fire?7:5);i++){
   const a=i/(fire?7:5)*Math.PI*2,m=fire?this.visuals.flame():this.visuals.puff(heal);
   m.position.set(Math.cos(a)*radius*.64,.35,Math.sin(a)*radius*.64);m.scale.setScalar(fire?1:1.4);mesh.add(m);motes.push(m);
  }
  this.root.add(mesh);this.zones.push({mesh,radius,life,max:life,damage,slow,heal,tick:0,motes,fire});
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
   const s=spellStats(build,id),damage=baseDamage*s.damage,color=s.evolved?SPELL_COLORS[id].evolved:SPELL_COLORS[id].base;
   if(['sword','axe','hammer'].includes(id)&&(Math.hypot(target.mesh.position.x-player.x,target.mesh.position.z-player.z)>s.area+(target.radius??.6)||Math.abs(target.mesh.position.y-player.y)>2.2))continue;
   this.timers[id]=s.cooldown;this.feedback.cast?.(id,target.mesh.position);this.feedback.audio?.play(id==='storm'?'storm':id==='ember'?'cast':'cast');
   if(id==='cannon'){
    for(let i=0;i<s.count;i++){
     const aimed=list[i%Math.min(list.length,3)],origin=player.clone().add(new T.Vector3(0,.95,0)),aim=center(aimed).sub(origin).normalize();
     aim.applyAxisAngle(new T.Vector3(0,1,0),(i-(s.count-1)/2)*.075);
     const mesh=this.visuals.cannonball(s.evolved);mesh.position.copy(origin);this.root.add(mesh);this.feedback.fx?.burst(origin,color,5,2);
     this.projectiles.push({mesh,velocity:aim.multiplyScalar(19),life:1.5,damage,remaining:1,hit:new Set(),burst:false,explosion:s.area,color});
    }
   }
   if(id==='sword'||id==='axe'||id==='hammer'){
    const direction=target.mesh.position.clone().sub(player);direction.y=0;direction.normalize();
    const arc=id==='hammer'||s.evolved?Math.PI*2:id==='axe'?Math.PI*1.25:Math.PI*.9;
    for(const enemy of alive()){
     const offset=enemy.mesh.position.clone().sub(player),vertical=Math.abs(offset.y);offset.y=0;
     if(vertical>2.2||offset.length()>s.area+(enemy.radius??.6))continue;
     if(arc>=Math.PI*2||offset.length()<.7||offset.normalize().dot(direction)>=Math.cos(arc/2))hurt(enemy,damage);
    }
    const effect=id==='hammer'?this.ring(player,s.area,color):this.visuals.slash(player,s.area,Math.atan2(direction.x,direction.z),arc,color);
    if(id!=='hammer')this.root.add(effect);this.flashes.push({object:effect,life:.24});
    this.feedback.fx?.burst(player.clone().addScaledVector(direction,1.5),color,id==='hammer'?15:6,id==='hammer'?4:2);
    if(id==='hammer')this.feedback.audio?.play('meteor');
   }
   if(id==='thorn'){
    for(let i=0;i<s.count;i++){
     const target=list[i%Math.min(list.length,3)];
     const origin=player.clone().add(new T.Vector3(0,.9,0));
     const aim=center(target).sub(origin).normalize();
     aim.applyAxisAngle(new T.Vector3(0,1,0),(i-(s.count-1)/2)*.055);
     const mesh=this.visuals.thorn(s.evolved);mesh.scale.setScalar(s.evolved?.85:.65);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),aim);mesh.position.copy(origin);this.feedback.fx?.burst(origin,color,3,1);this.root.add(mesh);
     this.projectiles.push({mesh,velocity:aim.multiplyScalar(23),life:1.3,damage,remaining:s.pierce+1,hit:new Set(),burst:s.evolved});
    }
   }
   if(id==='spore')this.zone(target.mesh.position,s.area,s.duration,damage,s.level===3,s.evolved,color);
   if(id==='storm'){
    let from=player.clone().add(new T.Vector3(0,1,0));const visited=new Set<SpellTarget>();
    for(let i=0;i<s.count;i++){
     const t=near(from).find(t=>!visited.has(t)&&(i===0||t.mesh.position.distanceTo(from)<s.area));
     if(!t)break;visited.add(t);
     const to=center(t);this.line(from,to,s.evolved);
     if(s.evolved)this.line(from.clone().add(new T.Vector3(.15,.18,.15)),to,true);
     hurt(t,damage);from=to;
    }
   }
   if(id==='ember'){
    for(let i=0;i<s.count;i++){
     const point=list[i%list.length].mesh.position.clone();
     if(i>=list.length)point.add(new T.Vector3(Math.cos(i*2.4),0,Math.sin(i*2.4)).multiplyScalar(.7));
     const mesh=this.visuals.meteor(s.evolved);mesh.scale.setScalar(s.evolved?1.35:1);mesh.position.copy(point).y=point.y+8;this.root.add(mesh);
     this.meteors.push({mesh,marker:this.ring(point,s.area,s.evolved?'#ffdf66':'#ff953e'),point,life:.7+i*.08,radius:s.area,damage,burn:s.evolved});
    }
   }
  }
  const petalLevel=itemLevel(build,'petal');
  if(petalLevel){
   const s=spellStats(build,'petal');
   if(this.petalEvolved!==s.evolved){this.petals.forEach(p=>this.discard(p));this.petals=[];this.petalEvolved=s.evolved;}
   while(this.petals.length<s.count){const p=this.visuals.petal(s.evolved);p.scale.setScalar(s.evolved?.85:.72);this.root.add(p);this.petals.push(p);}
   while(this.petals.length>s.count)this.discard(this.petals.pop()!);
   this.petals.forEach((p,i)=>{const angle=this.clock*(s.evolved?3.5:1.5+s.level*.3)+i/s.count*Math.PI*2;p.position.copy(player).add(new T.Vector3(Math.cos(angle)*s.area,.85,Math.sin(angle)*s.area));p.rotation.set(0,-angle,Math.PI/5);if(emitTrail)this.feedback.fx?.trail(p.position,s.evolved?'#63edce':'#ff72bb',.1);});
   this.orbitTick-=dt;
   if(this.orbitTick<=0){this.orbitTick=s.cooldown;for(const t of alive())if(this.petals.some(p=>p.position.distanceTo(center(t))<((t.radius??(t.boss?2:.7))+.3)))hurt(t,baseDamage*s.damage);}
  }
  for(let i=this.projectiles.length-1;i>=0;i--){
   const p=this.projectiles[i];p.life-=dt;const previous=p.mesh.position.clone();p.mesh.position.addScaledVector(p.velocity,dt);const segment=new T.Line3(previous,p.mesh.position);if(emitTrail)this.feedback.fx?.trail(p.mesh.position,p.color??(p.burst?'#ffe16a':'#aceb3d'),.12);
   for(const t of alive()){
    if(p.hit.has(t)||segment.closestPointToPoint(center(t),true,new T.Vector3()).distanceTo(center(t))>(t.radius??(t.boss?2:.85)))continue;
    p.hit.add(t);if(p.explosion){splash(t.mesh.position,p.explosion,p.damage);this.feedback.fx?.burst(center(t),p.color??'#9de8ff',14,4);this.flashes.push({object:this.ring(t.mesh.position,p.explosion,p.color??'#9de8ff'),life:.25});this.feedback.audio?.play('hit');}else hurt(t,p.damage);
    if(p.burst){splash(t.mesh.position,1.3,p.damage*.25);this.flashes.push({object:this.ring(t.mesh.position,1.3,'#ffe592'),life:.22});}
    if(--p.remaining<=0){p.life=0;break;}
   }
   if(p.life<=0){this.discard(p.mesh);this.projectiles.splice(i,1);}
  }
  for(let i=this.meteors.length-1;i>=0;i--){
   const m=this.meteors[i];m.life-=dt;m.mesh.position.y=m.point.y+Math.max(.35,m.life*10);m.mesh.rotation.y+=dt*7;if(emitTrail){this.feedback.fx?.trail(m.mesh.position,'#ffae58',.3);this.feedback.fx?.trail(m.mesh.position.clone().add(new T.Vector3(0,.45,0)),'#fa7053',.2);}
   if(m.life<=0){this.feedback.fx?.burst(m.point.clone().add(new T.Vector3(0,.3,0)),'#ffc578',28,7);this.feedback.fx?.ring(m.point,m.radius*1.2,'#ffe7ab',.4);this.feedback.audio?.play('meteor');splash(m.point,m.radius,m.damage);this.discard(m.mesh);this.discard(m.marker);this.flashes.push({object:this.ring(m.point,m.radius,'#ffe2a1'),life:.3});if(m.burn)this.zone(m.point,m.radius,4,m.damage*.15,false,false,'#ff933d',true);this.meteors.splice(i,1);}
  }
  for(let i=this.zones.length-1;i>=0;i--){
   const z=this.zones[i];z.life-=dt;z.tick-=dt;if(emitTrail){const a=this.clock*3+i*2;this.feedback.fx?.trail(z.mesh.position.clone().add(new T.Vector3(Math.cos(a)*z.radius*.7,.3+Math.sin(a)*.15,Math.sin(a)*z.radius*.7)),z.fire?'#ff7136':z.heal?'#63efc6':'#8ddb46',.12);}
   if(z.tick<=0){z.tick=.5;splash(z.mesh.position,z.radius,z.damage);}
   z.motes.forEach((m,j)=>{const angle=j/z.motes.length*Math.PI*2+(z.fire?0:this.clock*.45),x=Math.cos(angle)*z.radius*.64,zp=Math.sin(angle)*z.radius*.64;m.position.set(x,(this.feedback.height?.(z.mesh.position.x+x,z.mesh.position.z+zp)??z.mesh.position.y)-z.mesh.position.y+(z.fire?.05:.38+Math.sin(this.clock*3+j)*.15),zp);m.rotation.y=this.clock*(z.fire?1.5:.5)+j;m.scale.setScalar(Math.min(1,(z.max-z.life)*8,z.life*4)*(z.fire?.8+Math.sin(this.clock*10+j)*.16:1.25));});
   if(z.life<=0){this.discard(z.mesh);this.zones.splice(i,1);}
  }
  for(let i=this.flashes.length-1;i>=0;i--){const f=this.flashes[i];f.life-=dt;if(f.life<=0){this.discard(f.object);this.flashes.splice(i,1);}}
 }
 clear(){for(const child of [...this.root.children])this.discard(child);this.timers={};this.projectiles=[];this.zones=[];this.meteors=[];this.petals=[];this.flashes=[];this.clock=0;this.orbitTick=0;this.trailAt=0;this.petalEvolved=false;}
 dispose(){this.clear();this.visuals.dispose();this.root.removeFromParent();}
}

