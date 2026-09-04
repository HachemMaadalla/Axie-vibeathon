import {EQUIPMENT,equipAxie,equippedMotion} from './equipment';
import {ActionFeedback,type ActionKind} from './action-feedback';
import * as T from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import {createAxieActor} from './model';
import {FollowCamera} from './camera';
import {MovementMotor} from './movement';
import {WORLD_RADIUS,terrainHeight,terrainBiome,isWater,isBridge,BRIDGES,riverX,terrainRoads} from './terrain';
import {makeLandscape,makeFarmLandscape} from './landscape';
import {makeEnemy,disposeEnemy,updateEnemy,enemyKindFor,ENEMY_INFO,type EnemyUnit} from './enemies';
import {EnemyBatch} from './enemy-batch';
import {HealthBar} from './health-bar';
import {plotPosition,nearestPlot} from './farming';
import {nearestService,HERO_SPOTS,RESIDENTS,type IslandService} from './island';
import {trade,type TradeKind} from './economy';
import {CombatFX,CombatAudio} from './combat-fx';
import {freshBuild,STARTER_SPELL,draftChoices,applyChoice,modifiers,xpNeeded,type Build,type Choice,type WeaponId} from './build';
import {SpellEngine,type SpellTarget} from './spell-engine';
import {toonMaterial,batchTrees,type Surface} from './environment';
import {CartoonRenderer,toonify,addCartoonSky} from './toon';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createTreeVisual,createTreeMaterials} from '../gameblocks/modules/world/object/factory/PlantVisualFactory.js';
import {RandomGenerator} from '../gameblocks/modules/math/RandomUtils.js';
import { CROPS, HERO_IDS, freshFarm, hydrateFarm, grow, tend, improve, cook, offerHarvest, beginExpedition, emptyLoot, rewardKill, settleExpedition, type FarmState, type CropId, type HeroId, type Loot } from './state';
import { registerGameTools } from './webmcp';

export type Result={outcome:'won'|'escaped'|'lost';loot:Loot;kills:number;tier:number};
export type View={nearby:IslandService|null;build:Build;choices:Choice[];xp:number;xpNext:number;farm:FarmState;mode:'farm'|'dungeon';ready:boolean;error:string;selected:number;inReach:boolean;seed:CropId;hp:number;maxHp:number;time:number;kills:number;level:number;dash:number;loot:Loot;upgrade:boolean;result:Result|null;message:string;paused:boolean;saved:boolean;meal:CropId|null;tier:number};
type Actor={root:T.Group;mixer:T.AnimationMixer;actions:Map<string,T.AnimationAction>;current:string};

export class WildseedGame {
 private actionFx!:ActionFeedback;private weaponAttackUntil=0;nearby:IslandService|null=null;private campFlame:T.Group|null=null;
 farm:FarmState=freshFarm();mode:'farm'|'dungeon'='farm';ready=false;error='';selected=0;inReach=false;seed:CropId='sunroot';hp=100;maxHp=100;time=0;kills=0;level=1;dash=0;loot:Loot=emptyLoot();upgrade=false;result:Result|null=null;message='';paused=false;saved=true;meal:CropId|null=null;tier=1;
 private scene=new T.Scene();private farmWorld=new T.Group();private arena=new T.Group();private camera:T.PerspectiveCamera;private renderer:T.WebGLRenderer;private cartoon:CartoonRenderer;private listener:(s:View)=>void;
 private actors=new Map<HeroId,Actor>();private residents:{actor:Actor;spec:typeof RESIDENTS[number];phase:number}[]=[];private player=new T.Group();private playerBar=new HealthBar(1.9,.2,"#6be8a1");private keys=new Set<string>();private target:T.Vector3|null=null;private pointer=new T.Vector2();private ray=new T.Raycaster();private plots:T.Mesh[]=[];private plants:T.Group[]=[];private ring:T.Mesh;private portal:T.Mesh;private enemies:EnemyUnit[]=[];private enemyBatch:EnemyBatch;private spawnIndex=0;private terrainChunks:T.Mesh[]=[];private fx:CombatFX;private combatAudio=new CombatAudio();private hostiles:{mesh:T.Mesh;velocity:T.Vector3;life:number;radius:number;max:number;hit:boolean}[]=[];private effects:{mesh:T.Mesh;life:number}[]=[];private frame=0;private last=0;private elapsed=0;private emitAt=0;private saveAt=0;private messageUntil=0;private stopped=false;private started=false;private spawnTimer=0;private invuln=0;private motor=new MovementMotor();private sunlight:T.DirectionalLight;private damage=18;private speed=6;private bossSpawned=false;private bossDead=false;private muted=true;private audio:AudioContext|null=null;private abortTools:()=>void;private resizeObserver:ResizeObserver;
 build:Build=freshBuild();choices:Choice[]=[];xp=0;private baseMaxHp=100;private spells:SpellEngine;
 private followCamera:FollowCamera;private cameraObstacles:T.Object3D[]=[];
 private materialCache=new Map<string,T.MeshToonMaterial>();private sharedSphere=new T.SphereGeometry(1,16,10);private treeMats=new Map<string,ReturnType<typeof createTreeMaterials>>();private toonCache=new Map<T.Material,T.MeshToonMaterial>();
 constructor(private container:HTMLElement,onChange:(s:View)=>void,private onInteract?:(service:IslandService)=>void){
 this.listener=onChange;
 try{const raw=localStorage.getItem('wildseed-v1');if(raw)this.farm=hydrateFarm(JSON.parse(raw));}catch{this.saved=false;}
 this.build=freshBuild(this.farm.hero);this.scene.background=new T.Color('#8fd9f5');this.scene.fog=new T.Fog('#8fd9f5',85,210);
 this.camera=new T.PerspectiveCamera(62,container.clientWidth/container.clientHeight,.1,250);
 this.camera.position.set(18,24,29);this.camera.lookAt(0,0,0);
 this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.setSize(container.clientWidth,container.clientHeight);
 this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.toneMapping=T.NeutralToneMapping;this.renderer.toneMappingExposure=1;this.cartoon=new CartoonRenderer(this.renderer);this.cartoon.resize(container.clientWidth,container.clientHeight);container.appendChild(this.renderer.domElement);
 this.scene.add(new T.HemisphereLight('#fff6dc','#514277',.85));
 const sun=this.sunlight=new T.DirectionalLight('#fff0cc',2.8);sun.position.set(-12,25,14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.045;sun.shadow.bias=-.0003;this.scene.add(sun,sun.target);
 addCartoonSky(this.scene);this.scene.add(this.farmWorld,this.arena,this.player,this.playerBar);this.arena.visible=false;this.player.position.set(1,0,7);
 this.enemyBatch=new EnemyBatch(this.arena);this.fx=new CombatFX(this.scene,window.matchMedia('(prefers-reduced-motion: reduce)').matches);this.actionFx=new ActionFeedback(container);this.makeFarm();this.makeArena();this.expandWorld(this.farmWorld,'farm');this.expandWorld(this.arena,'dungeon');batchTrees(this.farmWorld);batchTrees(this.arena);this.spells=new SpellEngine(this.scene,{fx:this.fx,audio:this.combatAudio,height:(x,z)=>terrainHeight('dungeon',x,z),cast:(id,point)=>this.weaponCast(id,point)});
 this.followCamera=new FollowCamera(this.camera,this.renderer.domElement,()=>this.started&&!this.paused&&!this.upgrade&&!this.result&&!document.hidden,this.click);
 this.scene.updateMatrixWorld(true);
 for(const world of [this.farmWorld,this.arena])world.traverse(o=>{if(o instanceof T.Mesh&&!o.userData.cameraIgnore){const box=new T.Box3().setFromObject(o);if(box.max.y>1&&box.max.y-box.min.y>.8)this.cameraObstacles.push(o);}});
 this.followCamera.snap(this.player.position);
 this.ring=new T.Mesh(new T.RingGeometry(.8,1,48),new T.MeshBasicMaterial({color:'#ffedac',side:T.DoubleSide,transparent:true,opacity:.85}));this.ring.rotation.x=-Math.PI/2;this.ring.position.y=.22;this.farmWorld.add(this.ring);
 this.portal=this.farmWorld.getObjectByName('portal') as T.Mesh;
 this.refreshPlants();
 this.resizeObserver=new ResizeObserver(()=>{if(this.stopped)return;this.camera.aspect=container.clientWidth/container.clientHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(container.clientWidth,container.clientHeight);this.cartoon.resize(container.clientWidth,container.clientHeight);});this.resizeObserver.observe(container);
 window.addEventListener('keydown',this.keyDown);window.addEventListener('keyup',this.keyUp);window.addEventListener('blur',this.blur);document.addEventListener('visibilitychange',this.visibility);this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
 this.abortTools=registerGameTools(()=>this.farm,(i,seed)=>{if(this.mode!=='farm'||!this.started)throw Error('Enter the garden before tending plots');this.syncNearbyPlot();if(i!==this.selected||!this.inReach)throw Error('Move next to this bed first');this.seed=seed;return this.tendPlot();});
 this.loadActors();this.emit();this.frame=requestAnimationFrame(this.tick);
 }
 private mat(color:string,surface:Surface='stone'){const key=color+surface;let m=this.materialCache.get(key);if(!m){m=toonMaterial(color);this.materialCache.set(key,m);}return m;}
 private shape(parent:T.Object3D,geo:T.BufferGeometry,color:string,x:number,y:number,z:number,sx=1,sy=1,sz=1){const m=new T.Mesh(geo,this.mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 private box(p:T.Object3D,c:string,x:number,y:number,z:number,w:number,h:number,d:number){return this.shape(p,new RoundedBoxGeometry(w,h,d,1,Math.min(w,h,d)*.14),c,x,y,z);}
 private blob(p:T.Object3D,c:string,x:number,y:number,z:number,sx:number,sy=sx,sz=sx){return this.shape(p,this.sharedSphere,c,x,y,z,sx,sy,sz);}
 private tree(p:T.Object3D,x:number,z:number,s:number,color='#249359'){
  if(p===this.farmWorld&&[...Object.values(HERO_SPOTS),...RESIDENTS].some(spot=>Math.hypot(x-spot.x,z-spot.z)<3))return;
  let materials=this.treeMats.get(color);if(!materials){const base=new T.Color(color);materials=createTreeMaterials({trunkColor:0x884b37,barkShadowColor:0x53374e,leafColors:[.8,1,1.15].map(f=>({color:base.clone().multiplyScalar(f).getHex(),roughness:.85}))});this.treeMats.set(color,materials);}
  const tree=createTreeVisual({height:4.3*s,radius:.3*s,materials,prng:new RandomGenerator(Math.abs(Math.round(x*973+z*317))+41)});toonify(tree,this.toonCache);tree.position.set(x,terrainHeight(p===this.arena?'dungeon':'farm',x,z),z);tree.userData.batchable=true;p.add(tree);
 }

 private makeFarm(){
 const p=this.farmWorld;makeFarmLandscape(p);
 // A winding footpath connects the cottage, beds, and expedition gate.
 for(let i=0;i<24;i++){const x=-8+i*.7,z=-2.5+Math.sin(i*.22)*1.7;const tile=this.box(p,'#d1c38a',Math.round(x*2)/2,.055,Math.round(z*2)/2,1,.07,1);tile.material=this.mat('#d1c38a','tile');}
 for(let i=0;i<12;i++){const pos=plotPosition(i);const b=this.box(p,'#776049',pos.x,.10,pos.z,1.94,.21,1.94);b.userData.plot=i;this.plots.push(b);const plant=new T.Group();plant.position.copy(pos);this.plants.push(plant);p.add(plant);
 for(const dx of [-1,1])this.box(p,'#bca479',pos.x+dx*.97,.22,pos.z,.1,.16,2.04);for(const dz of [-1,1])this.box(p,'#bca479',pos.x,.22,pos.z+dz*.97,2.04,.16,.1);}
 // Cottage and open-air cooking nook.
 const house=new T.Group();house.position.set(-7,0,-5);p.add(house);this.box(house,'#f0dfb4',0,1.45,0,4,2.9,3.5);this.box(house,'#80664a',0,.18,0,4.5,.35,4);
 const roof=this.shape(house,new T.ConeGeometry(3.55,1.9,4),'#e86643',0,3.5,0);roof.rotation.y=Math.PI/4;roof.scale.z=.95;
 this.box(house,'#547569',0,.85,1.78,.9,1.65,.14);this.box(house,'#fbd890',-1.15,1.6,1.79,.7,.8,.1);this.box(house,'#fbd890',1.15,1.6,1.79,.7,.8,.1);this.box(house,'#eee3bd',1.1,3.6,-.65,.55,1.6,.55);
 for(const x of [-1.15,1.15]){this.box(house,'#7e654c',x,1.6,1.9,.05,.85,.06);this.box(house,'#7e654c',x,1.6,1.9,.8,.05,.06);}
 

 const fire=new T.Group();fire.position.set(-7,0,.5);p.add(fire);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;this.blob(fire,'#8d98a3',Math.cos(a)*.75,.14,Math.sin(a)*.75,.24,.17,.22);}
 for(const angle of [-.6,.6]){const log=this.shape(fire,new T.CylinderGeometry(.12,.15,1.3,7),'#75492e',0,.18,0);log.rotation.set(Math.PI/2,0,angle);}
 this.campFlame=new T.Group();fire.add(this.campFlame);
 this.shape(this.campFlame,new T.ConeGeometry(.42,1.15,7),'#ff7628',0,.65,0);
 this.shape(this.campFlame,new T.ConeGeometry(.23,.78,6),'#ffe283',0,.49,.2);
 for(const side of [-1,1])this.box(fire,'#654431',side*.72,.88,0,.1,1.76,.1);
 this.box(fire,'#654431',0,1.75,0,1.55,.1,.1);
 const pot=this.shape(fire,new T.SphereGeometry(.46,12,8),'#344c57',0,1.12,0,1,.7,1);
 this.shape(fire,new T.CylinderGeometry(.4,.4,.06,12),'#9cc694',0,1.32,0);
 // A small produce stall, with a clear approach from the garden.
 const stall=new T.Group();stall.position.set(-8,0,6.5);p.add(stall);
 this.box(stall,'#825939',0,.57,0,3.1,1.05,1.3);
 this.box(stall,'#dfaf70',0,1.13,0,3.4,.16,1.5);
 for(const side of [-1,1])this.box(stall,'#63442f',side*1.55,1.43,-.5,.14,2.85,.14);
 for(let i=0;i<8;i++){this.box(stall,i%2?'#fff1c4':'#27b5a3',-1.52+i*.435,2.7,.1,.43,.12,2.15);this.box(stall,i%2?'#fff1c4':'#27b5a3',-1.52+i*.435,2.5,1.15,.43,.4,.08);}
 for(let i=0;i<6;i++)this.blob(stall,i%2?'#ba86e1':'#ffc76d',-.9+(i%3)*.45,1.35,-.25+Math.floor(i/3)*.5,.2,.2,.2);
 this.box(stall,'#c6a274',1,1.34,.2,.54,.44,.55);
 // Wide, uncluttered paths to the island services.
 for(const [tx,tz] of [[-7,1.6],[-8,8.6],[7.5,-4.4],[0,-8.5]]){
  const start=new T.Vector3(tx<0?-4.8:5,0,tz<-7?-4.4:5.7),end=new T.Vector3(tx,0,tz),steps=Math.ceil(start.distanceTo(end)/1.1);
  for(let i=0;i<steps;i++){const pos=start.clone().lerp(end,i/steps);this.shape(p,new T.CylinderGeometry(.48,.5,.06,7),'#d5bf88',pos.x,.025,pos.z);}
 }
 for(const [sx,sz,tx,tz] of [[-10,-7,-12,-9],[10,-9,12,-10],[-11,9,-13,12.5],[11,9,13,12]]){const steps=6;for(let i=0;i<=steps;i++){const x=sx+(tx-sx)*i/steps,z=sz+(tz-sz)*i/steps;this.shape(p,new T.CylinderGeometry(.42,.45,.06,7),'#d5bf88',x,terrainHeight('farm',x,z)+.025,z);}}
 // Pond, lily pads and stepping stones.
 const pond=this.shape(p,new T.CircleGeometry(1,48),'#12b8d8',8,.065,5,2.6,2.9,1);pond.rotation.x=-Math.PI/2;for(let i=0;i<9;i++)this.box(p,'#c5ffeb',6.4+i%3*1.3,.089,3.7+Math.floor(i/3)*1.1,.6,.012,.1);
 for(let i=0;i<14;i++){const a=i/14*Math.PI*2;this.blob(p,'#bec5a0',8+Math.cos(a)*2.8,.1,5+Math.sin(a)*3.15,.4,.25,.38);}
 for(let i=0;i<4;i++)this.box(p,'#6c9b5d',7.2+i*.55,.13,4.5+Math.sin(i)*1.1,.55,.04,.55);
 // The ancient gate is part of the world, rather than a separate menu page.
 this.box(p,'#8c9b87',6,1.5,-6,.8,3,1);this.box(p,'#8c9b87',9,1.5,-6,.8,3,1);this.box(p,'#a4b09a',7.5,3.2,-6,4,.8,1.1);
 const portal=new T.Mesh(new T.CircleGeometry(1.32,48),new T.MeshBasicMaterial({color:'#b8b1ff',transparent:true,opacity:.62,side:T.DoubleSide}));portal.name='portal';portal.position.set(7.5,1.6,-5.8);p.add(portal);const portalRim=new T.Mesh(new T.TorusGeometry(1.4,.095,8,40),this.mat('#84f2d0'));portalRim.position.copy(portal.position);p.add(portalRim);
 for(const dx of [-1.4,1.4])this.box(p,'#d9cdff',7.5+dx,1.6,-5.7,.1,2.9,.1);for(const dy of [.2,3])this.box(p,'#d9cdff',7.5,dy,-5.7,2.9,.1,.1);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2,x=Math.cos(a)*12.6,z=Math.sin(a)*12.6;if(z>7&&x>-7&&x<8)continue;this.tree(p,x,z,.65+(i%4)*.13);}
 for(let i=0;i<10;i++){const x=-11+i*2.4;this.box(p,'#d4c6a0',x,.65,10.5,.15,1.3,.15);if(i<9){this.box(p,'#d4c6a0',x+1.2,.75,10.5,2.4,.12,.1);this.box(p,'#d4c6a0',x+1.2,.35,10.5,2.4,.12,.1);}}
 const geo=new T.ConeGeometry(.09,.4,5),grass=new T.InstancedMesh(geo,this.mat('#699d4f'),450);const matrix=new T.Matrix4();let count=0;for(let i=0;i<850&&count<450;i++){const x=Math.sin(i*127.1)*13,z=Math.sin(i*311.7)*13;if(x*x+z*z>170||Math.abs(x)<5&&z>-3&&z<6||x<-4&&z<2||x>5&&z>-8&&z<9)continue;matrix.compose(new T.Vector3(x,.18,z),new T.Quaternion(),new T.Vector3(1,1+(i%3)*.2,1));grass.setMatrixAt(count++,matrix);}grass.count=count;p.add(grass);
 for(let i=0;i<55;i++){const x=Math.sin(i*51.9)*12,z=Math.cos(i*37.7)*12;if(x*x+z*z>165||Math.abs(x)<5&&z>-3&&z<7)continue;this.blob(p,i%3===0?'#fff0a9':i%3===1?'#e8adbb':'#c2b4e7',x,.22,z,.13,.17,.13);}
 for(let i=0;i<9;i++){const a=i*.73;this.blob(p,'#84ad8f',Math.cos(a)*31,-6-i%3,Math.sin(a)*30,6,3,5);}
 }
 private makeArena(){this.terrainChunks=makeLandscape(this.arena);}
 private expandWorld(p:T.Group,mode:'farm'|'dungeon'){
 const radius=WORLD_RADIUS[mode],count=mode==='farm'?14:650;
 for(let i=0;i<count;i++){
  const a=i*2.39996,r=mode==='farm'?18+(i%9)/9*10:18+Math.sqrt((i+.5)/count)*(radius-25);
  const x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(mode==='dungeon'&&(isWater(x,z)||isBridge(x,z)||terrainRoads.distanceToRoad(x,-z)<5))continue;
  const biome=mode==='farm'?'woodland':terrainBiome(x,z);
  const color=biome==='crystal'?'#8354c5':biome==='marsh'?'#087d79':biome==='badlands'?'#d35b3d':'#249359';
  this.tree(p,x,z,(biome==='marsh'?1.1:.8)+(i%4)*.18,color);
 }
 const points=mode==='farm'?[[-22,-10],[19,20],[-18,21]]:[[35,-28],[-55,-65],[104,-58],[-112,60],[65,125],[-105,-95],[160,25],[-35,155],[-170,-15],[80,-153],[0,-160],[135,110]];
 points.forEach(([x,z],index)=>{
  const y=terrainHeight(mode,x,z),group=new T.Group();group.userData.batchable=true;p.add(group);
  const color=['#b3a8df','#76c9d5','#d9b46c','#95c778'][index%4];
  if(index%3===0){
   for(const side of [-1,1]){this.box(group,'#7e8c85',x+side*3,y+3,z,1.6,6,1.6);for(let tier=0;tier<3;tier++)this.box(group,'#adb8a6',x+side*3,y+6+tier*.3,z,2-tier*.3,.3,2-tier*.3);}
   this.box(group,'#9ba795',x,y+6,z,8,.8,1.8);this.box(group,color,x,y+1.5,z,1,3,1);
  }else if(index%3===1){
   for(let j=0;j<7;j++){const a=j*2.4,r=j===0?0:3;const crystal=this.shape(group,new T.ConeGeometry(j===0?1.3:.55,j===0?10:4,5),color,x+Math.cos(a)*r,y+(j===0?5:2),z+Math.sin(a)*r);crystal.rotation.z=(j%3-1)*.15;}
  }else{
   for(let j=0;j<6;j++){const px=x+Math.cos(j*2.4)*4,pz=z+Math.sin(j*2.4)*4,py=terrainHeight(mode,px,pz);this.shape(group,new T.CylinderGeometry(.3,.5,4,10),'#ffe3ad',px,py+2,pz);this.shape(group,new T.SphereGeometry(2,16,10),index%2?'#b645be':'#ee6943',px,py+4,pz,1,.4,1);}
  }
  const beacon=new T.Mesh(new T.BoxGeometry(.2,15,.2),new T.MeshBasicMaterial({color,transparent:true,opacity:.32}));beacon.position.set(x,y+10,z);p.add(beacon);
 });
 if(mode==='dungeon'){
  for(const z of BRIDGES){const x=riverX(z),group=new T.Group();group.userData.batchable=true;p.add(group);for(let i=-12;i<=12;i+=2)for(const side of [-1,1]){const y=terrainHeight(mode,x+i,z);this.box(group,'#b09b72',x+i,y+.6,z+side*2,.15,1.2,.15);this.box(group,'#ad8e65',x+i+.8,y+1,z+side*2,1.6,.12,.13);}}
  // Stones and low shrubs give the open ground scale without blocking combat lanes.
  for(let i=0;i<320;i++){const a=i*2.399,r=25+Math.sqrt(i/320)*(radius-34),x=Math.cos(a)*r,z=Math.sin(a)*r;if(isWater(x,z)||isBridge(x,z))continue;const group=new T.Group();group.userData.batchable=true;p.add(group);const y=terrainHeight(mode,x,z);this.blob(group,i%2?'#647e9c':'#349658',x,y+.3,z,.5+i%3*.3,.5,.7);}
 }
 }

 private actor(g:GLTF,height:number):Actor{const actor=createAxieActor(g,height);toonify(actor.root);return actor;}
 private async loadActors(){
 const loader=new GLTFLoader();
 try{
  const jobs=[
   ...HERO_IDS.map(id=>async()=>{
    const [g,equipment]=await Promise.all([loader.loadAsync('/assets/axie/'+id+'.glb'),loader.loadAsync('/assets/axie/equipment/'+EQUIPMENT[id].file+'.glb')]);
    if(this.stopped)return;
    const a=this.actor(g,1.9);toonify(equipAxie(a,equipment,id),this.toonCache);this.actors.set(id,a);this.syncHeroes();
   }),
   ...RESIDENTS.map((spec,index)=>async()=>{
    const g=await loader.loadAsync('/assets/axie/'+spec.file+'.glb');if(this.stopped)return;
    const actor=this.actor(g,1.65);actor.root.position.set(spec.x,terrainHeight('farm',spec.x,spec.z),spec.z);actor.root.rotation.y=spec.facing;
    this.farmWorld.add(actor.root);this.residents.push({actor,spec,phase:index*.8});
   })
  ];
  let cursor=0;await Promise.all(Array.from({length:3},async()=>{while(cursor<jobs.length)await jobs[cursor++]();}));
  if(this.stopped)return;this.syncHeroes();this.ready=true;this.emit();
 }catch(e){this.error='An Axie could not load. Reload to try again.';console.error('Axie asset loading failed',e);this.emit();}
 }
 private updateResidents(dt:number,active:boolean){
 if(this.mode!=='farm')return;
 for(const r of this.residents){
  if(active&&r.spec.walk){
   r.phase+=dt*.32;const x=r.spec.x+Math.sin(r.phase)*r.spec.walk,z=r.spec.z+Math.sin(r.phase*2)*.35;
   r.actor.root.rotation.y=Math.atan2(Math.cos(r.phase)*r.spec.walk,Math.cos(r.phase*2)*.7);
   r.actor.root.position.set(x,terrainHeight('farm',x,z),z);this.animate(r.actor,'Walk');
  }else this.animate(r.actor,'Idle');
  r.actor.mixer.update(active?dt:dt*.35);
 }
 }
 private syncHeroes(){
 for(const [id,a] of this.actors){
  a.root.visible=true;
  if(id===this.farm.hero){this.player.add(a.root);a.root.position.set(0,0,0);a.root.rotation.set(0,0,0);}
  else{const spot=HERO_SPOTS[id];this.farmWorld.add(a.root);a.root.position.set(spot.x,terrainHeight('farm',spot.x,spot.z),spot.z);a.root.rotation.set(0,Math.atan2(-spot.x,4-spot.z),0);this.animate(a,equippedMotion(a,id,false));}
 }
 }
 interact(){
 if(this.mode!=='farm'||!this.started||this.paused||this.upgrade||this.result)return;
 this.syncNearbyPlot();
 if(this.nearby){this.setPaused(true);this.onInteract?.(this.nearby);return;}
 this.tendPlot();
 }
 tradeItem(side:'buy'|'sell',kind:TradeKind,id:CropId){
 if(this.mode!=='farm'||nearestService(this.player.position,this.farm.hero).service?.kind!=='shop')return;
 const before=this.farm.coins,msg=trade(this.farm,side,kind,id),delta=this.farm.coins-before;
 if(!delta){this.toast(msg);return;}
 this.sound(side==='sell'?880:560);
 this.actionDone('coin',new T.Vector3(-8,2.7,6.5),delta,'shop',(side==='sell'?'Sold ':'Bought ')+CROPS[id].name+', '+Math.abs(delta)+' coins '+(delta>0?'earned':'spent'));
 }
 private animate(a:Actor,name:string){if(a.current===name)return;const next=a.actions.get(name)||a.actions.get('Idle');if(!next)return;a.actions.get(a.current)?.fadeOut(.18);next.reset().fadeIn(.18).play();a.current=name;}
 private refreshPlants(){for(let i=0;i<12;i++){const group=this.plants[i],p=this.farm.plots[i];while(group.children.length){const child=group.children[0];group.remove(child);child.traverse(o=>{if(o instanceof T.Sprite){o.material.map?.dispose();o.material.dispose();}if(o instanceof T.Mesh&&o.geometry!==this.sharedSphere)o.geometry.dispose();});}this.plots[i].material=this.mat(p.watered?'#544b3e':p.rich?'#594337':'#80604b','soil');if(!p.crop)continue;
 const stage=Math.floor(p.growth*3),size=.3+stage*.2;for(let j=0;j<4;j++){const x=(j%2)*.75-.38,z=Math.floor(j/2)*.75-.38;this.blob(group,'#4b8648',x,.15+size*.28,z,.18,size,.12);this.blob(group,'#80b84f',x+.17,.22+size*.3,z,.26,.09,.12);this.blob(group,'#5f9e43',x-.16,.29+size*.3,z,.25,.09,.12);if(stage>=1){const color=CROPS[p.crop].color;this.blob(group,color,x,.15+size*.8,z,size*.32,p.crop==='embercorn'?size*.55:size*.3,size*.32);if(p.crop==='moonberry')this.blob(group,color,x+.17,.25+size*.7,z+.05,size*.2);}}
 }
 }
 private save(){try{localStorage.setItem('wildseed-v1',JSON.stringify(this.farm));this.saved=true;}catch{this.saved=false;}}
 private emit(){this.listener({nearby:this.mode==='farm'?this.nearby:null,build:structuredClone(this.build),choices:structuredClone(this.choices),xp:this.xp,xpNext:xpNeeded(this.level),farm:structuredClone(this.farm),mode:this.mode,ready:this.ready,error:this.error,selected:this.selected,inReach:this.inReach,seed:this.seed,hp:this.hp,maxHp:this.maxHp,time:this.time,kills:this.kills,level:this.level,dash:this.dash,loot:{...this.loot},upgrade:this.upgrade,result:this.result?structuredClone(this.result):null,message:this.message,paused:this.paused,saved:this.saved,meal:this.meal,tier:this.tier});}
 private toast(s:string){this.message=s;this.messageUntil=this.elapsed+2.5;this.emit();return s;}
 private changed(s:string){this.save();this.refreshPlants();return this.toast(s);}
 start(){if(!this.ready)return;this.started=true;this.toast('Space jump · Shift sprint · Q dash');}
 setPaused(value:boolean){this.paused=value;this.keys.clear();this.emit();}
 setMuted(value:boolean){this.muted=value;this.combatAudio.muted=value;if(!value)this.combatAudio.enable();if(!value){this.audio??=new AudioContext();void this.audio.resume();this.sound(440);}}
 private sound(freq:number){if(this.muted||!this.audio)return;const osc=this.audio.createOscillator(),gain=this.audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,this.audio.currentTime);osc.frequency.exponentialRampToValueAtTime(freq*.7,this.audio.currentTime+.15);gain.gain.setValueAtTime(.035,this.audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+.2);osc.connect(gain);gain.connect(this.audio.destination);osc.start();osc.stop(this.audio.currentTime+.21);}
 selectHero(id:HeroId){if(this.mode!=='farm'||!this.actors.has(id))return;this.farm.hero=id;this.build=freshBuild(id);this.weaponAttackUntil=0;this.syncHeroes();this.nearby=null;this.save();this.emit();}
 selectSeed(id:CropId){this.seed=id;this.emit();}
 private syncNearbyPlot(){
 const near=nearestPlot(this.player.position),station=nearestService(this.player.position,this.farm.hero);
 const next=station.service&&(!near.inReach||station.distance<near.distance)?station.service:null;
 const reach=near.inReach&&!next,changed=near.index!==this.selected||reach!==this.inReach||next?.kind!==this.nearby?.kind||next?.hero!==this.nearby?.hero;
 this.selected=near.index;this.inReach=reach;this.nearby=next;if(changed)this.emit();
 }
 tendPlot(){
 if(this.mode!=='farm')return 'Return to the garden first.';
 if(!this.started||this.paused||this.result)return 'Resume the game first.';
 this.syncNearbyPlot();if(!this.inReach)return this.toast('Move closer');
 const before={...this.farm.plots[this.selected]},harvests=this.farm.harvests;
 const msg=tend(this.farm,this.selected,this.seed),after=this.farm.plots[this.selected];
 const kind=!before.crop&&after.crop?'plant':before.crop&&!after.crop?'harvest':!before.watered&&after.watered?'water':null;
 if(!kind)return this.toast(!before.crop?'No seeds':before.watered?'Growing':'Unavailable');
 const amount=kind==='harvest'?this.farm.harvests-harvests:undefined;
 const point=plotPosition(this.selected);this.sound(kind==='water'?520:kind==='harvest'?780:400);this.pulse(point,kind==='water'?'#6bd5ff':CROPS[before.crop??this.seed].color);
 this.actionDone(kind,point.clone().add(new T.Vector3(0,1,0)),amount,undefined,kind==='harvest'?'Harvested '+amount+' '+CROPS[before.crop!].name:kind==='water'?'Watered':CROPS[this.seed].name+' planted');
 return msg;
 }
 private actionDone(kind:ActionKind,point:T.Vector3,amount?:number,anchor?:string,label?:string){this.actionFx?.spawn(kind,point,{amount,anchor,label});this.changed('');}
 improvePlot(kind:'soil'|'fertilizer'){
 if(this.mode!=='farm'||!this.started||this.paused||this.result)return;
 this.syncNearbyPlot();if(!this.inReach){this.toast('Move closer');return;}
 const before=this.farm[kind],msg=improve(this.farm,this.selected,kind);
 if(this.farm[kind]===before){this.toast(msg);return;}
 this.sound(600);this.actionDone(kind,plotPosition(this.selected).add(new T.Vector3(0,1,0)),undefined,undefined,kind==='soil'?'Soil improved':'Fertilized');
 }
 cookMeal(id:CropId){
 if(this.mode!=='farm')return;const before=this.farm.meals[id],msg=cook(this.farm,id);
 if(this.farm.meals[id]===before){this.toast(msg);return;}
 this.sound(660);this.actionDone('meal',new T.Vector3(-7,2,.5),1,'cook-'+id,'Meal cooked');
 }
 equipMeal(id:CropId){if(this.mode!=='farm')return;if(this.farm.meals[id]<1){this.toast('Cook a meal first');return;}this.farm.meal=this.farm.meal===id?null:id;this.save();this.emit();}
 unlock(){
 if(this.mode!=='farm')return;const before=this.farm.unlocked,msg=offerHarvest(this.farm);
 if(before===this.farm.unlocked){this.toast(msg);return;}
 this.sound(920);this.actionDone('unlock',new T.Vector3(7.5,2,-5.8),undefined,'portal','Bramble Hollow unlocked');
 }
 expedition(tier:number){if(!this.ready||!this.started||this.mode!=='farm')return;let stats;try{stats=beginExpedition(this.farm,tier);}catch(e){this.toast((e as Error).message);return;}this.actionFx.clear();this.mode='dungeon';this.tier=tier;this.time=0;this.kills=0;this.level=1;this.xp=0;this.build=freshBuild(this.farm.hero);this.weaponAttackUntil=0;this.spells.clear();this.fx.clear();this.clearHostiles();this.spawnIndex=0;this.choices=[];this.upgrade=false;this.loot=emptyLoot();this.hp=this.maxHp=this.baseMaxHp=stats.hp;this.damage=stats.damage;this.speed=stats.speed*1.5;this.meal=stats.meal;this.bossDead=false;this.bossSpawned=false;this.spawnTimer=0;this.invuln=1;this.dash=0;this.motor.reset();this.target=null;this.paused=false;this.player.position.set(0,terrainHeight('dungeon',0,0),0);this.followCamera.snap(this.player.position);this.farmWorld.visible=false;this.arena.visible=true;this.scene.background=new T.Color(tier===1?'#8fd9f5':'#b6b3ed');this.scene.fog=new T.Fog(tier===1?'#8fd9f5':'#b6b3ed',100,235);this.save();this.toast('Survive & defeat the guardian.');}
 escape(){if(this.mode==='dungeon')this.finish('escaped');}
 private finish(outcome:'won'|'escaped'|'lost'){if(this.mode!=='dungeon')return;const loot=settleExpedition(this.farm,this.loot,outcome,this.tier);this.result={outcome,loot,kills:this.kills,tier:this.tier};this.mode='farm';this.hp=this.maxHp;this.upgrade=false;this.paused=false;this.farmWorld.visible=true;this.arena.visible=false;this.player.position.set(5,0,-3);this.motor.reset();this.dash=0;this.followCamera.snap(this.player.position);this.target=null;this.keys.clear();for(const e of this.enemies)this.removeEnemy(e);this.enemies=[];this.spells.clear();this.fx.clear();this.clearHostiles();this.choices=[];this.scene.background=new T.Color('#8fd9f5');this.scene.fog=new T.Fog('#8fd9f5',85,210);this.refreshPlants();this.save();this.emit();}
 dismissResult(){this.result=null;this.emit();}
 private weaponCast(id:WeaponId,point:T.Vector3){
 if(id!==STARTER_SPELL[this.farm.hero])return;
 const actor=this.actors.get(this.farm.hero);if(!actor)return;
 const name=EQUIPMENT[this.farm.hero].prefix+'.Attack',attack=actor.actions.get(name);if(!attack)return;
 actor.actions.get(actor.current)?.fadeOut(.08);
 attack.reset().setLoop(T.LoopOnce,1).setEffectiveTimeScale(attack.getClip().duration/.5);attack.clampWhenFinished=true;attack.fadeIn(.08).play();
 actor.current=name;this.weaponAttackUntil=this.elapsed+.5;
 actor.root.rotation.y=Math.atan2(point.x-this.player.position.x,point.z-this.player.position.z);
 }
 private queueUpgrade(){if(this.mode!=='dungeon'||this.upgrade||this.xp<xpNeeded(this.level))return;this.xp-=xpNeeded(this.level);this.level++;this.choices=draftChoices(this.build);this.upgrade=true;this.keys.clear();this.emit();}
 chooseUpgrade(id:Choice['id']){if(!this.upgrade||this.mode!=='dungeon')return;const choice=this.choices.find(c=>c.id===id);if(!choice||!applyChoice(this.build,choice))return;const oldMax=this.maxHp;this.maxHp=this.baseMaxHp+modifiers(this.build).health;this.hp=Math.min(this.maxHp,this.hp+this.maxHp-oldMax+(id==='heal'?35:0));this.upgrade=false;this.choices=[];this.keys.clear();this.sound(choice.kind==='evolution'?1000:740);if(choice.kind==='evolution')this.toast(choice.name+' awakened!');this.queueUpgrade();this.emit();}


 jumpNow(){if(!this.started||this.paused||this.upgrade||this.result)return;this.motor.requestJump();}
 dashNow(){if(!this.started||this.paused||this.upgrade||this.result)return;const facing=this.actors.get(this.farm.hero)?.root.rotation.y??Math.PI;const dir=this.motor.velocity.lengthSq()>.1?this.motor.velocity:new T.Vector3(Math.sin(facing),0,Math.cos(facing));if(this.motor.dash(dir)){this.invuln=.24;this.combatAudio.play('dash');this.fx.burst(this.player.position.clone().add(new T.Vector3(0,.5,0)),'#b6ead5',12,3);}}

 private pulse(pos:T.Vector3,color:string){const mesh=new T.Mesh(new T.RingGeometry(.2,.3,32),new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.8}));mesh.rotation.x=-Math.PI/2;mesh.position.copy(pos);mesh.position.y=.3;this.scene.add(mesh);this.effects.push({mesh,life:.6});}
 private spawn(boss=false){
 const kind=boss?'guardian':enemyKindFor(this.time,this.spawnIndex++),e=makeEnemy(kind,this.tier,this.spawnIndex*.71);
 const a=Math.random()*Math.PI*2,dist=boss?19:18+Math.random()*7;
 e.mesh.position.copy(this.player.position).add(new T.Vector3(Math.cos(a)*dist,0,Math.sin(a)*dist));this.clampEnemy(e);
 e.mesh.position.y=terrainHeight('dungeon',e.mesh.position.x,e.mesh.position.z);e.max*=1+this.time*.001;e.hp=e.max;
 this.arena.add(e.mesh);this.enemies.push(e);this.fx.ring(e.mesh.position,e.boss?3:1.2,ENEMY_INFO[kind].color,.5);
 }
 private clampEnemy(e:EnemyUnit){const r=Math.hypot(e.mesh.position.x,e.mesh.position.z),limit=WORLD_RADIUS.dungeon-3;if(r>limit){e.mesh.position.x*=limit/r;e.mesh.position.z*=limit/r;}}
 private removeEnemy(e:EnemyUnit){disposeEnemy(e);}
 private hurtEnemy(e:EnemyUnit,damage:number){
 if(e.hp<=0)return;e.hp-=damage;e.flash=.09;e.bar.update(e.hp,e.max);
 const away=e.mesh.position.clone().sub(this.player.position);away.y=0;if(away.lengthSq())e.push.addScaledVector(away.normalize(),e.boss?1:3.5);
 this.fx.impact(e.mesh.position.clone().add(new T.Vector3(0,e.aimHeight,0)),damage,ENEMY_INFO[e.kind].color,e.hp<=0,e.boss);
 this.combatAudio.play(e.hp<=0?'kill':'hit');
 if(e.hp<=0){this.kills++;this.xp+=e.xpValue;rewardKill(this.loot,this.kills,this.tier);if(e.boss)this.bossDead=true;this.removeEnemy(e);this.enemies=this.enemies.filter(x=>x!==e);}
 }
 private damagePlayer(amount:number,origin:T.Vector3){
 if(this.invuln>0||this.mode!=='dungeon')return;
 this.hp=Math.max(0,this.hp-amount);this.invuln=.65;this.fx.hurt(this.player.position.clone().add(new T.Vector3(0,1,0)));this.combatAudio.play('hurt');
 const away=this.player.position.clone().sub(origin);away.y=0;if(away.lengthSq())this.motor.velocity.addScaledVector(away.normalize(),4);
 }
 private hostileShot(from:T.Vector3,to:T.Vector3){
 if(this.hostiles.length>=90)return;
 const mesh=new T.Mesh(new T.OctahedronGeometry(.23),new T.MeshBasicMaterial({color:'#ed99ff'}));mesh.position.copy(from);this.scene.add(mesh);
 this.hostiles.push({mesh,velocity:to.sub(from).normalize().multiplyScalar(10),life:3,radius:0,max:0,hit:false});
 this.fx.burst(from,'#dfb8ff',5,2);
 }
 private hostileSlam(point:T.Vector3,radius:number){
 const mesh=new T.Mesh(new T.RingGeometry(.9,1,64),new T.MeshBasicMaterial({color:'#ffbb78',transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}));
 mesh.rotation.x=-Math.PI/2;mesh.position.copy(point);mesh.position.y+=.15;mesh.scale.setScalar(.2);this.scene.add(mesh);
 this.hostiles.push({mesh,velocity:new T.Vector3(),life:1.2,radius:.2,max:radius,hit:false});this.fx.burst(point.clone().add(new T.Vector3(0,.3,0)),'#e9c796',35,9);this.combatAudio.play('meteor');this.fx.shake=.14;
 }
 private clearHostiles(){for(const h of this.hostiles){this.scene.remove(h.mesh);h.mesh.geometry.dispose();(h.mesh.material as T.Material).dispose();}this.hostiles=[];}
 private combat(dt:number){
 this.time+=dt;this.invuln=Math.max(0,this.invuln-dt);this.spawnTimer-=dt;this.hp=Math.min(this.maxHp,this.hp+dt*(modifiers(this.build).regen+this.spells.healingAt(this.player.position)));
 if(this.spawnTimer<=0&&this.enemies.length<60){this.spawn(false);if(this.time>25&&this.enemies.length<59&&this.spawnIndex%3===0)this.spawn(false);this.spawnTimer=Math.max(.28,.85-this.time*.006);}
 if(this.time>=60&&!this.bossSpawned){this.spawn(true);this.bossSpawned=true;this.toast('Elder Thornwarden awakened');}
 const player=this.player.position;
 for(const e of this.enemies){
  const distance=Math.hypot(player.x-e.mesh.position.x,player.z-e.mesh.position.z);
  if(!e.boss&&distance>48){const a=Math.random()*Math.PI*2;e.mesh.position.set(player.x+Math.cos(a)*25,0,player.z+Math.sin(a)*25);e.state='seek';e.cooldown=1;e.spawnAge=0;}
  updateEnemy(e,dt,player,this.time,(x,z)=>terrainHeight('dungeon',x,z),this.spells.speedMultiplier(e),{
   telegraph:(point,radius,duration)=>this.fx.ring(point,radius,'#ff765f',duration,true),
   projectile:(from,to)=>this.hostileShot(from,to),
   slam:(point,radius)=>this.hostileSlam(point,radius),
   damage:(amount,point)=>this.damagePlayer(amount,point)
  });
  this.clampEnemy(e);e.bar.face(this.camera);
 }
 for(let i=this.hostiles.length-1;i>=0;i--){
  const h=this.hostiles[i];h.life-=dt;
  if(h.max>0){h.radius+=dt*10;h.mesh.scale.setScalar(h.radius);const d=Math.hypot(player.x-h.mesh.position.x,player.z-h.mesh.position.z);if(!h.hit&&Math.abs(d-h.radius)<.8&&player.y-terrainHeight('dungeon',player.x,player.z)<1.2&&Math.abs(player.y-h.mesh.position.y)<2){this.damagePlayer(22,h.mesh.position);h.hit=true;}if(h.radius>h.max)h.life=0;}
  else{h.mesh.position.addScaledVector(h.velocity,dt);h.mesh.rotation.y+=dt*8;this.fx.trail(h.mesh.position,'#dc9aff',.11);if(h.mesh.position.distanceTo(player.clone().add(new T.Vector3(0,.85,0)))<.85){this.damagePlayer(11,h.mesh.position);h.life=0;}if(h.mesh.position.y<terrainHeight('dungeon',h.mesh.position.x,h.mesh.position.z))h.life=0;}
  if(h.life<=0){this.fx.burst(h.mesh.position,'#e3bdff',4,2);this.scene.remove(h.mesh);h.mesh.geometry.dispose();(h.mesh.material as T.Material).dispose();this.hostiles.splice(i,1);}
 }
 if(this.hp<=0){this.finish('lost');return;}
 this.spells.update(dt,player,this.build,this.damage,this.enemies,(target:SpellTarget,damage:number)=>this.hurtEnemy(target as EnemyUnit,damage));
 this.queueUpgrade();if(this.time>=90&&this.bossDead)this.finish('won');
 }

 private tick=(t:number)=>{if(this.stopped)return;this.frame=requestAnimationFrame(this.tick);const realDt=this.last?Math.min((t-this.last)/1000,.05):0;const dt=realDt*(this.fx.freeze>0?.35:1);this.last=t;this.elapsed+=realDt;
 const active=this.started&&!this.paused&&!this.upgrade&&!this.result&&!document.hidden;
 if(active){grow(this.farm,dt);let dx=Number(this.keys.has('d')||this.keys.has('arrowright'))-Number(this.keys.has('a')||this.keys.has('arrowleft')),dz=Number(this.keys.has('s')||this.keys.has('arrowdown'))-Number(this.keys.has('w')||this.keys.has('arrowup'));let dir=this.followCamera.movement(dx,dz);if(dir.lengthSq()){dir.normalize();this.target=null;}else if(this.target){dir.copy(this.target).sub(this.player.position);dir.y=0;if(dir.length()<.22){dir.set(0,0,0);this.target=null;}else dir.normalize();}
 const jumped=this.motor.step(dt,this.player.position,dir,this.mode==='dungeon'?this.speed:8,this.keys.has('shift'),WORLD_RADIUS[this.mode]-2.5,(x,z)=>terrainHeight(this.mode,x,z));this.dash=this.motor.dashCooldown;if(jumped){this.sound(440);this.fx.burst(this.player.position,'#e5dfbd',8,2);}if(this.motor.dashing)this.fx.trail(this.player.position.clone().add(new T.Vector3(0,.6,0)),'#bcebd1',.2);const moving=this.motor.velocity.lengthSq()>.1;if(moving)dir.copy(this.motor.velocity).normalize();
 const actor=this.actors.get(this.farm.hero);if(actor&&this.elapsed>=this.weaponAttackUntil){if(moving)actor.root.rotation.y=Math.atan2(dir.x,dir.z);this.animate(actor,equippedMotion(actor,this.farm.hero,moving));}
 if(this.mode==='dungeon')this.combat(dt);else this.syncNearbyPlot();
 }
 for(const [id,a] of this.actors)if(id===this.farm.hero||this.mode==='farm')a.mixer.update(active?dt:dt*.4);this.updateResidents(dt,active);
 if(this.campFlame)this.campFlame.scale.set(1+Math.sin(this.elapsed*9)*.06,1+Math.sin(this.elapsed*12)*.12,1);
 if(this.portal)this.portal.scale.setScalar(1+Math.sin(this.elapsed*1.8)*.045);
 this.ring.visible=this.inReach||!!this.nearby;this.ring.position.copy(this.nearby?new T.Vector3(this.nearby.x,.25,this.nearby.z):plotPosition(this.selected));this.ring.position.y=.25;this.ring.scale.setScalar(1+Math.sin(this.elapsed*3)*.03);
 for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.life-=dt;e.mesh.scale.addScalar(dt*6);(e.mesh.material as T.MeshBasicMaterial).opacity=Math.max(0,e.life);if(e.life<=0){this.scene.remove(e.mesh);e.mesh.geometry.dispose();(e.mesh.material as T.Material).dispose();this.effects.splice(i,1);}}
 this.followCamera.update(dt,this.player.position,this.cameraObstacles.filter(o=>{let p:T.Object3D|null=o;while(p){if(!p.visible)return false;p=p.parent;}return true;}),(x,z)=>terrainHeight(this.mode,x,z));
 const desiredFov=this.motor.dashing?70:this.keys.has('shift')?67:62;this.camera.fov=T.MathUtils.lerp(this.camera.fov,desiredFov,1-Math.exp(-dt*6));this.camera.updateProjectionMatrix();this.sunlight.position.copy(this.player.position).add(new T.Vector3(-12,25,14));this.sunlight.target.position.copy(this.player.position);
 this.player.visible=this.mode!=='dungeon'||this.invuln<=0||Math.floor(this.invuln*18)%2===0;this.enemyBatch.update(this.enemies);this.playerBar.position.copy(this.player.position).add(new T.Vector3(0,2.5,0));this.playerBar.visible=this.started&&!this.result;this.playerBar.update(this.hp,this.maxHp,active?dt:0);this.playerBar.face(this.camera);for(const e of this.enemies)e.bar.face(this.camera);
 this.fx.update(active?realDt:0,active?this.camera:undefined);const ripples=this.arena.getObjectByName('river-ripples');if(ripples)ripples.position.z=Math.sin(this.elapsed*.7)*.25;this.cartoon.render(this.scene,this.camera);this.actionFx.update(document.hidden?0:realDt,this.camera);
 if(this.elapsed-this.emitAt>.2){this.emitAt=this.elapsed;if(this.message&&this.elapsed>this.messageUntil)this.message='';this.emit();}
 if(this.elapsed-this.saveAt>3){this.saveAt=this.elapsed;if(active){this.refreshPlants();this.save();}}
 };
 private keyDown=(e:KeyboardEvent)=>{const tag=(e.target as HTMLElement)?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag)||!this.started||this.paused||this.result||this.upgrade)return;const key=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','shift','q'].includes(key))e.preventDefault();this.keys.add(key);if(e.repeat)return;if(key==='v')this.followCamera.reset((this.actors.get(this.farm.hero)?.root.rotation.y??Math.PI)+Math.PI);if(key==='e')this.interact();if(key===' ')this.jumpNow();if(key==='q')this.dashNow();if(['1','2','3'].includes(key))this.selectSeed((['sunroot','moonberry','embercorn'] as CropId[])[Number(key)-1]);};
 private keyUp=(e:KeyboardEvent)=>{this.keys.delete(e.key.toLowerCase());};
 private blur=()=>{this.keys.clear();};
 private visibility=()=>{this.keys.clear();this.save();};
 private contextLost=(e:Event)=>{e.preventDefault();this.error='The graphics context was interrupted. Your garden is saved; reload to continue.';this.paused=true;this.emit();};
 private click=(e:PointerEvent)=>{if(!this.started||this.paused||this.upgrade||this.result)return;const rect=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);
 const terrain=this.farmWorld.getObjectByName('terrain-surface');const surface=this.mode==='dungeon'?this.ray.intersectObjects(this.terrainChunks,false)[0]:terrain?this.ray.intersectObject(terrain,false)[0]:null;const point=surface?surface.point.clone():new T.Vector3();if(surface||this.ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),point)){point.y=0;const bound=WORLD_RADIUS[this.mode]-3;const flat=Math.hypot(point.x,point.z);if(flat>bound){point.x*=bound/flat;point.z*=bound/flat;}point.y=terrainHeight(this.mode,point.x,point.z);this.target=point;}};
 moveKey(key:string,down:boolean){if(down)this.keys.add(key);else this.keys.delete(key);}
 dispose(){this.stopped=true;cancelAnimationFrame(this.frame);this.save();this.abortTools();this.resizeObserver.disconnect();window.removeEventListener('keydown',this.keyDown);window.removeEventListener('keyup',this.keyUp);window.removeEventListener('blur',this.blur);document.removeEventListener('visibilitychange',this.visibility);this.followCamera.dispose();this.actionFx.dispose();this.spells.dispose();this.enemyBatch.dispose();this.fx.dispose();this.combatAudio.dispose();this.clearHostiles();this.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost);this.scene.traverse(o=>{if(o instanceof T.Sprite){o.material.map?.dispose();o.material.dispose();}if(o instanceof T.Mesh){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){for(const value of Object.values(m))if(value instanceof T.Texture)value.dispose();m.dispose();}}});this.cartoon.dispose();this.renderer.dispose();this.renderer.domElement.remove();void this.audio?.close();}
}


