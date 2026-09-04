import * as T from 'three';
export class HealthBar extends T.Group{
 readonly fill:T.Mesh;readonly trail:T.Mesh;
 private remaining=1;
 constructor(private width=1.45,private height=.18,color='#f36768'){
  super();this.name='health-bar';
  const plane=(w:number,h:number,c:string,z:number)=>{const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:c,depthWrite:false,toneMapped:false}));m.position.z=z;m.renderOrder=20;this.add(m);return m;};
  plane(width+.12,height+.1,'#192d43',0);plane(width,height,'#55374a',.004);
  this.trail=plane(width,height,'#ffe1a0',.008);this.fill=plane(width,height,color,.012);
 }
 update(hp:number,max:number,dt=0){
  const ratio=Math.max(0,Math.min(1,max>0?hp/max:0));
  this.remaining=ratio>=this.remaining?ratio:Math.max(ratio,this.remaining-dt*.7);
  this.fill.scale.x=ratio;this.fill.position.x=-(1-ratio)*this.width/2;this.fill.visible=ratio>0;
  this.trail.scale.x=this.remaining;this.trail.position.x=-(1-this.remaining)*this.width/2;this.trail.visible=this.remaining>0;
 }
 face(camera:T.Camera){this.quaternion.copy(this.parent?this.parent.getWorldQuaternion(new T.Quaternion()).invert():new T.Quaternion()).multiply(camera.getWorldQuaternion(new T.Quaternion()));}
 dispose(){this.removeFromParent();this.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose();}});}
}

