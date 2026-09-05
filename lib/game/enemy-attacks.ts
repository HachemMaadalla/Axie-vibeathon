import * as T from 'three';
import {toonMaterial} from './toon';
import type {ShotStyle,EnemyUnit} from './enemies';
import type {CollisionWorld} from './collisions';
import type {CombatFX} from './combat-fx';
type Threat={root:T.Group;kind:'shot'|'wave'|'zone'|'warning';life:number;radius:number;limit:number;velocity:T.Vector3;damage:number;color:string;owner?:EnemyUnit;hit:boolean;armed:boolean;delay:number;age:number;size:number};
export class EnemyAttacks{
 readonly threats:Threat[]=[];
 constructor(private scene:T.Scene,private height:(x:number,z:number)=>number,private fx:CombatFX,private sound:()=>void){}
 private add(kind:Threat['kind'],point:T.Vector3,life:number,color:string,owner?:EnemyUnit):Threat|undefined{
  if(this.threats.length>=160||kind==='shot'&&this.threats.filter(t=>t.kind==='shot').length>=80)return;const root=new T.Group();root.name='enemy-'+kind;root.position.copy(point);this.scene.add(root);
  const t:Threat={root,kind,life,radius:0,limit:0,velocity:new T.Vector3(),damage:0,color,owner,hit:false,armed:false,delay:0,age:0,size:.23};this.threats.push(t);return t;
 }
 private ring(t:Threat,radius:number,fill=false){
  const specs=fill?[[0,radius,t.color,.18],[Math.max(0,radius-.12),radius+.08,'#243044',1],[Math.max(0,radius-.07),radius,t.color,1]]:[[Math.max(0,radius-.17),radius+.08,'#243044',1],[Math.max(0,radius-.1),radius,t.color,1]];
  specs.forEach(([inner,outer,color,opacity],i)=>{
   const mesh=new T.Mesh(new T.RingGeometry(Number(inner),Number(outer),48),new T.MeshBasicMaterial({color:String(color),transparent:Number(opacity)<1,opacity:Number(opacity),side:T.DoubleSide,depthWrite:false}));
   mesh.userData.lift=.14+i*.015;const p=mesh.geometry.attributes.position,base=new Float32Array(p.count*2);
   for(let j=0;j<p.count;j++){base[j*2]=p.getX(j);base[j*2+1]=p.getY(j);}mesh.userData.groundBase=base;t.root.add(mesh);
  });this.conform(t,1);
 }
 private conform(t:Threat,scale:number){
  for(const o of t.root.children){if(!(o instanceof T.Mesh)||!o.userData.groundBase)continue;
   const base=o.userData.groundBase as Float32Array,p=o.geometry.attributes.position;
   for(let j=0;j<p.count;j++){const x=base[j*2]*scale,z=base[j*2+1]*scale;p.setXYZ(j,x,this.height(t.root.position.x+x,t.root.position.z+z)-t.root.position.y+o.userData.lift,z);}
   p.needsUpdate=true;o.geometry.computeBoundingSphere();
  }
 }
 warning(point:T.Vector3,radius:number,duration:number,owner?:EnemyUnit){const t=this.add('warning',point,duration,'#ffb45c',owner);if(t)this.ring(t,radius);}
 lane(point:T.Vector3,heading:T.Vector3,length:number,width:number,duration:number,owner?:EnemyUnit){
  const t=this.add('warning',point,duration,'#ffc469',owner);if(!t)return;
  for(let i=0;i<6;i++){
   const shape=new T.Shape();shape.moveTo(-width*.25,0);shape.lineTo(0,.6);shape.lineTo(width*.25,0);shape.lineTo(0,.22);shape.closePath();
   const mesh=new T.Mesh(new T.ShapeGeometry(shape),new T.MeshBasicMaterial({color:i%2?'#ffdc83':'#983e34',side:T.DoubleSide,depthWrite:false}));
   const a=Math.atan2(heading.x,heading.z),distance=(i+.5)*length/6,p=mesh.geometry.attributes.position;
   for(let j=0;j<p.count;j++){const x=p.getX(j),z=p.getY(j),wx=x*Math.cos(a)+z*Math.sin(a)+heading.x*distance,wz=-x*Math.sin(a)+z*Math.cos(a)+heading.z*distance;p.setXYZ(j,wx,this.height(point.x+wx,point.z+wz)-point.y+.18,wz);}
   p.needsUpdate=true;mesh.geometry.computeBoundingSphere();t.root.add(mesh);
  }
 }
 shot(from:T.Vector3,to:T.Vector3,style:ShotStyle={},owner?:EnemyUnit){
  const t=this.add('shot',from,3.5,style.color??'#df9cfa',owner);if(!t)return;t.damage=style.damage??11;t.size=style.size??.23;t.velocity.copy(to).sub(from).normalize().multiplyScalar(style.speed??10);
  const form=style.form??'crystal',geometry=form==='spore'||form==='petal'?new T.SphereGeometry(t.size,10,6):form==='thorn'?new T.ConeGeometry(t.size*.7,t.size*3,5):new T.OctahedronGeometry(t.size);
  const core=new T.Mesh(geometry,toonMaterial(t.color));if(form==='petal')core.scale.set(1.3,.38,1.4);if(form==='thorn')core.rotation.x=Math.PI/2;
  core.add(new T.Mesh(geometry.clone().scale(1.2,1.2,1.2),new T.MeshBasicMaterial({color:'#223245',side:T.BackSide})));t.root.add(core);
  const glint=new T.Mesh(new T.SphereGeometry(t.size*.3,6,4),new T.MeshBasicMaterial({color:'#fff2ce'}));glint.position.set(-t.size*.25,t.size*.25,t.size*.7);core.add(glint);this.fx.burst(from,t.color,3,1.5);
 }
 wave(point:T.Vector3,radius:number,owner?:EnemyUnit){
  const t=this.add('wave',point,2,owner?.kind==='golem'?'#7eddef':owner?.kind==='brute'?'#b9e8ef':'#ffc366',owner);if(!t)return;t.radius=.25;t.limit=radius;t.damage=owner?.boss?22:14;this.ring(t,1);this.conform(t,.25);this.fx.burst(point,'#edd29b',18,6);this.sound();
 }
 zone(point:T.Vector3,radius:number,delay:number,damage:number,color:string,owner?:EnemyUnit){
  if(Math.hypot(point.x,point.z)>28)return;point=point.clone();point.y=this.height(point.x,point.z);const t=this.add('zone',point,delay+.55,color,owner);if(!t)return;t.radius=radius;t.delay=delay;t.damage=damage;this.ring(t,radius,true);
 }
 cancel(owner:EnemyUnit){for(let i=this.threats.length-1;i>=0;i--)if(this.threats[i].owner===owner)this.remove(i);}
 private remove(i:number){const t=this.threats[i];t.root.removeFromParent();t.root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});this.threats.splice(i,1);}
 update(dt:number,player:T.Vector3,damage:(n:number,point:T.Vector3)=>void,collisions?:CollisionWorld){
  const center=player.clone().add(new T.Vector3(0,.85,0)),grounded=player.y-this.height(player.x,player.z)<1.15;
  for(let i=this.threats.length-1;i>=0;i--){
   const t=this.threats[i];if(t.owner&&t.owner.hp<=0){this.remove(i);continue;}t.life-=dt;t.age+=dt;
   if(t.kind==='shot'){
    const prev=t.root.position.clone();t.root.position.addScaledVector(t.velocity,dt);
    const wall=collisions?.firstHit(prev,t.root.position),nearest=new T.Line3(prev,t.root.position).closestPointToPoint(center,true,new T.Vector3());
    if(wall){t.root.position.copy(wall);t.life=0;}else if(nearest.distanceTo(center)<.58+t.size){damage(t.damage,t.root.position);t.life=0;}
    t.root.rotation.y+=dt*6;if(t.age%.08<dt)this.fx.trail(t.root.position,t.color,.09);
    if(t.root.position.y<this.height(t.root.position.x,t.root.position.z)||Math.hypot(t.root.position.x,t.root.position.z)>31)t.life=0;
   }else if(t.kind==='wave'){
    const last=t.radius;t.radius=Math.min(t.limit,t.radius+dt*8);this.conform(t,t.radius);
    const d=Math.hypot(player.x-t.root.position.x,player.z-t.root.position.z);
    if(!t.hit&&grounded&&d>=last-.65&&d<=t.radius+.65){damage(t.damage,t.root.position);t.hit=true;}if(t.radius>=t.limit)t.life=0;
   }else if(t.kind==='zone'&&!t.armed&&t.age>=t.delay){
    t.armed=true;this.fx.burst(t.root.position,t.color,16,5);this.fx.ring(t.root.position,t.radius,t.color,.35);this.sound();
    for(let j=0;j<7;j++){const a=j*2.4,r=Math.sqrt(j/7)*t.radius*.8,x=Math.sin(a)*r,z=Math.cos(a)*r;
     const puff=t.owner?.kind==='bomber'||t.owner?.kind==='broodqueen',geometry=puff?new T.SphereGeometry(.4+j%3*.1,8,6):t.owner?.kind==='golem'?new T.OctahedronGeometry(.45):new T.ConeGeometry(.23,.9+j%3*.3,5);
     const m=new T.Mesh(geometry,toonMaterial(t.color));if(t.owner?.kind==='golem')m.scale.y=2;m.position.set(x,this.height(t.root.position.x+x,t.root.position.z+z)-t.root.position.y+.5,z);m.rotation.z=Math.sin(a)*.25;t.root.add(m);}
    if(grounded&&Math.hypot(player.x-t.root.position.x,player.z-t.root.position.z)<t.radius+.4)damage(t.damage,t.root.position);
   }
   if(t.life<=0)this.remove(i);
  }
 }
 clear(){for(let i=this.threats.length-1;i>=0;i--)this.remove(i);}
}
