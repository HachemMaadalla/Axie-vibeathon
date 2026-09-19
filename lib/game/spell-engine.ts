import * as T from 'three';
import {SpellVisuals,SPELL_COLORS} from './spell-visuals';
import type {CombatFX,CombatAudio} from './combat-fx';
import {WEAPONS,ITEMS,modifiers,itemLevel,spellStats,type Build,type WeaponId} from './build';
export type SpellTarget={mesh:T.Group;hp:number;boss:boolean;radius?:number;aimHeight?:number};
const center=(t:SpellTarget)=>t.mesh.position.clone().add(new T.Vector3(0,t.aimHeight??.7,0));
type Melee={id:'sword'|'axe'|'hammer';direction:T.Vector3;delay:number;radius:number;damage:number;arc:number;color:string;evolved:boolean;width:number};
type Projectile={mesh:T.Mesh;velocity:T.Vector3;life:number;damage:number;remaining:number;hit:Set<SpellTarget>;burst:boolean;explosion?:number;color?:string};
type Zone={mesh:T.Group;radius:number;life:number;max:number;damage:number;slow:boolean;heal:boolean;tick:number;motes:T.Mesh[];fire:boolean;style?:'frost'|'void'|'venom'};
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
 private cuts:{object:T.Group;age:number;max:number;kind:"sword"|"axe";angle:number}[]=[];
 private clock=0;private melee:Melee[]=[];private previousTargets=new WeakMap<SpellTarget,T.Vector3>();
 private chilled=new WeakMap<SpellTarget,number>();
 private orbitTick=0;private trailAt=0;
 constructor(scene:T.Scene,private feedback:{fx?:CombatFX;audio?:CombatAudio;height?:(x:number,z:number)=>number;cast?:(id:WeaponId,target:T.Vector3)=>void;collision?:(from:T.Vector3,to:T.Vector3)=>T.Vector3|null}={}){scene.add(this.root);}
 private discard(object:T.Object3D){this.visuals.release(object);}
 private ring(point:T.Vector3,radius:number,color:string){
  const mesh=this.visuals.ring(point,radius,color,this.feedback.height);this.root.add(mesh);return mesh;
 }
 private line(from:T.Vector3,to:T.Vector3,evolved:boolean){
  const bolt=this.visuals.lightning(from,to,evolved);this.root.add(bolt);this.flashes.push({object:bolt,life:.12});
 }
 private zone(point:T.Vector3,radius:number,life:number,damage:number,slow:boolean,heal:boolean,color:string,fire=false,style?:'frost'|'void'|'venom'){
  const mesh=new T.Group();mesh.name=fire?'solar-burning-ground':heal?'dream-garden':'spore-cloud';mesh.position.copy(point);
  const boundary=this.visuals.ring(point,radius,color,this.feedback.height);boundary.position.set(0,0,0);mesh.add(boundary);
  const motes:T.Mesh[]=[];
  if(!fire&&!style)for(let i=0;i<(heal?3:2);i++){
   const a=i*2.4,offset=radius*(heal?.45:.32),m=this.visuals.mushroom(heal),x=Math.cos(a)*offset,z=Math.sin(a)*offset;
   m.position.set(x,(this.feedback.height?.(point.x+x,point.z+z)??point.y)-point.y,z);m.scale.setScalar(heal?1.05:.9);mesh.add(m);
  }
  for(let i=0;i<(fire?7:5);i++){
   const a=i/(fire?7:5)*Math.PI*2,m=style?this.visuals.sigil(style):fire?this.visuals.flame():this.visuals.puff(heal);
   m.position.set(Math.cos(a)*radius*.64,.35,Math.sin(a)*radius*.64);m.scale.setScalar(fire?1:1.4);mesh.add(m);motes.push(m);
  }
  this.root.add(mesh);this.zones.push({mesh,radius,life,max:life,damage,slow,heal,tick:0,motes,fire,style});
 }
 speedMultiplier(target:SpellTarget){return (this.chilled.get(target)??0)>this.clock?.45:this.zones.some(z=>z.slow&&z.mesh.position.distanceTo(target.mesh.position)<z.radius)? .65:1;}
 healingAt(position:T.Vector3){return this.zones.some(z=>z.heal&&z.mesh.position.distanceTo(position)<z.radius)?3:0;}
 update(dt:number,player:T.Vector3,build:Build,baseDamage:number,targets:SpellTarget[],hit:(target:SpellTarget,damage:number)=>void){
  this.clock+=dt;this.trailAt-=dt;const emitTrail=this.trailAt<=0;if(emitTrail)this.trailAt=.06;
  const live=targets.filter(t=>t.hp>0),velocity=new Map<SpellTarget,T.Vector3>();
  for(const t of live){const before=this.previousTargets.get(t);if(before&&dt>0){const v=t.mesh.position.clone().sub(before).divideScalar(dt);v.y=0;v.clampLength(0,12);velocity.set(t,v);}this.previousTargets.set(t,t.mesh.position.clone());}
  const aimAt=(t:SpellTarget,origin:T.Vector3,speed:number)=>center(t).addScaledVector(velocity.get(t)??new T.Vector3(),Math.min(.35,origin.distanceTo(center(t))/speed)*.75);
  const alive=()=>live;
  const near=(origin:T.Vector3)=>live.filter(t=>t.hp>0).sort((a,b)=>a.mesh.position.distanceToSquared(origin)-b.mesh.position.distanceToSquared(origin));
  const hurt=(t:SpellTarget,n:number)=>{if(t.hp>0)hit(t,n*(Math.random()<modifiers(build).crit?2:1));};
  const splash=(p:T.Vector3,r:number,n:number)=>{for(const t of alive())if(t.mesh.position.distanceTo(p)<r+(t.boss?1.3:.4))hurt(t,n);};
  for(const id of WEAPONS){
   if(!itemLevel(build,id)||id==='petal')continue;
   this.timers[id]=(this.timers[id]??0)-dt;
   if(this.timers[id]!>0)continue;
   const candidates=near(player),origin=player.clone().add(new T.Vector3(0,.9,0));
   const list=id==="thorn"||id==="cannon"?candidates.filter(t=>!this.feedback.collision?.(origin,center(t))):candidates,target=list[0];if(!target||target.mesh.position.distanceTo(player)>17)continue;
   const s=spellStats(build,id),damage=baseDamage*s.damage*(build.mastery===id&&s.evolved?1.15:1),color=s.evolved?SPELL_COLORS[id].evolved:SPELL_COLORS[id].base;
   if(['sword','axe','hammer','frost','quake'].includes(id)&&(Math.hypot(target.mesh.position.x-player.x,target.mesh.position.z-player.z)>s.area+(target.radius??.6)||Math.abs(target.mesh.position.y-player.y)>2.2))continue;
   this.timers[id]=s.cooldown;this.feedback.cast?.(id,target.mesh.position);this.feedback.audio?.play(id==='storm'?'storm':id==='cannon'?'cannon':id==='sword'?'sword':id==='axe'?'axe':'cast');
   if(id==='frost'){
    for(const t of live)if(t.mesh.position.distanceTo(player)<s.area+(t.radius??.6)){this.chilled.set(t,this.clock+s.duration);hurt(t,damage);}
    for(let i=0;i<8;i++){const a=i*Math.PI/4,p=this.visuals.sigil('frost',s.evolved);p.position.copy(player).add(new T.Vector3(Math.cos(a)*s.area,.4,Math.sin(a)*s.area));this.root.add(p);this.flashes.push({object:p,life:.35});}
    this.flashes.push({object:this.ring(player,s.area,color),life:.35});
   }
   if(id==='void'||id==='venom')this.zone(target.mesh.position,s.area,s.duration,damage,id==='venom'&&s.evolved,false,color,false,id);
   if(id==='quake'){
    splash(player,s.area,damage);
    for(let i=0;i<10;i++){const a=i*Math.PI/5,p=this.visuals.sigil('quake',s.evolved);p.position.copy(player).add(new T.Vector3(Math.cos(a)*s.area*.7,.3,Math.sin(a)*s.area*.7));p.scale.y=1.6;this.root.add(p);this.flashes.push({object:p,life:.45});}
    this.flashes.push({object:this.ring(player,s.area,color),life:.35});this.feedback.audio?.play('hammer');
   }
   if(id==='dagger'||id==='beam'){
    const count=id==='beam'?1:s.count;
    for(let i=0;i<count;i++){
     const aim=aimAt(target,origin,id==='beam'?65:30).sub(origin).normalize().applyAxisAngle(new T.Vector3(0,1,0),(i-(count-1)/2)*.13);
     const mesh=this.visuals.sigil(id,s.evolved);mesh.position.copy(origin);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),aim);if(id==='beam')mesh.scale.set(2,2,3);this.root.add(mesh);
     this.projectiles.push({mesh,velocity:aim.multiplyScalar(id==='beam'?65:30),life:id==='beam'?.4:1.1,damage,remaining:s.pierce+1,hit:new Set(),burst:false,color});
    }
   }
   if(id==='cannon'){
    for(let i=0;i<s.count;i++){
     const aimed=list[i%Math.min(list.length,3)],origin=player.clone().add(new T.Vector3(0,.95,0)),aim=aimAt(aimed,origin,24).sub(origin).normalize();
     aim.applyAxisAngle(new T.Vector3(0,1,0),(i-(s.count-1)/2)*.075);
     const mesh=this.visuals.cannonball(s.evolved);mesh.position.copy(origin);this.root.add(mesh);this.feedback.fx?.burst(origin,color,5,2);
     this.projectiles.push({mesh,velocity:aim.multiplyScalar(24),life:1.5,damage,remaining:1,hit:new Set(),burst:false,explosion:s.area,color});
    }
   }
   if(id==='sword'||id==='axe'||id==='hammer'){
    const direction=target.mesh.position.clone().sub(player);direction.y=0;direction.normalize();
    const arc=id==='hammer'||s.evolved?Math.PI*2:id==='axe'?Math.PI*1.25:Math.PI*.9;
    this.melee.push({id,direction,delay:id==='hammer'?.13:id==='axe'?.12:.07,radius:s.area,damage,arc,color,evolved:s.evolved,width:.35+s.level*.09});
   }
   if(id==='thorn'){
    for(let i=0;i<s.count;i++){
     const target=list[i%Math.min(list.length,3)];
     const origin=player.clone().add(new T.Vector3(0,.9,0));
     const aim=aimAt(target,origin,28).sub(origin).normalize();
     aim.applyAxisAngle(new T.Vector3(0,1,0),(i-(s.count-1)/2)*.055);
     const mesh=this.visuals.thorn(s.evolved);mesh.scale.setScalar(s.evolved?.85:.65);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),aim);mesh.position.copy(origin);this.feedback.fx?.burst(origin,color,3,1);this.root.add(mesh);
     this.projectiles.push({mesh,velocity:aim.multiplyScalar(28),life:1.3,damage,remaining:s.pierce+1,hit:new Set(),burst:s.evolved});
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
  for(let i=this.melee.length-1;i>=0;i--){
   const swing=this.melee[i];swing.delay-=dt;if(swing.delay>0)continue;
   for(const enemy of alive()){
    if(enemy.hp<=0)continue;
    const offset=enemy.mesh.position.clone().sub(player),vertical=Math.abs(offset.y);offset.y=0;
    if(vertical>2.8||offset.length()>swing.radius+(enemy.radius??.6))continue;
    if(swing.id==="sword"){
     const forward=offset.dot(swing.direction),side=offset.x*swing.direction.z-offset.z*swing.direction.x,lanes=swing.evolved?[-1,0,1]:[0];
     if(forward>=0&&forward<=swing.radius+(enemy.radius??.6)&&lanes.some(lane=>Math.abs(side-lane)<swing.width+(enemy.radius??.6)))hurt(enemy,swing.damage);
    }else if(swing.arc>=Math.PI*2||offset.length()<.7||offset.normalize().dot(swing.direction)>=Math.cos(swing.arc/2))hurt(enemy,swing.damage);
   }
   const angle=Math.atan2(swing.direction.x,swing.direction.z);
   if(swing.id==='hammer')this.flashes.push({object:this.ring(player,swing.radius,swing.color),life:.2});
   else{const effect=swing.id==='sword'?this.visuals.swordStrike(player,swing.radius,angle,swing.color,swing.evolved):this.visuals.axeCleave(player,swing.radius,angle,swing.color,swing.evolved);this.root.add(effect);this.cuts.push({object:effect,age:0,max:swing.id==='sword'?.16:.21,kind:swing.id,angle});}
   this.feedback.fx?.burst(player.clone().addScaledVector(swing.direction,1.5),swing.color,swing.id==='hammer'?15:6,swing.id==='hammer'?4:2);
   if(swing.id==='hammer')this.feedback.audio?.play('hammer');
   this.melee.splice(i,1);
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
   const p=this.projectiles[i];p.life-=dt;const previous=p.mesh.position.clone();p.mesh.position.addScaledVector(p.velocity,dt);const wall=this.feedback.collision?.(previous,p.mesh.position);if(wall){p.mesh.position.copy(wall);p.life=0;this.feedback.fx?.burst(wall,p.color??"#b8e96a",4,2);}const segment=new T.Line3(previous,p.mesh.position);if(emitTrail)this.feedback.fx?.trail(p.mesh.position,p.color??(p.burst?'#ffe16a':'#aceb3d'),.12);
   const crossed=alive().filter(t=>t.hp>0&&!p.hit.has(t)&&segment.closestPointToPoint(center(t),true,new T.Vector3()).distanceTo(center(t))<=(t.radius??(t.boss?2:.85))).sort((a,b)=>segment.closestPointToPoint(center(a),true,new T.Vector3()).distanceToSquared(previous)-segment.closestPointToPoint(center(b),true,new T.Vector3()).distanceToSquared(previous));
   for(const t of crossed){
    if(t.hp<=0||p.hit.has(t)||segment.closestPointToPoint(center(t),true,new T.Vector3()).distanceTo(center(t))>(t.radius??(t.boss?2:.85)))continue;
    p.hit.add(t);if(p.explosion){splash(t.mesh.position,p.explosion,p.damage);this.feedback.fx?.burst(center(t),p.color??'#9de8ff',14,4);this.flashes.push({object:this.ring(t.mesh.position,p.explosion,p.color??'#9de8ff'),life:.25});this.feedback.audio?.play('hit');}else hurt(t,p.damage);
    if(p.burst){splash(t.mesh.position,1.3,p.damage*.25);this.flashes.push({object:this.ring(t.mesh.position,1.3,'#ffe592'),life:.22});}
    if(--p.remaining<=0){p.life=0;break;}
   }
   if(p.life<=0){this.discard(p.mesh);this.projectiles.splice(i,1);}
  }
  for(let i=this.meteors.length-1;i>=0;i--){
   const m=this.meteors[i];m.life-=dt;m.mesh.position.y=m.point.y+Math.max(.35,m.life*10);m.mesh.rotation.y+=dt*7;if(emitTrail){this.feedback.fx?.trail(m.mesh.position,'#ffae58',.3);this.feedback.fx?.trail(m.mesh.position.clone().add(new T.Vector3(0,.45,0)),'#fa7053',.2);}
   if(m.life<=0){this.feedback.fx?.burst(m.point.clone().add(new T.Vector3(0,.3,0)),'#ffc578',16,7);this.feedback.fx?.ring(m.point,m.radius*1.2,'#ffe7ab',.28);this.feedback.audio?.play('meteor');splash(m.point,m.radius,m.damage);this.discard(m.mesh);this.discard(m.marker);this.flashes.push({object:this.ring(m.point,m.radius,'#ffe2a1'),life:.3});if(m.burn)this.zone(m.point,m.radius,4,m.damage*.15,false,false,'#ff933d',true);this.meteors.splice(i,1);}
  }
  for(let i=this.zones.length-1;i>=0;i--){
   const z=this.zones[i];z.life-=dt;z.tick-=dt;if(emitTrail){const a=this.clock*3+i*2;this.feedback.fx?.trail(z.mesh.position.clone().add(new T.Vector3(Math.cos(a)*z.radius*.7,.3+Math.sin(a)*.15,Math.sin(a)*z.radius*.7)),z.style==='void'?'#b299ff':z.style==='frost'?'#8eeaff':z.fire?'#ff7136':z.heal?'#63efc6':'#8ddb46',.12);}
   if(z.style==='void')for(const t of live){const offset=z.mesh.position.clone().sub(t.mesh.position);offset.y=0;const d=offset.length();if(t.hp>0&&d<z.radius&&d>.3){const next=t.mesh.position.clone().addScaledVector(offset.normalize(),Math.min(d-.3,dt*(t.boss?.7:3.8)));if(!this.feedback.collision?.(t.mesh.position,next))t.mesh.position.copy(next);}}
   if(z.tick<=0){z.tick=.5;splash(z.mesh.position,z.radius,z.damage);}
   z.motes.forEach((m,j)=>{const angle=j/z.motes.length*Math.PI*2+(z.fire?0:this.clock*.6),x=Math.cos(angle)*z.radius*.64,zp=Math.sin(angle)*z.radius*.64;m.position.set(x,(this.feedback.height?.(z.mesh.position.x+x,z.mesh.position.z+zp)??z.mesh.position.y)-z.mesh.position.y+(z.fire?.05:.38+Math.sin(this.clock*3+j)*.15),zp);m.rotation.y=this.clock*(z.fire?1.5:.5)+j;m.scale.setScalar(Math.min(1,(z.max-z.life)*8,z.life*4)*(z.fire?.8+Math.sin(this.clock*10+j)*.16:.85));});
   if(z.life<=0){this.discard(z.mesh);this.zones.splice(i,1);}
  }
  for(let i=this.cuts.length-1;i>=0;i--){const c=this.cuts[i];c.age+=dt;const t=c.age/c.max;if(t>=1){this.discard(c.object);this.cuts.splice(i,1);continue;}const tail=Math.min(1,(1-t)*4);if(c.kind==="sword"){c.object.scale.set(tail,tail,.45+.55*Math.min(1,c.age/.055));}else{c.object.rotation.y=c.angle+(t-.25)*.55;const grow=.55+.45*Math.min(1,c.age/.045);c.object.scale.set(grow*tail,1,grow*tail);}}
  for(let i=this.flashes.length-1;i>=0;i--){const f=this.flashes[i];f.life-=dt;if(f.life>0&&f.life<.1){f.object.userData.finishScale??=f.object.scale.clone();f.object.scale.copy(f.object.userData.finishScale).multiplyScalar(Math.max(.01,f.life/.1));}if(f.life<=0){this.discard(f.object);this.flashes.splice(i,1);}}
 }
 clear(){for(const child of [...this.root.children])this.discard(child);this.timers={};this.projectiles=[];this.zones=[];this.meteors=[];this.petals=[];this.flashes=[];this.clock=0;this.orbitTick=0;this.trailAt=0;this.petalEvolved=false;this.melee=[];this.cuts=[];this.previousTargets=new WeakMap();this.chilled=new WeakMap();}
 dispose(){this.clear();this.visuals.dispose();this.root.removeFromParent();}
}

