import * as T from 'three';
import {DEFAULT_WORLD_BASIS} from '../gameblocks/modules/math/WorldBasis.js';

// Ground-plane movement stays aligned with the view, including after a full orbit.
export function cameraMovement(x:number,z:number,yaw:number){
 return DEFAULT_WORLD_BASIS.fromBasisComponents(x*Math.cos(yaw)+z*Math.sin(yaw),0,-z*Math.cos(yaw)+x*Math.sin(yaw)).normalize();
}

export class FollowCamera {
 yaw=0;pitch=.48;readonly distance=18;
 private focus=new T.Vector3();
 private ray=new T.Raycaster();
 private pointers=new Map<number,{x:number;y:number;startX:number;startY:number;dragged:boolean;button:number}>();
 private abort=new AbortController();
 private collisionDistance=18;
 constructor(private camera:T.PerspectiveCamera,private canvas:HTMLCanvasElement,private active:()=>boolean,private tap:(e:PointerEvent)=>void){
  const signal=this.abort.signal;
  canvas.addEventListener('pointerdown',this.down,{signal});
  canvas.addEventListener('pointermove',this.move,{signal});
  canvas.addEventListener('pointerup',this.up,{signal});
  canvas.addEventListener('pointercancel',this.cancel,{signal});
  canvas.addEventListener('lostpointercapture',this.cancel,{signal});
  canvas.addEventListener('wheel',this.wheel,{signal,passive:false});
  canvas.addEventListener('contextmenu',e=>e.preventDefault(),{signal});
 }
 rotate(dx:number,dy:number){
  this.yaw=T.MathUtils.euclideanModulo(this.yaw-dx*.005,Math.PI*2);
  this.pitch=T.MathUtils.clamp(this.pitch+dy*.004,.08,1.48);
 }
 snap(player:T.Vector3){this.focus.copy(player).y+=1.1;this.place([]);}
 reset(yaw=0){this.yaw=yaw;this.pitch=.48;}
 movement(x:number,z:number){return cameraMovement(x,z,this.yaw);}
 update(dt:number,player:T.Vector3,obstacles:T.Object3D[],height?:(x:number,z:number)=>number){
  if(!this.active())this.cancel();
  // Smooth the target rather than the camera's world position, so rotating can never
  // interpolate through the Axie when the view changes by 180 degrees.
  const target=player.clone();target.y+=1.1;
  this.focus.lerp(target,1-Math.exp(-dt*16));
  this.place(obstacles,dt);
  if(height){this.camera.position.y=Math.max(this.camera.position.y,height(this.camera.position.x,this.camera.position.z)+1);this.camera.lookAt(this.focus);this.camera.updateMatrixWorld();}
 }
 private place(obstacles:T.Object3D[],dt=0){
  const offset=new T.Vector3(Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),Math.cos(this.yaw)*Math.cos(this.pitch));
  this.ray.set(this.focus,offset);this.ray.near=0;this.ray.far=this.distance+.4;
  const hit=this.ray.intersectObjects(obstacles,false)[0];
  const distance=hit?Math.max(3,Math.min(this.distance,hit.distance-.45)):this.distance;
  this.collisionDistance=dt<=0||distance<this.collisionDistance?distance:T.MathUtils.lerp(this.collisionDistance,distance,1-Math.exp(-dt*9));
  this.camera.position.copy(this.focus).addScaledVector(offset,this.collisionDistance);
  this.camera.lookAt(this.focus);this.camera.updateMatrixWorld();
 }
 private down=(e:PointerEvent)=>{
  if(!this.active()||e.button!==0&&e.button!==2)return;
  e.preventDefault();this.canvas.setPointerCapture(e.pointerId);
  this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,dragged:false,button:e.button});
  if(this.pointers.size>1)for(const p of this.pointers.values())p.dragged=true;
 };
 private move=(e:PointerEvent)=>{
  const p=this.pointers.get(e.pointerId);if(!p||!this.active())return;
  const dx=e.clientX-p.x,dy=e.clientY-p.y;
  const other=[...this.pointers.entries()].find(([id])=>id!==e.pointerId)?.[1];
  if(other){
   // Multi-touch cannot change distance or trigger click-to-walk.
   p.dragged=true;
  }else{
   if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>5)p.dragged=true;
   if(p.dragged)this.rotate(dx,dy);
  }
  p.x=e.clientX;p.y=e.clientY;
 };
 private up=(e:PointerEvent)=>{
  const p=this.pointers.get(e.pointerId);this.pointers.delete(e.pointerId);
  if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);
  if(p&&!p.dragged&&p.button===0&&this.active())this.tap(e);
 };
 private cancel=()=>{
  const ids=[...this.pointers.keys()];this.pointers.clear();
  for(const id of ids)if(this.canvas.hasPointerCapture(id))this.canvas.releasePointerCapture(id);
 };
 private wheel=(e:WheelEvent)=>{
  if(!this.active())return;
  e.preventDefault();
 };
 dispose(){this.cancel();this.abort.abort();}
}

