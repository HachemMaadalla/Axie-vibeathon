import * as T from 'three';
import {toonMaterial} from './toon';
import {inkMaterial,cartoonBandGeometry} from './spell-visuals';
type Particle={p:T.Vector3;v:T.Vector3;life:number;max:number;color:T.Color;size:number;gravity:number};
type Ring={mesh:T.Mesh;life:number;max:number;radius:number;warning:boolean};
export class CombatFX{
 readonly root=new T.Group();shake=0;freeze=0;
 private particles:Particle[]=[];private rings:Ring[]=[];private texts:{sprite:T.Sprite;life:number}[]=[];
 private numbers=new Map<string,T.Texture>();private pool:T.InstancedMesh;private outlines:T.InstancedMesh;
 private matrix=new T.Matrix4();private quat=new T.Quaternion();private scale=new T.Vector3();
 private lastNumber=0;private time=0;
 constructor(scene:T.Scene,private reduced=false){
  this.pool=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),toonMaterial('#ffffff'),600);
  this.outlines=new T.InstancedMesh(this.pool.geometry,inkMaterial(.16),600);this.outlines.name='particle-ink-outlines';this.outlines.instanceMatrix=this.pool.instanceMatrix;this.outlines.frustumCulled=false;this.outlines.count=0;this.pool.add(this.outlines);
  this.pool.instanceMatrix.setUsage(T.DynamicDrawUsage);this.pool.frustumCulled=false;this.pool.count=0;this.root.add(this.pool);scene.add(this.root);
 }
 burst(point:T.Vector3,color:string,count=10,speed=5){
  for(let i=0;i<count&&this.particles.length<600;i++){
   const a=Math.random()*Math.PI*2,v=new T.Vector3(Math.cos(a)*(1+Math.random()),.6+Math.random()*1.4,Math.sin(a)*(1+Math.random())).multiplyScalar(speed*.5);
   const life=.25+Math.random()*.4;this.particles.push({p:point.clone(),v,life,max:life,color:new T.Color(color),size:.08+Math.random()*.13,gravity:8});
  }
 }
 trail(point:T.Vector3,color:string,size=.08){
  if(this.particles.length>=600)return;
  this.particles.push({p:point.clone(),v:new T.Vector3(0,.3,0),life:.18,max:.18,color:new T.Color(color),size,gravity:0});
 }
 ring(point:T.Vector3,radius:number,color:string,duration=.3,warning=false){
  if(this.rings.length>=40){const old=this.rings.shift()!;this.discard(old.mesh);}
  const mesh=new T.Mesh(cartoonBandGeometry(.88,1,color),new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:warning?.6:.95,side:T.DoubleSide,depthWrite:false}));
  mesh.rotation.x=-Math.PI/2;mesh.position.copy(point);mesh.position.y+=.12;this.root.add(mesh);this.rings.push({mesh,life:duration,max:duration,radius,warning});
 }
 impact(point:T.Vector3,damage:number,color:string,kill=false,boss=false){
  this.burst(point,color,kill?18:5,kill?7:3);
  if(kill){this.ring(point,boss?5:1.6,color,boss?.7:.3);this.shake=Math.max(this.shake,boss?.18:.045);this.freeze=Math.max(this.freeze,boss?.055:.016);}
  if(typeof document!=='undefined'&&this.time-this.lastNumber>.045&&this.texts.length<28){
   this.lastNumber=this.time;const label=String(Math.ceil(damage));let map=this.numbers.get(label);
   if(!map){
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;const ctx=canvas.getContext('2d')!;
    ctx.font='bold 40px Trebuchet MS';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=7;ctx.strokeStyle='#263635';ctx.strokeText(label,64,32);ctx.fillStyle=kill?'#ffe8a0':'#ffffff';ctx.fillText(label,64,32);
    map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;if(this.numbers.size<120)this.numbers.set(label,map);
   }
   const sprite=new T.Sprite(new T.SpriteMaterial({map,transparent:true,depthTest:false,depthWrite:false}));sprite.position.copy(point).add(new T.Vector3((Math.random()-.5)*.4,.6,0));sprite.scale.set(.9,.45,1);this.root.add(sprite);this.texts.push({sprite,life:.6});
  }
 }
 hurt(point:T.Vector3){this.burst(point,'#ff967e',14,5);this.shake=Math.max(this.shake,.14);this.freeze=Math.max(this.freeze,.035);}
 private discard(mesh:T.Mesh){mesh.removeFromParent();mesh.geometry.dispose();(mesh.material as T.Material).dispose();}
 update(dt:number,camera?:T.Camera){
  this.time+=dt;this.freeze=Math.max(0,this.freeze-dt);this.shake*=Math.exp(-dt*20);
  for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0){this.particles.splice(i,1);continue;}p.v.y-=p.gravity*dt;p.p.addScaledVector(p.v,dt);p.v.multiplyScalar(Math.exp(-dt*2));}
  this.particles.forEach((p,i)=>{this.scale.setScalar(p.size*Math.min(1,p.life/p.max*2));this.matrix.compose(p.p,this.quat,this.scale);this.pool.setMatrixAt(i,this.matrix);this.pool.setColorAt(i,p.color);});this.pool.count=this.particles.length;this.outlines.count=this.pool.count;this.pool.instanceMatrix.needsUpdate=true;if(this.pool.instanceColor)this.pool.instanceColor.needsUpdate=true;
  for(let i=this.rings.length-1;i>=0;i--){const r=this.rings[i];r.life-=dt;const t=1-r.life/r.max;r.mesh.scale.setScalar(r.radius*(r.warning?1:.2+t));(r.mesh.material as T.MeshBasicMaterial).opacity=r.warning?.2+.5*t:.8*(1-t);if(r.life<=0){this.discard(r.mesh);this.rings.splice(i,1);}}
  for(let i=this.texts.length-1;i>=0;i--){const t=this.texts[i];t.life-=dt;t.sprite.position.y+=dt*1.5;t.sprite.material.opacity=Math.min(1,t.life*3);if(t.life<=0){t.sprite.removeFromParent();const map=t.sprite.material.map;if(map&&![...this.numbers.values()].includes(map))map.dispose();t.sprite.material.dispose();this.texts.splice(i,1);}}
  if(camera&&!this.reduced&&this.shake>.002){camera.position.x+=(Math.random()-.5)*this.shake;camera.position.y+=(Math.random()-.5)*this.shake*.6;camera.updateMatrixWorld();}
 }
 clear(){this.particles=[];this.pool.count=0;this.outlines.count=0;this.rings.forEach(r=>this.discard(r.mesh));this.rings=[];this.texts.forEach(t=>{t.sprite.removeFromParent();const map=t.sprite.material.map;if(map&&![...this.numbers.values()].includes(map))map.dispose();t.sprite.material.dispose();});this.texts=[];this.shake=0;this.freeze=0;}
 dispose(){this.clear();this.numbers.forEach(t=>t.dispose());this.pool.geometry.dispose();(this.outlines.material as T.Material).dispose();this.outlines.dispose();this.pool.dispose();(this.pool.material as T.Material).dispose();this.root.removeFromParent();}
}
export type CombatSound='cast'|'hit'|'kill'|'hurt'|'storm'|'meteor'|'dash';
export class CombatAudio{
 private context:AudioContext|null=null;private last=new Map<string,number>();muted=true;
 enable(){this.muted=false;this.context??=new AudioContext();void this.context.resume();}
 play(kind:CombatSound){
  const ctx=this.context;if(this.muted||!ctx)return;const now=ctx.currentTime;
  if(now-(this.last.get(kind)??-1)<(kind==='cast'?.12:.055))return;this.last.set(kind,now);
  const oscillator=ctx.createOscillator(),gain=ctx.createGain();
  const settings={cast:[650,180,.06,.017],hit:[220,90,.055,.025],kill:[380,65,.16,.035],hurt:[95,35,.22,.05],storm:[950,110,.18,.03],meteor:[100,28,.3,.07],dash:[380,120,.14,.025]}[kind];
  oscillator.type=kind==='storm'?'sawtooth':kind==='meteor'||kind==='hurt'?'triangle':'square';oscillator.frequency.setValueAtTime(settings[0],now);oscillator.frequency.exponentialRampToValueAtTime(settings[1],now+settings[2]);gain.gain.setValueAtTime(settings[3],now);gain.gain.exponentialRampToValueAtTime(.001,now+settings[2]);oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(now);oscillator.stop(now+settings[2]);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
 }
 dispose(){void this.context?.close();}
}

