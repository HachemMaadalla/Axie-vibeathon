import * as T from 'three';
type Solid={minX:number;maxX:number;minZ:number;maxZ:number;bottom:number;top:number;cx?:number;cz?:number;radius?:number};
const CELL=8;
// A separate spatial grid survives geometry batching and only checks nearby solids.
export class CollisionWorld{
 private cells=new Map<string,Solid[]>();private solids:Solid[]=[];
 get count(){return this.solids.length;}
 addBox(minX:number,maxX:number,minZ:number,maxZ:number,bottom:number,top:number){this.add({minX,maxX,minZ,maxZ,bottom,top});}
 addCircle(x:number,z:number,radius:number,bottom:number,top:number){this.add({minX:x-radius,maxX:x+radius,minZ:z-radius,maxZ:z+radius,bottom,top,cx:x,cz:z,radius});}
 private add(s:Solid){this.solids.push(s);for(let x=Math.floor(s.minX/CELL);x<=Math.floor(s.maxX/CELL);x++)for(let z=Math.floor(s.minZ/CELL);z<=Math.floor(s.maxZ/CELL);z++){const key=x+':'+z,list=this.cells.get(key)??[];list.push(s);this.cells.set(key,list);}}
 capture(root:T.Group,height:(x:number,z:number)=>number){
  root.updateMatrixWorld(true);
  root.traverse(o=>{
   const trunk=o.userData.trunkCollider;
   if(trunk){const p=o.getWorldPosition(new T.Vector3());this.addCircle(p.x,p.z,trunk.radius,p.y,p.y+trunk.height);return;}
   if(!o.userData.solid)return;
   const b=new T.Box3().setFromObject(o),size=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3());
   if(size.x<.06||size.z<.06||size.y<.06||b.max.y<=height(c.x,c.z)+.32)return;
   this.addBox(b.min.x,b.max.x,b.min.z,b.max.z,b.min.y,b.max.y);
  });
 }
 private nearby(x:number,z:number,r:number){const result=new Set<Solid>();for(let i=Math.floor((x-r)/CELL);i<=Math.floor((x+r)/CELL);i++)for(let j=Math.floor((z-r)/CELL);j<=Math.floor((z+r)/CELL);j++)for(const s of this.cells.get(i+':'+j)??[])result.add(s);return result;}
 private overlap(s:Solid,x:number,z:number,r:number){return s.radius!==undefined?Math.hypot(x-s.cx!,z-s.cz!)<s.radius+r:Math.hypot(x-T.MathUtils.clamp(x,s.minX,s.maxX),z-T.MathUtils.clamp(z,s.minZ,s.maxZ))<r;}
 blocked(p:T.Vector3,r=.62,h=1.55,step=0){for(const s of this.nearby(p.x,p.z,r))if(s.top>p.y+step+.001&&s.bottom<p.y+h-.001&&this.overlap(s,p.x,p.z,r))return true;return false;}
 floor(x:number,z:number,feet:number,r=.62){let floor=-Infinity;for(const s of this.nearby(x,z,r))if(s.top<=feet+.035&&s.top>floor&&this.overlap(s,x,z,r*.8))floor=s.top;return floor;}
 ceiling(x:number,z:number,head:number,r=.62){let ceiling=Infinity;for(const s of this.nearby(x,z,r))if(s.bottom>=head-.035&&s.bottom<ceiling&&this.overlap(s,x,z,r))ceiling=s.bottom;return ceiling;}
 resolve(p:T.Vector3,velocity:T.Vector3,r=.62,h=1.55,step=0){
  for(let pass=0;pass<4;pass++){
   let touched=false;
   for(const s of this.nearby(p.x,p.z,r)){
    if(s.top<=p.y+step+.001||s.bottom>=p.y+h-.001)continue;
    let dx=p.x-(s.radius!==undefined?s.cx!:T.MathUtils.clamp(p.x,s.minX,s.maxX)),dz=p.z-(s.radius!==undefined?s.cz!:T.MathUtils.clamp(p.z,s.minZ,s.maxZ));
    let d=Math.hypot(dx,dz),reach=r+(s.radius??0);if(d>=reach)continue;
    if(d<.00001){
     if(s.radius!==undefined){dx=velocity.x? -Math.sign(velocity.x):1;dz=0;d=1;reach+=1;}
     else{const edges=[{v:p.x-s.minX+r,x:-1,z:0},{v:s.maxX-p.x+r,x:1,z:0},{v:p.z-s.minZ+r,x:0,z:-1},{v:s.maxZ-p.z+r,x:0,z:1}].sort((a,b)=>a.v-b.v),e=edges[0];dx=e.x;dz=e.z;d=1;reach=e.v+1;}
    }
    const nx=dx/d,nz=dz/d,depth=reach-d+.001;p.x+=nx*depth;p.z+=nz*depth;
    const into=velocity.x*nx+velocity.z*nz;if(into<0){velocity.x-=nx*into;velocity.z-=nz*into;}touched=true;
   }
   if(!touched)break;
  }
 }
 move(from:T.Vector3,to:T.Vector3,velocity:T.Vector3,r:number,h:number){
  const delta=to.clone().sub(from),steps=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.z)/.2)),p=from.clone();
  for(let i=0;i<steps;i++){p.x+=delta.x/steps;p.z+=delta.z/steps;p.y=to.y;this.resolve(p,velocity,r,h);}
  to.copy(p);
 }
 firstHit(from:T.Vector3,to:T.Vector3,r=.1){
  const d=to.clone().sub(from),mid=from.clone().add(to).multiplyScalar(.5);let first=Infinity;
  for(const s of this.nearby(mid.x,mid.z,Math.hypot(d.x,d.z)/2+r)){
   let enter=0,leave=1;
   const slab=(origin:number,delta:number,min:number,max:number)=>{if(Math.abs(delta)<1e-8)return origin>=min&&origin<=max;const a=(min-origin)/delta,b=(max-origin)/delta;enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b));return enter<=leave;};
   if(!slab(from.y,d.y,s.bottom-r,s.top+r))continue;
   if(s.radius!==undefined){
    const x=from.x-s.cx!,z=from.z-s.cz!,a=d.x*d.x+d.z*d.z,c=x*x+z*z-(s.radius+r)**2;
    if(a<1e-8){if(c>0)continue;}
    else{const b=2*(x*d.x+z*d.z),disc=b*b-4*a*c;if(disc<0)continue;enter=Math.max(enter,(-b-Math.sqrt(disc))/(2*a));leave=Math.min(leave,(-b+Math.sqrt(disc))/(2*a));if(enter>leave)continue;}
   }else if(!slab(from.x,d.x,s.minX-r,s.maxX+r)||!slab(from.z,d.z,s.minZ-r,s.maxZ+r))continue;
   if(enter<=leave&&enter<first)first=enter;
  }
  return first===Infinity?null:from.clone().addScaledVector(d,first);
 }
 steer(p:T.Vector3,dir:T.Vector3,r:number,h:number,side=1){
  const test=(d:T.Vector3)=>!this.blocked(p.clone().addScaledVector(d,r+1.1),r,h);
  if(test(dir))return dir;
  for(const angle of [side*Math.PI/3,-side*Math.PI/3,side*Math.PI/2,-side*Math.PI/2]){const d=dir.clone().applyAxisAngle(new T.Vector3(0,1,0),angle);if(test(d))return d;}
  return dir;
 }
}
