import * as T from 'three';
import {toonMaterial} from './toon';
import {windMaterial,waterMaterial,setGardenMotionTime} from './garden-motion';
import {terrainHeight} from './terrain';
import type {CropId} from './state';

const materials=new Map<string,T.Material>();
function mat(color:string,glow=false){const key=color+glow;let m=materials.get(key);if(!m){m=glow?new T.MeshBasicMaterial({color}):toonMaterial(color);materials.set(key,m);}return m;}
function mesh(parent:T.Object3D,g:T.BufferGeometry,color:string,x=0,y=0,z=0,sx=1,sy=sx,sz=sx,solid=false,glow=false){
 const m=new T.Mesh(g,mat(color,glow));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=!glow;m.receiveShadow=!glow;m.userData.solid=solid;m.userData.cameraIgnore=!solid;parent.add(m);return m;
}
function box(p:T.Object3D,c:string,x:number,y:number,z:number,w:number,h:number,d:number,solid=false){return mesh(p,new T.BoxGeometry(w,h,d),c,x,y,z,1,1,1,solid);}
function puff(p:T.Object3D,c:string,x:number,y:number,z:number,sx:number,sy=sx,sz=sx,wind=0){const m=new T.Mesh(new T.IcosahedronGeometry(1,1),wind?windMaterial(c,wind):mat(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;m.userData.cameraIgnore=true;p.add(m);return m;}
const ground=(x:number,z:number)=>terrainHeight('farm',x,z);
export const gardenStreamX=(z:number)=>8+Math.sin((z-5)*.13)*4.6;
export function gardenStreamNear(x:number,z:number,margin=2.8){return z>6&&z<30&&Math.abs(x-gardenStreamX(z))<margin;}
export function createGardenTree(x:number,z:number,scale:number,pink=false){
 const root=new T.Group();root.position.set(x,ground(x,z),z);root.scale.setScalar(scale);root.userData.batchable=true;root.userData.trunkCollider={radius:.38*scale,height:5.8*scale};
 mesh(root,new T.CylinderGeometry(.25,.48,3.8,7),'#785039',0,1.8,0);
 for(let i=0;i<3;i++){const a=i*2.09,branch=mesh(root,new T.CylinderGeometry(.14,.25,2.1,6),'#785039',Math.cos(a)*.48,2.85,Math.sin(a)*.48);branch.rotation.z=Math.cos(a)*.65;branch.rotation.x=Math.sin(a)*.65;}
 const palette=pink?['#a94688','#d86caa','#ed97c1']:['#23705d','#3e9156','#78b744','#acd858'];
 for(let i=0;i<15;i++){const a=i*2.399,r=i<3?.5:1.35+(i%3)*.15,y=3.6+(i%4)*.43;puff(root,palette[i%palette.length],Math.cos(a)*r,y,Math.sin(a)*r,1.12,.9,1.02,.14);}
 return root;
}
export function createGardenCottage(){
 const root=new T.Group();root.name='garden-cottage';root.position.set(-7,0,-5);root.userData.batchable=true;
 box(root,'#e9cf96',0,1.48,0,4,2.96,3.5,true);
 box(root,'#7d8a83',0,.2,0,4.35,.4,3.85,true);
 for(const x of [-1.96,1.96])box(root,'#785237',x,1.6,1.8,.2,2.8,.2);
 for(const y of [.45,2.85])box(root,'#a27548',0,y,1.81,4.15,.18,.18);
 const shape=new T.Shape();shape.moveTo(-2,0);shape.lineTo(2,0);shape.lineTo(0,1.65);shape.closePath();
 mesh(root,new T.ExtrudeGeometry(shape,{depth:3.5,bevelEnabled:false}),'#e9cf96',0,2.96,-1.75);
 for(const side of [-1,1]){
  const roof=box(root,'#a84434',side*1.22,3.71,0,2.95,.2,4.3,true);roof.rotation.z=-side*.59;
  for(let row=0;row<5;row++)for(let col=0;col<8;col++){
   const u=.27+row*.49,tile=box(root,['#e9703b','#ef8744','#d75b32'][(row+col)%3],side*u,4.58-u*.67,-1.94+col*.55,.58,.16,.62);
   tile.rotation.z=-side*.59;
  }
 }
 for(let i=0;i<9;i++)mesh(root,new T.CylinderGeometry(.18,.18,.51,7),'#f38b50',0,4.61,-2.08+i*.51).rotation.x=Math.PI/2;
 box(root,'#674535',0,1.16,1.83,1.12,2.02,.15);
 for(let i=0;i<5;i++)box(root,i%2?'#906139':'#aa7744',-.44+i*.22,1.14,1.925,.2,1.91,.025);
 mesh(root,new T.SphereGeometry(.065,7,5),'#ffce68',.32,1.05,1.98);
 for(const x of [-1.22,1.22]){
  box(root,'#6d4b37',x,1.8,1.85,.84,1.12,.16);
  mesh(root,new T.BoxGeometry(.66,.9,.04),'#ffe596',x,1.8,1.95,1,1,1,false,true);
  box(root,'#856347',x,1.8,1.99,.075,.94,.07);box(root,'#856347',x,1.8,1.99,.69,.07,.07);
  for(const side of [-1,1])box(root,'#3e8f80',x+side*.52,1.8,1.87,.25,1.08,.12);
  box(root,'#a77448',x,1.11,2,.95,.3,.35);
  for(let i=0;i<4;i++){puff(root,'#4c9653',x-.32+i*.21,1.32,2,.2,.17,.16);puff(root,i%2?'#fff1b3':'#e7769d',x-.32+i*.21,1.49,2.02,.09);}
 }
 box(root,'#778079',1.25,4.35,-.75,.62,2,.66,true);
 for(let y=3.6;y<5.4;y+=.24)box(root,'#a6aaa0',1.25,y,-.75,.69,.05,.72);
 box(root,'#535f60',1.25,5.42,-.75,.86,.17,.9);
 for(let i=0;i<3;i++)box(root,'#acaa8e',0,.09+i*.08,2.55-i*.28,1.6,.18,.4);
 return root;
}
export function createGardenCrop(crop:CropId,stage:number){
 const root=new T.Group(),mature=stage>=1,size=.55+stage*.18;
 for(let i=0;i<4;i++){
  const plant=new T.Group();plant.position.set((i%2)*.8-.4,.08,Math.floor(i/2)*.8-.4);plant.scale.setScalar(size);root.add(plant);
  for(let j=0;j<4;j++){const a=j*Math.PI/2,leaf=puff(plant,j%2?'#83b83a':'#369652',Math.cos(a)*.2,.25,Math.sin(a)*.2,.1,.42,.16,.035);leaf.rotation.z=-Math.cos(a)*.7;leaf.rotation.x=Math.sin(a)*.7;}
  if(!mature)continue;
  if(crop==='sunroot'){const carrot=mesh(plant,new T.ConeGeometry(.23,.62,9),'#ffb449',0,.13,0);carrot.rotation.z=Math.PI+.18;for(let j=0;j<3;j++)box(plant,'#db792d',.04,.11+j*.11,.22,.18,.032,.025);}
  if(crop==='moonberry')for(let j=0;j<6;j++){const a=j*2.4;puff(plant,j%2?'#8371cf':'#5b4e9e',Math.cos(a)*.19,.43+(j%3)*.13,Math.sin(a)*.19,.17,.17,.17,.025);}
  if(crop==='embercorn'){mesh(plant,new T.CylinderGeometry(.15,.18,.8,8),'#ed9a2f',0,.51,0);for(let row=0;row<5;row++)for(let j=0;j<4;j++){const a=j*Math.PI/2;puff(plant,(row+j)%2?'#ffd05e':'#efa13b',Math.cos(a)*.16,.23+row*.145,Math.sin(a)*.16,.105,.11,.1);}for(const side of [-1,1]){const husk=puff(plant,'#509b43',side*.2,.35,0,.13,.45,.18,.03);husk.rotation.z=-side*.35;}}
  if(crop==='cloudmelon'){const fruit=puff(plant,'#70d9d6',0,.29,0,.34,.28,.34,.02);for(let j=0;j<5;j++){const stripe=mesh(plant,new T.TorusGeometry(.28,.025,5,12),'#e5f1a2',0,.29,0);stripe.rotation.x=j*Math.PI/5;stripe.scale.y=.82;}puff(plant,'#448a56',0,.58,0,.12,.09,.12,.025);}
  if(crop==='glowcap')for(let j=0;j<3;j++){const x=(j-1)*.28;mesh(plant,new T.CylinderGeometry(.06,.09,.38+j*.08,7),'#f4dbbc',x,.28,0);const cap=mesh(plant,new T.SphereGeometry(.24+j*.035,10,6,0,Math.PI*2,0,Math.PI/2),j===1?'#ef72c0':'#bc6fe0',x,.5+j*.08,0,1,.55,1);cap.material=windMaterial(j===1?'#ef72c0':'#bc6fe0',.025);}
  if(crop==='starpepper')for(let j=0;j<3;j++){const a=j*2.1,pep=mesh(plant,new T.ConeGeometry(.2,.52,5),'#ff665b',Math.cos(a)*.21,.42+j*.08,Math.sin(a)*.21);pep.rotation.z=Math.PI+.35*Math.cos(a);puff(plant,'#4f9c4b',Math.cos(a)*.17,.7+j*.07,Math.sin(a)*.17,.12,.08,.12,.025);}
  if(crop==='dewleaf')for(let j=0;j<6;j++){const a=j*1.047,leaf=puff(plant,j%2?'#53c7a0':'#79ded0',Math.cos(a)*.2,.4+(j%2)*.15,Math.sin(a)*.2,.1,.48,.16,.045);leaf.rotation.z=-Math.cos(a)*.45;leaf.rotation.x=Math.sin(a)*.45;if(j%2===0)puff(plant,'#baf9ff',Math.cos(a)*.26,.67,Math.sin(a)*.26,.055);}
  if(crop==='crystalbean')for(let j=0;j<3;j++){const a=j*2.1;const pod=mesh(plant,new T.OctahedronGeometry(.27),'#6ba8ff',Math.cos(a)*.2,.43+j*.12,Math.sin(a)*.2,1,.6,1);pod.material=windMaterial(j%2?'#72a7ff':'#8f7cff',.025);box(plant,'#3c8756',Math.cos(a)*.1,.28,Math.sin(a)*.1,.04,.58,.04);}
 }
 return root;
}
export function cliffGeometry(radius=30){
 const rings=[[1,-.28],[.95,-3.5],[.76,-10],[.49,-17],[.12,-23]],n=48,positions:number[]=[],colors:number[]=[];
 const vertex=(ring:number,j:number)=>{const a=j/n*Math.PI*2,r=radius*rings[ring][0]*(1+.025*Math.sin(j*2.7+ring));return new T.Vector3(Math.cos(a)*r,rings[ring][1]*radius/30+(ring?Math.sin(j*2.3)*.8:0),Math.sin(a)*r);};
 for(let row=0;row<rings.length-1;row++)for(let j=0;j<n;j++){
  const a=vertex(row,j),b=vertex(row,j+1),c=vertex(row+1,j),d=vertex(row+1,j+1),color=new T.Color(['#718380','#879089','#687879','#a0a18b'][(j+row)%4]).multiplyScalar(1-row*.055);
  for(const p of [a,b,c,b,d,c]){positions.push(...p.toArray());colors.push(color.r,color.g,color.b);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
export class GardenArt{
 readonly root=new T.Group();
 private foam:T.InstancedMesh;private smoke:T.InstancedMesh;private windLeaves:T.InstancedMesh;private clouds:{mesh:T.Object3D;x:number;z:number;phase:number}[]=[];private falls:{x:number;z:number;y:number;angle:number;width:number}[]=[];
 private matrix=new T.Matrix4();private q=new T.Quaternion();
 constructor(parent:T.Group){
  this.root.name='sky-garden-art';parent.add(this.root);
  const staticArt=new T.Group();staticArt.name='garden-dressing';staticArt.userData.batchable=true;parent.add(staticArt);
  this.cliffs(staticArt);this.stream(staticArt);this.flowers(staticArt);this.distantIslands(staticArt);
  for(const [x,z] of [[-4.9,-3.3],[5,-2.7],[-6.5,6.1],[6.2,6.4]])this.lantern(staticArt,x,z);
  const foamMat=new T.MeshBasicMaterial({color:'#e7fbff',transparent:true,opacity:.72,depthWrite:false});
  this.foam=new T.InstancedMesh(new T.SphereGeometry(1,6,4),foamMat,60);this.foam.userData.cameraIgnore=true;this.foam.name='waterfall-foam';this.foam.frustumCulled=false;this.root.add(this.foam);
  const leafShape=new T.Shape();leafShape.moveTo(-.38,0);leafShape.quadraticCurveTo(0,.3,.48,0);leafShape.quadraticCurveTo(0,-.3,-.38,0);
  this.windLeaves=new T.InstancedMesh(new T.ShapeGeometry(leafShape),toonMaterial('#9dcc51'),48);this.windLeaves.name='windborne-leaves';this.windLeaves.userData.cameraIgnore=true;this.windLeaves.frustumCulled=false;this.root.add(this.windLeaves);
  this.smoke=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshBasicMaterial({color:'#fff5df',transparent:true,opacity:.4,depthWrite:false}),8);this.smoke.userData.cameraIgnore=true;this.smoke.name='cottage-smoke';this.root.add(this.smoke);
  this.update(0);
 }
 private cliffs(p:T.Group){
  for(let i=0;i<48;i++){
   const a=i/48*Math.PI*2,r=29.5,x=Math.cos(a)*r,z=Math.sin(a)*r;
   puff(p,['#929d8d','#768983','#a4aa95'][i%3],x,-2.3,z,1.7,3.2+(i%3)*.6,1.8);
   puff(p,i%2?'#5d9d45':'#89b854',x*.992,-.32,z*.992,1.5,.42,1.3);
   if(i%3===0)for(let j=0;j<7;j++){const v=a+Math.sin(j*1.7)*.017,rr=29.5-j*.32;puff(p,j%2?'#80ad45':'#428255',Math.cos(v)*rr,-.7-j*.83,Math.sin(v)*rr,.35,.58,.3,.075);}
  }
 }
 private paths(p:T.Group){
  const routes=[[-7,-2.5,-7,2],[-4.6,5.6,5,5.6],[0,-3,0,-16],[4.8,13,13,17]];
  for(const [ax,az,bx,bz] of routes){const length=Math.hypot(bx-ax,bz-az),steps=Math.ceil(length/.72);for(let i=0;i<=steps;i++){const t=i/steps,x=ax+(bx-ax)*t,z=az+(bz-az)*t;const stone=mesh(p,new T.CylinderGeometry(.57,.6,.08,7),i%3?'#d8c78b':'#e9d79d',x,ground(x,z)+.06,z,1,.7,.8);stone.rotation.y=i*.7;}}
 }
 private lantern(p:T.Group,x:number,z:number){
  const y=ground(x,z);box(p,'#6d5338',x,y+1.38,z,.14,2.76,.14,true);
  box(p,'#574b37',x,y+2.6,z,.62,.12,.55);
  mesh(p,new T.BoxGeometry(.36,.6,.36),'#ffde7c',x,y+2.18,z,1,1,1,false,true);
  for(const dx of [-.22,.22])for(const dz of [-.22,.22])box(p,'#4b594d',x+dx,y+2.18,z+dz,.055,.65,.055);
  mesh(p,new T.ConeGeometry(.48,.34,4),'#425b53',x,y+2.81,z).rotation.y=Math.PI/4;
 }
 private pavilion(p:T.Group){
  const center=new T.Group();center.position.set(0,ground(0,-20),-20);p.add(center);center.name='mushroom-pavilion';
  for(let i=0;i<3;i++)mesh(center,new T.CylinderGeometry(4-i*.35,4.1-i*.35,.22,24),'#aaa98e',0,.11+i*.22,0,1,1,1,true);
  for(const a of [-Math.PI/4,Math.PI/4,Math.PI*.75,Math.PI*1.25]){
   const x=Math.sin(a)*2.65,z=Math.cos(a)*2.65;
   mesh(center,new T.CylinderGeometry(.28,.38,4.5,9),'#eddbac',x,2.9,z,1,1,1,true);
   mesh(center,new T.CylinderGeometry(.52,.52,.27,9),'#c6b68c',x,.87,z);
   mesh(center,new T.CylinderGeometry(.5,.5,.3,9),'#f4dfac',x,5.05,z);
  }
  mesh(center,new T.CylinderGeometry(4.7,4.3,.32,24),'#deb978',0,5.35,0);
  const cap=mesh(center,new T.SphereGeometry(5,24,12,0,Math.PI*2,0,Math.PI/2),'#e67d39',0,5.4,0,1,.38,1);cap.userData.cameraIgnore=false;
  for(let i=0;i<12;i++){const a=i*Math.PI/6;puff(center,i%2?'#f5b95f':'#f19a46',Math.cos(a)*3.15,6.65,Math.sin(a)*3.15,.7,.1,.48);}
  box(center,'#627960',0,1.35,0,1.4,1.5,1.1,true);
  mesh(center,new T.CylinderGeometry(.055,.08,1.35,7),'#ffd578',0,2.68,.6,1,1,1,false,true);
  for(const side of [-1,1]){const leaf=mesh(center,new T.SphereGeometry(1,8,6),'#ffe899',side*.26,2.82,.6,.19,.38,.1,false,true);leaf.rotation.z=-side*.7;}
 }
 private stream(p:T.Group){
  const positions:number[]=[],indices:number[]=[];
  for(let i=0;i<=46;i++){const z=6+i*.5,x=gardenStreamX(z);positions.push(x-.95,ground(x-.95,z)+.075,z,x+.95,ground(x+.95,z)+.075,z);if(i<46){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
  const stream=new T.Mesh(geo,waterMaterial('#34bce2'));stream.name='animated-stream';stream.userData.cameraIgnore=true;p.add(stream);
  for(let i=0;i<35;i++){const z=6+i*.64,x=gardenStreamX(z),side=i%2?1:-1;puff(p,i%3?'#98a697':'#c9c7a4',x+side*1.1,ground(x+side*1.1,z)+.12,z,.4,.27,.38);}
  const x=gardenStreamX(17);for(let i=0;i<8;i++)box(p,i%2?'#bc874f':'#d1a265',x-1.75+i*.5,.38,17,.47,.18,2.15,true);
  for(const z of [16,18]){for(const dx of [-1.75,1.75])box(p,'#795538',x+dx,.85,z,.16,1.2,.16,true);box(p,'#a57743',x,1.2,z,3.6,.12,.12,true);}
  for(const [fx,fz,w] of [[gardenStreamX(29),29,2.1],[-23,19,2.2],[27,-12,1.8]]){
   const r=Math.hypot(fx,fz),xx=fx/r*30,zz=fz/r*30,angle=Math.atan2(xx,zz),root=new T.Group();root.position.set(xx,-.18,zz);root.rotation.y=angle;root.userData.cameraIgnore=true;this.root.add(root);
   const ribbon=new T.BufferGeometry(),v:number[]=[],idx:number[]=[];for(let j=0;j<=12;j++){const t=j/12,y=-t*18,z=.3+Math.sin(t*Math.PI*.75)*1.15;v.push(-w/2*(1+t*.3),y,z,w/2*(1+t*.3),y,z);if(j<12){const k=j*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}
   ribbon.setAttribute('position',new T.Float32BufferAttribute(v,3));ribbon.setIndex(idx);ribbon.computeVertexNormals();
   const fall=new T.Mesh(ribbon,waterMaterial('#69d1f1',true));fall.userData.cameraIgnore=true;root.add(fall);
   for(const side of [-.32,.15]){const line=new T.Mesh(ribbon,waterMaterial('#e3ffff',true));(line.material as T.MeshBasicMaterial).opacity=.6;line.scale.x=.12;line.position.x=side*w;line.position.z=.015;line.userData.cameraIgnore=true;root.add(line);}
   this.falls.push({x:xx,z:zz,y:-.18,angle,width:w});
  }
 }
 private flowers(p:T.Group){
  for(let i=0;i<310;i++){
   const a=i*2.399,r=7+Math.sqrt((i+.5)/310)*21,x=Math.cos(a)*r,z=Math.sin(a)*r;
   if(Math.abs(x)<6.7&&z>-4&&z<15||Math.abs(x)<5.5&&z<-15||gardenStreamNear(x,z)||x< -4.5&&x> -14&&z> -8&&z<12)continue;
   const y=ground(x,z),c=['#ffcf65','#f1a4c4','#e3eab0','#91be60'][i%4];
   for(let j=0;j<3;j++){const b=j*2.09;puff(p,'#599642',x+Math.cos(b)*.12,y+.18,z+Math.sin(b)*.12,.06,.23,.08,.025);}
   for(let j=0;j<4;j++){const b=j*Math.PI/2;puff(p,c,x+Math.cos(b)*.095,y+.38,z+Math.sin(b)*.095,.095,.045,.08,.035);}
   puff(p,'#fff3b1',x,y+.41,z,.055);
  }
  for(const [x,z] of [[-3.7,-11],[4.5,-11],[-6.9,14.5],[6.5,11.4],[11.6,-3],[-16,7]]){
   for(let i=0;i<6;i++){const a=i*2.4;puff(p,i%2?'#398753':'#78ac4c',x+Math.cos(a)*.5,ground(x,z)+.35,z+Math.sin(a)*.5,.6,.45,.6,.07);puff(p,i%2?'#ffc66d':'#dc85b4',x+Math.cos(a)*.57,ground(x,z)+.76,z+Math.sin(a)*.57,.16);}
  }
 }
 private distantIslands(p:T.Group){
  for(let i=0;i<7;i++){
   const a=i*2.399,r=88+i%3*23,x=Math.cos(a)*r,z=Math.sin(a)*r,y=-4+(i%4)*5,size=5+i%3*1.5;
   const island=new T.Group();island.position.set(x,y,z);island.userData.cameraIgnore=true;p.add(island);
   const material=toonMaterial('#ffffff');material.vertexColors=true;const cliff=new T.Mesh(cliffGeometry(size),material);cliff.userData.cameraIgnore=true;island.add(cliff);
   mesh(island,new T.CylinderGeometry(size,size*.93,.4,16),'#78b961',0,0,0);
   for(let j=0;j<3;j++){const px=Math.sin(j*2.4)*size*.45,pz=Math.cos(j*2.4)*size*.45;mesh(island,new T.CylinderGeometry(.1,.2,1.3,5),'#7e6750',px,.7,pz);puff(island,'#52995c',px,1.9,pz,1.15,1.3,1.1,.07);}
  }
  for(let i=0;i<22;i++){const a=i*2.399,r=42+(i%5)*21,x=Math.cos(a)*r,z=Math.sin(a)*r,cloud=puff(this.root,'#eaf7fa',x,-22-i%4*5,z,9,2.6,5);cloud.userData.cameraIgnore=true;this.clouds.push({mesh:cloud,x,z,phase:i*.73});}
 }
 update(time:number,reduced=false){
  const motionTime=reduced?0:time;setGardenMotionTime(motionTime,reduced);
  let index=0;
  for(const f of this.falls)for(let j=0;j<20;j++){
   const t=(motionTime*.43+j/20)%1,lateral=Math.sin(j*2.399)*f.width*.42,away=.35+Math.sin(t*Math.PI*.75)*1.15;
   const x=f.x+Math.cos(f.angle)*lateral+Math.sin(f.angle)*away,z=f.z-Math.sin(f.angle)*lateral+Math.cos(f.angle)*away;
   this.matrix.compose(new T.Vector3(x,f.y-t*18,z),this.q,new T.Vector3(.05+j%3*.025,.32+t*.6,.07));this.foam.setMatrixAt(index++,this.matrix);
  }
  this.foam.instanceMatrix.needsUpdate=true;
  for(let i=0;i<8;i++){const t=(motionTime*.16+i/8)%1;this.matrix.compose(new T.Vector3(-5.75+Math.sin(t*4)*.35,5.5+t*3.2,-5.75+t*.8),this.q,new T.Vector3(.16+t*.37,.22+t*.35,.19+t*.3));this.smoke.setMatrixAt(i,this.matrix);}this.smoke.instanceMatrix.needsUpdate=true;
  for(let i=0;i<48;i++){const t=(motionTime*.075+i*.618033)%1,x=-34+t*68,z=-27+(i*17%54),r=Math.hypot(x,z),y=(r<29?ground(x,z):0)+1.2+i%6*.7+Math.sin(motionTime*2+i)*.35;this.q.setFromEuler(new T.Euler(0,motionTime*1.8+i,motionTime*3+i*.7));this.matrix.compose(new T.Vector3(x,y,z),this.q,new T.Vector3(.32,.32,.32));this.windLeaves.setMatrixAt(i,this.matrix);}this.windLeaves.instanceMatrix.needsUpdate=true;
  for(const c of this.clouds){c.mesh.position.x=c.x+(reduced?0:Math.sin(motionTime*.035+c.phase)*5);c.mesh.position.z=c.z+(reduced?0:motionTime*.16%12-6);}
 }
}
