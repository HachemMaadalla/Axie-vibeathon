import * as T from 'three';
import type {CollisionWorld} from './collisions';
export class MovementMotor{
 velocity=new T.Vector3();vertical=0;grounded=true;jumpsUsed=0;dashCooldown=0;
 private jumpBuffer=0;private coyote=.12;private dashLeft=0;private dashDirection=new T.Vector3(0,0,-1);
 get dashing(){return this.dashLeft>0;}
 requestJump(){this.jumpBuffer=.15;}
 dash(direction:T.Vector3){
  if(this.dashCooldown>0)return false;
  this.dashDirection.copy(direction);this.dashDirection.y=0;
  if(this.dashDirection.lengthSq()<.001)this.dashDirection.set(0,0,-1);
  this.dashDirection.normalize();this.dashCooldown=1.2;this.dashLeft=.2;return true;
 }
 reset(){this.velocity.set(0,0,0);this.vertical=0;this.grounded=true;this.jumpsUsed=0;this.dashCooldown=0;this.dashLeft=0;this.jumpBuffer=0;this.coyote=.12;}
 step(dt:number,position:T.Vector3,input:T.Vector3,speed:number,sprint:boolean,radius:number,height:(x:number,z:number)=>number,collisions?:CollisionWorld){
  this.dashCooldown=Math.max(0,this.dashCooldown-dt);
  this.coyote=this.grounded?.12:Math.max(0,this.coyote-dt);
  let jumped=false;
  if(this.jumpBuffer>0&&(this.grounded||this.coyote>0||this.jumpsUsed<2)){
   if(!this.grounded&&this.coyote<=0&&this.jumpsUsed===0)this.jumpsUsed=1;
   this.vertical=this.jumpsUsed===0?12.5:11.5;this.jumpsUsed++;this.grounded=false;this.coyote=0;this.jumpBuffer=0;jumped=true;
  }
  this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
  const desired=input.clone().multiplyScalar(speed*(sprint?1.55:1));
  if(this.dashLeft>0)this.velocity.copy(this.dashDirection).multiplyScalar(29);
  else this.velocity.lerp(desired,1-Math.exp(-dt*(this.grounded?(input.lengthSq()<.01?28:24):12)));
  // Substeps stop a fast dash skipping raised terrain or the edge of the island.
  const steps=Math.max(1,Math.ceil(this.velocity.length()*dt/.25)),sub=dt/steps;
  for(let i=0;i<steps;i++){
   const oldY=position.y;
   let x=position.x+this.velocity.x*sub,z=position.z+this.velocity.z*sub;
   const distance=Math.hypot(x,z);if(distance>radius){x*=radius/distance;z*=radius/distance;}
   const ground=Math.max(height(x,z),collisions?.floor(x,z,position.y+(this.grounded?.55:0))??-Infinity);
   if(ground<=position.y+(this.grounded?.55:.08)){position.x=x;position.z=z;}
   else{this.velocity.x=0;this.velocity.z=0;}
   collisions?.resolve(position,this.velocity,.62,1.55,this.grounded?.55:0);
   const floor=Math.max(height(position.x,position.z),collisions?.floor(position.x,position.z,oldY+(this.grounded?.55:0))??-Infinity);
   if(this.grounded&&Math.abs(floor-oldY)<=.55){position.y=floor;this.vertical=0;}
   else{
    this.grounded=false;this.vertical-=28*sub;position.y+=this.vertical*sub;
    if(this.vertical>0&&collisions){const ceiling=collisions.ceiling(position.x,position.z,oldY+1.55);if(position.y+1.55>ceiling){position.y=ceiling-1.55;this.vertical=0;}}
    if(position.y<=floor){position.y=floor;this.vertical=0;this.grounded=true;this.jumpsUsed=0;this.coyote=.12;}
   }
  }
  this.dashLeft=Math.max(0,this.dashLeft-dt);
  return jumped;
 }
}

