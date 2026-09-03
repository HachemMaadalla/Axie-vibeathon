import * as T from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import {createAxieActor} from './model';
import { CROPS, freshFarm, hydrateFarm, grow, tend, improve, cook, offerHarvest, beginExpedition, emptyLoot, rewardKill, settleExpedition, type FarmState, type CropId, type HeroId, type Loot } from './state';
import { registerGameTools } from './webmcp';

export type Result={outcome:'won'|'escaped'|'lost';loot:Loot;kills:number;tier:number};
export type View={farm:FarmState;mode:'farm'|'dungeon';ready:boolean;error:string;selected:number;seed:CropId;hp:number;maxHp:number;time:number;kills:number;level:number;dash:number;loot:Loot;upgrade:boolean;result:Result|null;message:string;paused:boolean;saved:boolean;meal:CropId|null;tier:number};
type Actor={root:T.Group;mixer:T.AnimationMixer;actions:Map<string,T.AnimationAction>;current:string};
type Enemy={mesh:T.Group;hp:number;max:number;speed:number;boss:boolean;phase:number;bar:T.Mesh};
type Shot={mesh:T.Mesh;velocity:T.Vector3;life:number;damage:number};
const plotPosition=(i:number)=>new T.Vector3((i%4)*2.15-3.25,.2,Math.floor(i/4)*2.15-.8);

export class WildseedGame {
 farm:FarmState=freshFarm();mode:'farm'|'dungeon'='farm';ready=false;error='';selected=0;seed:CropId='sunroot';hp=100;maxHp=100;time=0;kills=0;level=1;dash=0;loot:Loot=emptyLoot();upgrade=false;result:Result|null=null;message='';paused=false;saved=true;meal:CropId|null=null;tier=1;
 private scene=new T.Scene();private farmWorld=new T.Group();private arena=new T.Group();private camera:T.PerspectiveCamera;private renderer:T.WebGLRenderer;private listener:(s:View)=>void;
 private actors=new Map<HeroId,Actor>();private npc:Actor|null=null;private player=new T.Group();private keys=new Set<string>();private target:T.Vector3|null=null;private pointer=new T.Vector2();private ray=new T.Raycaster();private plots:T.Mesh[]=[];private plants:T.Group[]=[];private ring:T.Mesh;private portal:T.Mesh;private enemies:Enemy[]=[];private shots:Shot[]=[];private effects:{mesh:T.Mesh;life:number}[]=[];private frame=0;private last=0;private elapsed=0;private emitAt=0;private saveAt=0;private messageUntil=0;private stopped=false;private started=false;private attackTimer=0;private spawnTimer=0;private invuln=0;private dashTime=0;private damage=18;private speed=6;private nextUpgrade=6;private bossSpawned=false;private bossDead=false;private muted=true;private audio:AudioContext|null=null;private abortTools:()=>void;private resizeObserver:ResizeObserver;
 private materialCache=new Map<string,T.MeshStandardMaterial>();private sharedSphere=new T.IcosahedronGeometry(1,1);
 constructor(private container:HTMLElement,onChange:(s:View)=>void){
 this.listener=onChange;
 try{const raw=localStorage.getItem('wildseed-v1');if(raw)this.farm=hydrateFarm(JSON.parse(raw));}catch{this.saved=false;}
 this.scene.background=new T.Color('#a9d8dd');this.scene.fog=new T.Fog('#a9d8dd',42,100);
 this.camera=new T.PerspectiveCamera(38,container.clientWidth/container.clientHeight,.1,150);
 this.camera.position.set(18,24,29);this.camera.lookAt(0,0,0);
 this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.setSize(container.clientWidth,container.clientHeight);
 this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;container.appendChild(this.renderer.domElement);
 this.scene.add(new T.HemisphereLight('#ffffe5','#55768b',2.5));
 const sun=new T.DirectionalLight('#fff2ce',3.1);sun.position.set(-12,25,14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.045;sun.shadow.bias=-.0003;this.scene.add(sun);
 this.scene.add(this.farmWorld,this.arena,this.player);this.arena.visible=false;this.player.position.set(1,0,7);
 this.makeFarm();this.makeArena();
 this.ring=new T.Mesh(new T.RingGeometry(.8,1,48),new T.MeshBasicMaterial({color:'#ffedac',side:T.DoubleSide,transparent:true,opacity:.85}));this.ring.rotation.x=-Math.PI/2;this.ring.position.y=.22;this.farmWorld.add(this.ring);
 this.portal=this.farmWorld.getObjectByName('portal') as T.Mesh;
 this.refreshPlants();
 this.resizeObserver=new ResizeObserver(()=>{if(this.stopped)return;this.camera.aspect=container.clientWidth/container.clientHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(container.clientWidth,container.clientHeight);});this.resizeObserver.observe(container);
 window.addEventListener('keydown',this.keyDown);window.addEventListener('keyup',this.keyUp);window.addEventListener('blur',this.blur);document.addEventListener('visibilitychange',this.visibility);this.renderer.domElement.addEventListener('pointerdown',this.click);this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
 this.abortTools=registerGameTools(()=>this.farm,(i,seed)=>{if(this.mode!=='farm'||!this.started)throw Error('Enter the garden before tending plots');this.seed=seed;this.selectPlot(i);return this.tendPlot();});
 this.loadActors();this.emit();this.frame=requestAnimationFrame(this.tick);
 }
 private mat(color:string){let m=this.materialCache.get(color);if(!m){m=new T.MeshStandardMaterial({color,roughness:.86});this.materialCache.set(color,m);}return m;}
 private shape(parent:T.Object3D,geo:T.BufferGeometry,color:string,x:number,y:number,z:number,sx=1,sy=1,sz=1){const m=new T.Mesh(geo,this.mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 private box(p:T.Object3D,c:string,x:number,y:number,z:number,w:number,h:number,d:number){return this.shape(p,new T.BoxGeometry(w,h,d),c,x,y,z);}
 private blob(p:T.Object3D,c:string,x:number,y:number,z:number,sx:number,sy=sx,sz=sx){return this.shape(p,this.sharedSphere,c,x,y,z,sx,sy,sz);}
 private tree(p:T.Object3D,x:number,z:number,s:number,color='#5a974f'){this.shape(p,new T.CylinderGeometry(.16,.25,2.4,7),'#785844',x,1.1*s,z,s,s,s);this.blob(p,color,x,3.1*s,z,1.5*s,1.8*s,1.4*s);this.blob(p,'#83b45b',x-.55*s,3.1*s,z+.6*s,.95*s);this.blob(p,'#6ba250',x+.6*s,3.8*s,z,.8*s);}

 private makeFarm(){
 const p=this.farmWorld;this.shape(p,new T.CylinderGeometry(14,12.7,2.2,64),'#876c50',0,-1.25,0);this.shape(p,new T.CylinderGeometry(14.1,14,.25,64),'#86b95d',0,-.08,0);
 // A winding footpath connects the cottage, beds, and expedition gate.
 for(let i=0;i<24;i++){const x=-8+i*.7,z=-2.5+Math.sin(i*.22)*1.7;this.shape(p,new T.CylinderGeometry(.75,.8,.055,7),'#d1c38a',x,.07,z,1,.9,1);}
 for(let i=0;i<12;i++){const pos=plotPosition(i);const b=this.box(p,'#776049',pos.x,.10,pos.z,1.94,.21,1.94);b.userData.plot=i;this.plots.push(b);const plant=new T.Group();plant.position.copy(pos);this.plants.push(plant);p.add(plant);
 for(const dx of [-1,1])this.box(p,'#bca479',pos.x+dx*.97,.22,pos.z,.1,.16,2.04);for(const dz of [-1,1])this.box(p,'#bca479',pos.x,.22,pos.z+dz*.97,2.04,.16,.1);}
 // Cottage and open-air cooking nook.
 const house=new T.Group();house.position.set(-7,0,-5);p.add(house);this.box(house,'#f0dfb4',0,1.45,0,4,2.9,3.5);this.box(house,'#80664a',0,.18,0,4.5,.35,4);
 const roof=this.shape(house,new T.ConeGeometry(3.7,2.2,4),'#cd7754',0,3.55,0,1,1,.93);roof.rotation.y=Math.PI/4;
 this.box(house,'#547569',0,.85,1.78,.9,1.65,.14);this.box(house,'#fbd890',-1.15,1.6,1.79,.7,.8,.1);this.box(house,'#fbd890',1.15,1.6,1.79,.7,.8,.1);this.box(house,'#eee3bd',1.1,3.6,-.65,.55,1.6,.55);
 for(const x of [-1.15,1.15]){this.box(house,'#7e654c',x,1.6,1.9,.05,.85,.06);this.box(house,'#7e654c',x,1.6,1.9,.8,.05,.06);}
 
 this.shape(p,new T.CylinderGeometry(.72,.55,.7,12),'#555952',-7,.6,.5);this.blob(p,'#faaf55',-7,.2,.5,.42,.15,.42);for(let i=0;i<5;i++){const a=i*1.256;this.blob(p,'#9ba196',-7+Math.cos(a)*.62,.15,.5+Math.sin(a)*.62,.25);}
 
 // Pond, lily pads and stepping stones.
 const pond=this.shape(p,new T.CylinderGeometry(2.7,2.7,.09,48),'#69b9bf',8,.07,5,1,1,1.15);(pond.material as T.MeshStandardMaterial).roughness=.22;
 for(let i=0;i<14;i++){const a=i/14*Math.PI*2;this.blob(p,'#bec5a0',8+Math.cos(a)*2.8,.1,5+Math.sin(a)*3.15,.4,.25,.38);}
 for(let i=0;i<4;i++)this.shape(p,new T.CylinderGeometry(.35,.35,.035,10),'#6c9b5d',7.2+i*.55,.13,4.5+Math.sin(i)*1.1);
 // The ancient gate is part of the world, rather than a separate menu page.
 this.box(p,'#8c9b87',6,1.5,-6,.8,3,1);this.box(p,'#8c9b87',9,1.5,-6,.8,3,1);this.box(p,'#a4b09a',7.5,3.2,-6,4,.8,1.1);
 const portal=new T.Mesh(new T.CircleGeometry(1.45,48),new T.MeshBasicMaterial({color:'#b8b1ff',transparent:true,opacity:.62,side:T.DoubleSide}));portal.name='portal';portal.position.set(7.5,1.6,-5.8);p.add(portal);
 const ring=new T.Mesh(new T.TorusGeometry(1.45,.075,8,48),new T.MeshStandardMaterial({color:'#d9cdff',emissive:'#8b6de9',emissiveIntensity:.4}));ring.position.copy(portal.position);p.add(ring);
 for(let i=0;i<20;i++){const a=i/20*Math.PI*2,x=Math.cos(a)*12.6,z=Math.sin(a)*12.6;if(z>7&&x>-7&&x<8)continue;this.tree(p,x,z,.65+(i%4)*.13);}
 for(let i=0;i<10;i++){const x=-11+i*2.4;this.box(p,'#d4c6a0',x,.65,10.5,.15,1.3,.15);if(i<9){this.box(p,'#d4c6a0',x+1.2,.75,10.5,2.4,.12,.1);this.box(p,'#d4c6a0',x+1.2,.35,10.5,2.4,.12,.1);}}
 const geo=new T.ConeGeometry(.09,.37,3),grass=new T.InstancedMesh(geo,this.mat('#699d4f'),450);const matrix=new T.Matrix4();let count=0;for(let i=0;i<850&&count<450;i++){const x=Math.sin(i*127.1)*13,z=Math.sin(i*311.7)*13;if(x*x+z*z>170||Math.abs(x)<5&&z>-3&&z<6||x<-4&&z<2||x>5&&z>-8&&z<9)continue;matrix.compose(new T.Vector3(x,.18,z),new T.Quaternion(),new T.Vector3(1,1+(i%3)*.2,1));grass.setMatrixAt(count++,matrix);}grass.count=count;p.add(grass);
 for(let i=0;i<55;i++){const x=Math.sin(i*51.9)*12,z=Math.cos(i*37.7)*12;if(x*x+z*z>165||Math.abs(x)<5&&z>-3&&z<7)continue;this.blob(p,i%3===0?'#fff0a9':i%3===1?'#e8adbb':'#c2b4e7',x,.22,z,.13,.17,.13);}
 for(let i=0;i<9;i++){const a=i*.73;this.blob(p,'#84ad8f',Math.cos(a)*31,-6-i%3,Math.sin(a)*30,6,3,5);}
 }
 private makeArena(){const p=this.arena;this.shape(p,new T.CylinderGeometry(24,23,1.8,64),'#343e4f',0,-1,0);this.shape(p,new T.CylinderGeometry(24,24,.15,64),'#5a766d',0,-.05,0);
 for(let i=0;i<30;i++){const a=i/30*Math.PI*2;this.tree(p,Math.cos(a)*22,Math.sin(a)*22,1+(i%3)*.25,'#416660');}
 for(let i=0;i<40;i++){const x=Math.sin(i*34.3)*21,z=Math.cos(i*61.3)*21;if(x*x+z*z>430)continue;this.blob(p,'#536762',x,.1,z,.6,.18,.55);if(i%4===0){const crystal=this.shape(p,new T.OctahedronGeometry(.55),'#b3a8df',x,.65,z,.55,1.7,.55);(crystal.material as T.MeshStandardMaterial).emissive=new T.Color('#29213e');}}
 const ring=new T.Mesh(new T.RingGeometry(22.4,22.6,96),new T.MeshBasicMaterial({color:'#acd4b4',transparent:true,opacity:.3,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.1;p.add(ring);
 }
 private actor(g:GLTF,height:number):Actor{return createAxieActor(g,height);}
 private async loadActors(){const loader=new GLTFLoader();try{
 for(const id of ['pomodoro','bing','kotaro'] as HeroId[]){const g=await loader.loadAsync('/assets/axie/'+id+'.glb');if(this.stopped)return;const a=this.actor(g,1.9);this.actors.set(id,a);a.root.visible=id===this.farm.hero;this.player.add(a.root);}
 const g=await loader.loadAsync('/assets/axie/sapidae.glb');if(this.stopped)return;this.npc=this.actor(g,1.9);this.npc.root.position.set(-5,0,-3);this.npc.root.rotation.y=.7;this.farmWorld.add(this.npc.root);
 this.ready=true;this.emit();}catch(e){this.error='An Axie could not load. Reload to try again.';console.error('Axie asset loading failed',e);this.emit();}}
 private animate(a:Actor,name:string){if(a.current===name)return;const next=a.actions.get(name)||a.actions.get('Idle');if(!next)return;a.actions.get(a.current)?.fadeOut(.18);next.reset().fadeIn(.18).play();a.current=name;}
 private refreshPlants(){for(let i=0;i<12;i++){const group=this.plants[i],p=this.farm.plots[i];while(group.children.length){const child=group.children[0];group.remove(child);child.traverse(o=>{if(o instanceof T.Sprite){o.material.map?.dispose();o.material.dispose();}if(o instanceof T.Mesh&&o.geometry!==this.sharedSphere)o.geometry.dispose();});}this.plots[i].material=this.mat(p.watered?'#544b3e':p.rich?'#594337':'#80604b');if(!p.crop)continue;
 const stage=Math.floor(p.growth*3),size=.3+stage*.2;for(let j=0;j<4;j++){const x=(j%2)*.75-.38,z=Math.floor(j/2)*.75-.38;this.blob(group,'#4b8648',x,.15+size*.28,z,.18,size,.12);this.blob(group,'#80b84f',x+.17,.22+size*.3,z,.26,.09,.12);this.blob(group,'#5f9e43',x-.16,.29+size*.3,z,.25,.09,.12);if(stage>=1){const color=CROPS[p.crop].color;this.blob(group,color,x,.15+size*.8,z,size*.32,p.crop==='embercorn'?size*.55:size*.3,size*.32);if(p.crop==='moonberry')this.blob(group,color,x+.17,.25+size*.7,z+.05,size*.2);}}
 }
 }
 private save(){try{localStorage.setItem('wildseed-v1',JSON.stringify(this.farm));this.saved=true;}catch{this.saved=false;}}
 private emit(){this.listener({farm:structuredClone(this.farm),mode:this.mode,ready:this.ready,error:this.error,selected:this.selected,seed:this.seed,hp:this.hp,maxHp:this.maxHp,time:this.time,kills:this.kills,level:this.level,dash:this.dash,loot:{...this.loot},upgrade:this.upgrade,result:this.result?structuredClone(this.result):null,message:this.message,paused:this.paused,saved:this.saved,meal:this.meal,tier:this.tier});}
 private toast(s:string){this.message=s;this.messageUntil=this.elapsed+2.5;this.emit();return s;}
 private changed(s:string){this.save();this.refreshPlants();return this.toast(s);}
 start(){if(!this.ready)return;this.started=true;this.toast('Welcome home.');}
 setPaused(value:boolean){this.paused=value;this.keys.clear();this.emit();}
 setMuted(value:boolean){this.muted=value;if(!value){this.audio??=new AudioContext();void this.audio.resume();this.sound(440);}}
 private sound(freq:number){if(this.muted||!this.audio)return;const osc=this.audio.createOscillator(),gain=this.audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,this.audio.currentTime);osc.frequency.exponentialRampToValueAtTime(freq*.7,this.audio.currentTime+.15);gain.gain.setValueAtTime(.035,this.audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+.2);osc.connect(gain);gain.connect(this.audio.destination);osc.start();osc.stop(this.audio.currentTime+.21);}
 selectHero(id:HeroId){if(this.mode!=='farm'||!this.actors.has(id))return;this.farm.hero=id;for(const [key,a]of this.actors)a.root.visible=key===id;this.save();this.emit();}
 selectSeed(id:CropId){this.seed=id;this.emit();}
 selectPlot(index:number){if(this.mode!=='farm'||index<0||index>11)return;this.selected=index;const v=plotPosition(index);this.target=v.clone().add(new T.Vector3(0,0,1));this.emit();}
 tendPlot(){if(this.mode!=='farm')return 'Return to the garden first.';const msg=tend(this.farm,this.selected,this.seed);this.sound(msg.startsWith('+')?660:400);this.pulse(plotPosition(this.selected),CROPS[this.seed].color);return this.changed(msg);}
 improvePlot(kind:'soil'|'fertilizer'){if(this.mode==='farm')this.changed(improve(this.farm,this.selected,kind));}
 cookMeal(id:CropId){if(this.mode==='farm')this.changed(cook(this.farm,id));}
 equipMeal(id:CropId){if(this.mode!=='farm')return;if(this.farm.meals[id]<1){this.toast('Cook this meal first.');return;}this.farm.meal=this.farm.meal===id?null:id;this.save();this.emit();}
 unlock(){if(this.mode==='farm')this.changed(offerHarvest(this.farm));}
 expedition(tier:number){if(!this.ready||!this.started||this.mode!=='farm')return;let stats;try{stats=beginExpedition(this.farm,tier);}catch(e){this.toast((e as Error).message);return;}this.mode='dungeon';this.tier=tier;this.time=0;this.kills=0;this.level=1;this.loot=emptyLoot();this.hp=this.maxHp=stats.hp;this.damage=stats.damage;this.speed=stats.speed;this.meal=stats.meal;this.nextUpgrade=6;this.bossDead=false;this.bossSpawned=false;this.spawnTimer=0;this.attackTimer=0;this.invuln=1;this.dash=0;this.dashTime=0;this.target=null;this.paused=false;this.player.position.set(0,0,0);this.farmWorld.visible=false;this.arena.visible=true;this.scene.background=new T.Color(tier===1?'#92b4b0':'#858ba8');this.scene.fog=new T.Fog(tier===1?'#92b4b0':'#858ba8',38,85);this.save();this.toast('Survive & defeat the guardian.');}
 escape(){if(this.mode==='dungeon')this.finish('escaped');}
 private finish(outcome:'won'|'escaped'|'lost'){if(this.mode!=='dungeon')return;const loot=settleExpedition(this.farm,this.loot,outcome,this.tier);this.result={outcome,loot,kills:this.kills,tier:this.tier};this.mode='farm';this.upgrade=false;this.paused=false;this.farmWorld.visible=true;this.arena.visible=false;this.player.position.set(5,0,-3);this.target=null;this.keys.clear();for(const e of this.enemies)this.removeEnemy(e);this.enemies=[];for(const s of this.shots){this.scene.remove(s.mesh);s.mesh.geometry.dispose();}this.shots=[];this.scene.background=new T.Color('#a9d8dd');this.scene.fog=new T.Fog('#a9d8dd',42,100);this.refreshPlants();this.save();this.emit();}
 dismissResult(){this.result=null;this.emit();}
 chooseUpgrade(id:'damage'|'speed'|'health'){if(!this.upgrade)return;if(id==='damage')this.damage*=1.3;if(id==='speed')this.speed*=1.15;if(id==='health'){this.maxHp+=20;this.hp=Math.min(this.maxHp,this.hp+50);}this.level++;this.nextUpgrade+=7+this.level*2;this.upgrade=false;this.sound(740);this.emit();}
 dashNow(){if(this.mode!=='dungeon'||this.dash>0||this.paused||this.upgrade)return;this.dash=3;this.dashTime=.22;this.invuln=.3;this.sound(260);}
 private pulse(pos:T.Vector3,color:string){const mesh=new T.Mesh(new T.RingGeometry(.2,.3,32),new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.8}));mesh.rotation.x=-Math.PI/2;mesh.position.copy(pos);mesh.position.y=.3;this.scene.add(mesh);this.effects.push({mesh,life:.6});}
 private spawn(boss=false){const a=Math.random()*Math.PI*2,dist=boss?12:15;const pos=this.player.position.clone().add(new T.Vector3(Math.cos(a)*dist,0,Math.sin(a)*dist));if(pos.length()>21)pos.setLength(21);const mesh=new T.Group();mesh.position.copy(pos);const color=boss?'#906fad':this.tier===2?'#b278a5':'#86a275',scale=boss?2.4:.65+Math.random()*.25;
 this.blob(mesh,color,0,scale*.7,0,scale,scale*.8,scale);this.blob(mesh,'#40594e',0,scale*1.3,0,scale*.5,scale*.65,scale*.3);
 for(const x of [-.28,.28]){this.blob(mesh,'#ffe7a0',x*scale,scale*.87,scale*.85,scale*.12);this.blob(mesh,'#2a3940',x*scale,scale*.87,scale*.97,scale*.055);}
 const bar=new T.Mesh(new T.PlaneGeometry(boss?3:1,.09),new T.MeshBasicMaterial({color:boss?'#ecbaec':'#dde8a1',side:T.DoubleSide}));bar.position.y=scale*2.2;mesh.add(bar);this.arena.add(mesh);const hp=boss?this.tier*260:24+this.tier*6+this.time*.18;
 this.enemies.push({mesh,hp,max:hp,speed:boss?1.35:1.45+this.tier*.3+Math.random()*.55,boss,phase:Math.random()*6,bar});}
 private removeEnemy(e:Enemy){this.arena.remove(e.mesh);e.mesh.traverse(o=>{if(o instanceof T.Mesh){if(o.geometry!==this.sharedSphere)o.geometry.dispose();if(o===e.bar)(o.material as T.Material).dispose();}});}
 private hurtEnemy(e:Enemy,damage:number){e.hp-=damage;e.bar.scale.x=Math.max(0,e.hp/e.max);this.pulse(e.mesh.position,e.boss?'#d7a9ed':'#e2e9a2');if(e.hp<=0){this.kills++;rewardKill(this.loot,this.kills,this.tier);if(e.boss)this.bossDead=true;this.removeEnemy(e);this.enemies=this.enemies.filter(x=>x!==e);this.sound(e.boss?800:320);if(this.kills>=this.nextUpgrade&&!this.bossDead)this.upgrade=true;}}
 private combat(dt:number){
 this.time+=dt;this.dash=Math.max(0,this.dash-dt);this.dashTime=Math.max(0,this.dashTime-dt);this.invuln=Math.max(0,this.invuln-dt);this.spawnTimer-=dt;this.attackTimer-=dt;
 if(this.spawnTimer<=0&&this.enemies.length<26){this.spawn(false);this.spawnTimer=Math.max(.52,1.35-this.time*.008);}
 if(this.time>=60&&!this.bossSpawned){this.spawn(true);this.bossSpawned=true;this.toast('Guardian incoming!');}
 const player=this.player.position;
 for(const e of [...this.enemies]){const delta=player.clone().sub(e.mesh.position);delta.y=0;const distance=delta.length();if(distance>.3)e.mesh.position.addScaledVector(delta.normalize(),e.speed*dt);e.mesh.rotation.y=Math.atan2(delta.x,delta.z);e.mesh.position.y=Math.abs(Math.sin(this.time*4+e.phase))*.13;e.bar.quaternion.copy(this.camera.quaternion);e.bar.rotateY(-e.mesh.rotation.y);
 if(distance<(e.boss?2.2:1.05)&&this.invuln<=0){this.hp-=e.boss?19:8+this.tier*2;this.invuln=.75;this.pulse(player,'#ff907e');this.sound(130);if(this.hp<=0){this.hp=0;this.finish('lost');return;}}}
 if(this.attackTimer<=0&&this.enemies.length){const nearest=[...this.enemies].sort((a,b)=>a.mesh.position.distanceToSquared(player)-b.mesh.position.distanceToSquared(player))[0];if(nearest.mesh.position.distanceTo(player)<15){const origin=player.clone().add(new T.Vector3(0,.85,0));const dest=nearest.mesh.position.clone().add(new T.Vector3(0,.65,0));const dir=dest.sub(origin).normalize();
 const mesh=new T.Mesh(new T.SphereGeometry(.16,8,6),new T.MeshBasicMaterial({color:'#fff1a1'}));mesh.position.copy(origin);this.scene.add(mesh);this.shots.push({mesh,velocity:dir.multiplyScalar(17),life:1.3,damage:this.damage});this.attackTimer=Math.max(.22,.65-this.level*.045);
 // Nearby roots protect the Axie when surrounded.
 for(const e of [...this.enemies])if(e.mesh.position.distanceTo(player)<3.1)this.hurtEnemy(e,this.damage*.45);
 }}
 for(let i=this.shots.length-1;i>=0;i--){const s=this.shots[i];s.life-=dt;s.mesh.position.addScaledVector(s.velocity,dt);const enemy=this.enemies.find(e=>s.mesh.position.distanceTo(e.mesh.position.clone().add(new T.Vector3(0,.7,0)))<(e.boss?2:.9));if(enemy){this.hurtEnemy(enemy,s.damage);s.life=0;}if(s.life<=0){this.scene.remove(s.mesh);s.mesh.geometry.dispose();(s.mesh.material as T.Material).dispose();this.shots.splice(i,1);}}
 if(this.time>=90&&this.bossDead)this.finish('won');
 }
 private tick=(t:number)=>{if(this.stopped)return;this.frame=requestAnimationFrame(this.tick);const dt=this.last?Math.min((t-this.last)/1000,.05):0;this.last=t;this.elapsed+=dt;
 const active=this.started&&!this.paused&&!this.upgrade&&!this.result&&!document.hidden;
 if(active){grow(this.farm,dt);let dx=Number(this.keys.has('d')||this.keys.has('arrowright'))-Number(this.keys.has('a')||this.keys.has('arrowleft')),dz=Number(this.keys.has('s')||this.keys.has('arrowdown'))-Number(this.keys.has('w')||this.keys.has('arrowup'));let dir=new T.Vector3((dx+dz)*.707,0,(dz-dx)*.707);if(dir.lengthSq()){dir.normalize();this.target=null;}else if(this.target){dir.copy(this.target).sub(this.player.position);dir.y=0;if(dir.length()<.22){dir.set(0,0,0);this.target=null;}else dir.normalize();}
 const moving=dir.lengthSq()>.01;this.player.position.addScaledVector(dir,dt*(this.mode==='dungeon'?this.speed:5)*(this.dashTime>0?3:1));const bound=this.mode==='farm'?12.5:21.5;if(this.player.position.length()>bound)this.player.position.setLength(bound);
 const actor=this.actors.get(this.farm.hero);if(actor){if(moving)actor.root.rotation.y=Math.atan2(dir.x,dir.z);this.animate(actor,moving?'Run':'Idle');}
 if(this.mode==='dungeon')this.combat(dt);
 }
 for(const a of this.actors.values())a.mixer.update(active?dt:dt*.4);this.npc?.mixer.update(dt);
 if(this.portal)this.portal.scale.setScalar(1+Math.sin(this.elapsed*1.8)*.045);
 this.ring.position.copy(plotPosition(this.selected));this.ring.position.y=.25;this.ring.scale.setScalar(1+Math.sin(this.elapsed*3)*.03);
 for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.life-=dt;e.mesh.scale.addScalar(dt*6);(e.mesh.material as T.MeshBasicMaterial).opacity=Math.max(0,e.life);if(e.life<=0){this.scene.remove(e.mesh);e.mesh.geometry.dispose();(e.mesh.material as T.Material).dispose();this.effects.splice(i,1);}}
 const look=this.mode==='farm'?new T.Vector3(0,0,0):this.player.position.clone();const offset=this.mode==='farm'?new T.Vector3(18,24,29):new T.Vector3(13,19,19);this.camera.position.lerp(look.clone().add(offset),1-Math.exp(-dt*3));this.camera.lookAt(look);
 this.renderer.render(this.scene,this.camera);
 if(this.elapsed-this.emitAt>.2){this.emitAt=this.elapsed;if(this.message&&this.elapsed>this.messageUntil)this.message='';this.emit();}
 if(this.elapsed-this.saveAt>3){this.saveAt=this.elapsed;if(active){this.refreshPlants();this.save();}}
 };
 private keyDown=(e:KeyboardEvent)=>{const tag=(e.target as HTMLElement)?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag)||!this.started||this.paused||this.result)return;const key=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();this.keys.add(key);if(e.repeat)return;if(key==='e'&&!this.upgrade)this.tendPlot();if(key===' ')this.dashNow();if(['1','2','3'].includes(key))this.selectSeed((['sunroot','moonberry','embercorn'] as CropId[])[Number(key)-1]);};
 private keyUp=(e:KeyboardEvent)=>{this.keys.delete(e.key.toLowerCase());};
 private blur=()=>{this.keys.clear();};
 private visibility=()=>{this.keys.clear();this.save();};
 private contextLost=(e:Event)=>{e.preventDefault();this.error='The graphics context was interrupted. Your garden is saved; reload to continue.';this.paused=true;this.emit();};
 private click=(e:PointerEvent)=>{if(!this.started||this.paused||this.upgrade||this.result)return;const rect=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);if(this.mode==='farm'){const hit=this.ray.intersectObjects(this.plots)[0];if(hit){this.selectPlot(hit.object.userData.plot);return;}}
 const point=new T.Vector3();if(this.ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),point)){point.y=0;const bound=this.mode==='farm'?12:21;if(point.length()>bound)point.setLength(bound);this.target=point;}};
 moveKey(key:string,down:boolean){if(down)this.keys.add(key);else this.keys.delete(key);}
 dispose(){this.stopped=true;cancelAnimationFrame(this.frame);this.save();this.abortTools();this.resizeObserver.disconnect();window.removeEventListener('keydown',this.keyDown);window.removeEventListener('keyup',this.keyUp);window.removeEventListener('blur',this.blur);document.removeEventListener('visibilitychange',this.visibility);this.renderer.domElement.removeEventListener('pointerdown',this.click);this.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost);this.scene.traverse(o=>{if(o instanceof T.Sprite){o.material.map?.dispose();o.material.dispose();}if(o instanceof T.Mesh){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){for(const value of Object.values(m))if(value instanceof T.Texture)value.dispose();m.dispose();}}});this.renderer.dispose();this.renderer.domElement.remove();void this.audio?.close();}
}

