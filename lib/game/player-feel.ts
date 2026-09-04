import * as T from 'three';
// Visual recoil never moves the gameplay body or the camera target.
export class PlayerFeel{
 private recoil=new T.Vector3();private squash=0;private jump=0;private lean=0;
 fire(direction:T.Vector3,heavy=false){this.recoil.addScaledVector(direction,heavy?-.19:-.09);this.recoil.clampLength(0,.25);this.squash=Math.max(this.squash,heavy?.09:.045);}
 takeoff(){this.jump=.11;}
 land(speed:number){this.squash=Math.min(.2,.07+Math.abs(speed)*.004);this.jump=0;}
 update(dt:number,root:T.Group,moving:boolean,dashing:boolean,reduced=false){
  this.recoil.multiplyScalar(Math.exp(-dt*17));this.squash*=Math.exp(-dt*15);this.jump*=Math.exp(-dt*12);
  this.lean=T.MathUtils.lerp(this.lean,reduced?0:dashing?.12:moving?.045:0,1-Math.exp(-dt*16));
  root.position.copy(this.recoil);const amount=reduced?0:this.squash-this.jump;
  root.scale.set(1+amount*.5,1-amount,1+amount*.5);root.rotation.x=this.lean;
 }
 reset(root?:T.Group){this.recoil.set(0,0,0);this.squash=0;this.jump=0;this.lean=0;if(root){root.position.set(0,0,0);root.scale.setScalar(1);root.rotation.x=0;}}
}
