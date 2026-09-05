import type {Stars} from './quality';
import * as T from 'three';
import type {EnemyKind} from './enemies';
import {CROPS,type CropId,type Loot} from './state';
import {inkMaterial} from './spell-visuals';
import {toonMaterial} from './toon';
import {itemSprite} from './item-art';
export type PickupKind='xp'|keyof Loot;
export type Pickup={stars?:Stars;kind:PickupKind;amount:number;position:T.Vector3;ground:number;age:number;pulling:boolean;pullAge:number;visual?:T.Group};
export type Drop={kind:PickupKind;amount:number};
// One roll per monster: seeds 8%, fertilizer 4%, rich soil 2%.
export function rollDrops(tier:number,boss=false,random:()=>number=Math.random,kind?:EnemyKind,keyStars:Stars=1):Drop[]{
 if(boss)return [{kind:tier===2?'crystalbean':'glowcap',amount:keyStars},{kind:'soil',amount:keyStars}];
 const r=random()/(1+(keyStars-1)*.5);
 if(r<.08){const pool:CropId[]=tier===2?['embercorn','starpepper','crystalbean','cloudmelon']:['moonberry','cloudmelon','glowcap','dewleaf'];const favored:Record<string,number>={beetle:1,stalker:0,shaman:2,moth:3,bomber:2,crystal:3,brute:1};const index=kind&&Object.hasOwn(favored,kind)?favored[kind]:Math.min(pool.length-1,Math.floor(r/.08*pool.length));return [{kind:pool[index],amount:1}];}
 if(r<.12)return [{kind:'fertilizer',amount:1}];
 if(r<.14)return [{kind:'soil',amount:1}];
 return [];
}
const MAX_PICKUPS=768;
export class BattlePickups{
 readonly root=new T.Group();
 readonly items:Pickup[]=[];
 private gems:T.InstancedMesh;private ink:T.InstancedMesh;
 private materials=new Map<PickupKind,T.Material>();
 private textures:T.Texture[]=[];
 private shapes:T.BufferGeometry[]=[];
 private supplyGeometry=new Map<string,T.BufferGeometry>();
 private clock=0;
 private matrix=new T.Matrix4();
 private rotation=new T.Quaternion();
 private scale=new T.Vector3();
 private display=new T.Vector3();
 constructor(parent:T.Object3D,private height:(x:number,z:number)=>number,private radius:number){
  this.root.name='battle-pickups';parent.add(this.root);
  const gem=new T.OctahedronGeometry(.27),material=toonMaterial('#72f6cf');material.emissive.set('#0e6653');material.emissiveIntensity=.55;
  this.gems=new T.InstancedMesh(gem,material,MAX_PICKUPS);this.gems.count=0;this.gems.frustumCulled=false;this.gems.instanceMatrix.setUsage(T.DynamicDrawUsage);this.root.add(this.gems);
  this.ink=new T.InstancedMesh(gem,inkMaterial(.055),MAX_PICKUPS);this.ink.instanceMatrix=this.gems.instanceMatrix;this.ink.frustumCulled=false;this.ink.count=0;this.gems.add(this.ink);
  this.shapes.push(gem);this.materials.set('xp',material);
  const loader=typeof document!=='undefined'?new T.TextureLoader():null;
  for(const id of Object.keys(CROPS) as CropId[]){
   const texture=loader?.load('/assets/crops/'+id+'-seed.png')??null;
   if(texture){texture.colorSpace=T.SRGBColorSpace;this.textures.push(texture);}
   this.materials.set(id,new T.SpriteMaterial({map:texture,color:texture?'#ffffff':CROPS[id].color,transparent:true,depthWrite:false}));
  }
  this.supplyGeometry.set('soil',new T.BoxGeometry(.62,.72,.45));this.shapes.push(...this.supplyGeometry.values());
  this.materials.set('soil',toonMaterial('#bf8953'));
  const fertilizer=loader?.load(itemSprite('fertilizer')!)??null;
  if(fertilizer){fertilizer.colorSpace=T.SRGBColorSpace;this.textures.push(fertilizer);}
  this.materials.set('fertilizer',new T.SpriteMaterial({map:fertilizer,color:fertilizer?'#ffffff':'#67e6bc',transparent:true,depthWrite:false}));
 }
 spawn(kind:PickupKind,amount:number,at:T.Vector3,stars:Stars=1){
  if(amount<=0)return;
  // Merge instead of dropping rewards if the pool is full; never grant them remotely.
  if(this.items.length>=MAX_PICKUPS){
   let nearest:Pickup|undefined,distance=Infinity;
   for(const p of this.items)if(p.kind===kind&&(p.stars??1)===stars){const d=p.position.distanceToSquared(at);if(d<distance){nearest=p;distance=d;}}
   if(nearest){nearest.amount+=amount;return;}
  }
  const point=at.clone(),n=this.items.length;
  point.x+=Math.sin(n*2.4)*.55;point.z+=Math.cos(n*2.4)*.55;
  const r=Math.hypot(point.x,point.z),limit=this.radius-4;if(r>limit){point.x*=limit/r;point.z*=limit/r;}
  const ground=Math.max(.12,this.height(point.x,point.z));point.y=ground+.45;
  const item:Pickup={stars,kind,amount,position:point,ground,age:0,pulling:false,pullAge:0};
  if(kind!=='xp'){
   const group=new T.Group();group.name='pickup-'+kind;
   for(let i=0;i<stars;i++){const s=new T.Shape();for(let j=0;j<10;j++){const a=j*Math.PI/5,r=j%2?.045:.105,x=Math.sin(a)*r,y=Math.cos(a)*r;if(j===0)s.moveTo(x,y);else s.lineTo(x,y);}s.closePath();const mark=new T.Mesh(new T.ShapeGeometry(s),new T.MeshBasicMaterial({color:stars===3?'#ffd05e':stars===2?'#b6e2f4':'#fff1c7',side:T.DoubleSide}));mark.position.set((i-(stars-1)/2)*.24,1.25,.03);group.add(mark);}
   if(Object.hasOwn(CROPS,kind)||kind==='fertilizer'){
    const sprite=new T.Sprite(this.materials.get(kind) as T.SpriteMaterial);sprite.scale.set(1.65,1.65,1);sprite.position.y=.45;group.add(sprite);
   }else{
    const geometry=this.supplyGeometry.get(kind)!;const body=new T.Mesh(geometry,this.materials.get(kind));body.position.y=.28;group.add(body);
   }
   const ringGeometry=new T.RingGeometry(.37,.45,24),ringMaterial=new T.MeshBasicMaterial({color:Object.hasOwn(CROPS,kind)?'#ffe085':'#98f5d4',side:T.DoubleSide,transparent:true,opacity:.7,depthWrite:false});
   const ring=new T.Mesh(ringGeometry,ringMaterial);ring.rotation.x=-Math.PI/2;ring.position.y=-.33;group.add(ring);group.position.copy(point);
   this.root.add(group);item.visual=group;
  }
  this.items.push(item);this.render();
 }
 update(dt:number,player:T.Vector3,collect:(kind:PickupKind,amount:number,point:T.Vector3,stars:Stars)=>void,bonusReach=0){
  if(dt<=0)return;this.clock+=dt;
  for(let i=this.items.length-1;i>=0;i--){
   const item=this.items[i];item.age+=dt;
   const dx=player.x-item.position.x,dz=player.z-item.position.z,reach=(item.kind==='xp'?4.5:3)+Math.max(0,Math.min(4,bonusReach));
   if(item.age>.3&&dx*dx+dz*dz<reach*reach&&Math.abs(player.y-item.ground)<5.5)item.pulling=true;
   if(item.pulling){
    item.pullAge+=dt;
    this.display.copy(player);this.display.y+=.8;
    const distance=item.position.distanceTo(this.display),step=dt*(8+Math.min(1,item.pullAge/.2)*28);
    if(distance<=Math.max(.5,step)){
     this.items.splice(i,1);this.removeVisual(item);collect(item.kind,item.amount,item.position.clone(),item.stars??1);continue;
    }
    item.position.lerp(this.display,step/distance);
   }
  }
  this.render();
 }
 private render(){
  let count=0;
  for(const p of this.items){
   this.display.copy(p.position);
   if(!p.pulling)this.display.y+=Math.sin(Math.min(1,p.age/.45)*Math.PI)*.75+Math.sin(this.clock*3+p.position.x)*.09;
   if(p.kind==='xp'){
    this.rotation.setFromAxisAngle(T.Object3D.DEFAULT_UP,this.clock*1.6);
    this.scale.setScalar(p.amount>=5?1.5:p.amount>=2?1.2:1);
    this.matrix.compose(this.display,this.rotation,this.scale);this.gems.setMatrixAt(count++,this.matrix);
   }else if(p.visual){p.visual.position.copy(this.display);p.visual.rotation.y=Math.sin(this.clock*2)*.13;}
  }
  this.gems.count=count;this.ink.count=count;this.gems.instanceMatrix.needsUpdate=true;
 }
 private removeVisual(p:Pickup){
  if(!p.visual)return;this.root.remove(p.visual);
  p.visual.traverse(o=>{if(o instanceof T.Mesh){if(!this.shapes.includes(o.geometry))o.geometry.dispose();if(![...this.materials.values()].includes(o.material as T.Material))(o.material as T.Material).dispose();}});
 }
 clear(){for(const p of this.items)this.removeVisual(p);this.items.length=0;this.gems.count=0;this.ink.count=0;}
 dispose(){this.clear();(this.ink.material as T.Material).dispose();this.ink.dispose();this.gems.dispose();this.root.removeFromParent();for(const geo of this.shapes)geo.dispose();for(const mat of this.materials.values())mat.dispose();for(const texture of this.textures)texture.dispose();}
}

