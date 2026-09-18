import {grantQuality,rollQuality,farmLuck,type Stars,type QualityBag} from './quality';
import {IslandAtmosphere} from './atmosphere';
import {battleSpawn} from './arena-spawn';
import {progress,discover,buyUpgrade,craftCompost,CHALLENGES,type Challenge,type Upgrade} from './progression';
import {PlotPrompt} from './plot-prompt';
import {FARM_SLOTS,FARM_SLOT_KEYS,farmAction,isSeed,type FarmItem} from './farm-tools';
import {setFarmEquipment,useFarmEquipment,updateFarmEquipment} from './farm-equipment';
import {PlayerFeel} from './player-feel';
import {GardenArt,createGardenTree,createGardenCottage,createGardenCrop,gardenStreamNear} from './garden-art';
import {setGardenMotionTime} from './garden-motion';
import {CollisionWorld} from './collisions';
import {BattlePickups,rollDrops,type PickupKind} from './pickups';
import {EQUIPMENT,equipAxie,equippedMotion} from './equipment';
import {ActionFeedback,type ActionKind} from './action-feedback';
import * as T from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import {createAxieActor} from './model';
import {FollowCamera} from './camera';
import {MovementMotor} from './movement';
import {WORLD_RADIUS,terrainHeight} from './terrain';
import {makeLandscape,makeFarmLandscape} from './landscape';
import {makeEnemy,disposeEnemy,updateEnemy,enemyKindFor,bossKindFor,ENEMY_INFO,type EnemyUnit,type EnemyKind} from './enemies';
import {EnemyBatch} from './enemy-batch';
import {EnemyAttacks} from './enemy-attacks';
import {HealthBar} from './health-bar';
import {plotPosition,nearestPlot} from './farming';
import {nearestService,FARM_FORGE,ISLAND_SERVICES,HERO_SPOTS,RESIDENTS,type IslandService} from './island';
import {CombatFX,CombatAudio} from './combat-fx';
import {freshBuild,STARTER_SPELL,draftChoices,applyChoice,modifiers,xpNeeded,type Build,type Choice,type WeaponId} from './build';
import {SpellEngine,type SpellTarget} from './spell-engine';
import {toonMaterial,batchTrees,type Surface} from './environment';
import {CartoonRenderer,toonify,addCartoonSky} from './toon';
import {crispTexture} from './pixel-style';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {WaveDirector} from './waves';
import { CROPS, PLOT_COUNT, HERO_IDS, freshFarm, hydrateFarm, grow, tend, improve, cook, offerHarvest, craftKey, beginExpedition, emptyLoot, settleExpedition, type FarmState, type CropId, type HeroId, type Loot } from './state';
import { registerGameTools } from './webmcp';

export type Result={outcome:'won'|'escaped'|'lost';loot:Loot;kills:number;tier:number};
export type View={farmAction?:{kind:'plant'|'water'|'harvest';plot:number;serial:number};loadingDone?:number;loadingTotal?:number;enemiesLeft?:number;exitBearing?:number;exitDistance?:number;wave?:number;waveBreak?:number;lootQuality?:QualityBag;boss?:{name:string;hp:number;max:number;enraged:boolean;color:string}|null;position?:{x:number;z:number};challenge?:Challenge;reducedMotion?:boolean;held:FarmItem;exitReady:boolean;nearExit:boolean;nearby:IslandService|null;build:Build;choices:Choice[];xp:number;xpNext:number;farm:FarmState;mode:'farm'|'dungeon';ready:boolean;error:string;selected:number;inReach:boolean;seed:CropId;hp:number;maxHp:number;time:number;kills:number;level:number;dash:number;loot:Loot;upgrade:boolean;result:Result|null;message:string;paused:boolean;saved:boolean;meal:CropId|null;tier:number};
type Actor={root:T.Group;mixer:T.AnimationMixer;actions:Map<string,T.AnimationAction>;current:string};

export class WildseedGame {
 private enemyAttacks?:EnemyAttacks;
 private lootQuality:QualityBag={};
 private atmosphere?:IslandAtmosphere;private worldTime=0;
 private challenge:Challenge='calm';private hitStop=0;private impactAt=0;private hurtFlash=0;
 private collisions={farm:new CollisionWorld(),dungeon:new CollisionWorld()};
 private gardenArt?:GardenArt;private plotPrompt?:PlotPrompt;
 private playerFeel=new PlayerFeel();private reducedMotion=false;private defeated:{enemy:EnemyUnit;life:number;max:number;velocity:T.Vector3;base:T.Vector3}[]=[];private dustAt=0;
 private pickups!:BattlePickups;private returnPortal:T.Group|null=null;
 private actionFx!:ActionFeedback;private weaponAttackUntil=0;nearby:IslandService|null=null;private campFlame:T.Group|null=null;
 private waves=new WaveDirector();
 farm:FarmState=freshFarm();mode:'farm'|'dungeon'='farm';ready=false;error='';selected=0;inReach=false;seed:CropId='sunroot';held:FarmItem='sunroot';hp=100;maxHp=100;time=0;kills=0;level=1;dash=0;loot:Loot=emptyLoot();upgrade=false;result:Result|null=null;message='';paused=false;saved=true;meal:CropId|null=null;tier=1;
 private scene=new T.Scene();private farmWorld=new T.Group();private arena=new T.Group();private camera:T.PerspectiveCamera;private renderer:T.WebGLRenderer;private cartoon:CartoonRenderer;private listener:(s:View)=>void;
 private actors=new Map<HeroId,Actor>();private residents:{actor:Actor;spec:typeof RESIDENTS[number];phase:number}[]=[];private player=new T.Group();private playerBar=new HealthBar(1.9,.2,"#6be8a1");private keys=new Set<string>();private target:T.Vector3|null=null;private pointer=new T.Vector2();private ray=new T.Raycaster();private plots:T.Mesh[]=[];private plants:T.Group[]=[];private ring:T.Mesh;private portal:T.Mesh;private enemies:EnemyUnit[]=[];private enemyBatch:EnemyBatch;private spawnIndex=0;private terrainChunks:T.Mesh[]=[];private fx:CombatFX;private combatAudio=new CombatAudio();private effects:{mesh:T.Mesh;life:number}[]=[];private frame=0;private last=0;private elapsed=0;private emitAt=0;private saveAt=0;private messageUntil=0;private stopped=false;private started=false;private spawnTimer=0;private invuln=0;private motor=new MovementMotor();private sunlight:T.DirectionalLight;private damage=18;private speed=6;private bossSpawned=false;private bossDead=false;private muted=true;private audio:AudioContext|null=null;private abortTools:()=>void;private resizeObserver:ResizeObserver;
 build:Build=freshBuild();choices:Choice[]=[];xp=0;private baseMaxHp=100;private spells:SpellEngine;
 private followCamera:FollowCamera;private cameraObstacles:T.Object3D[]=[];
 private materialCache=new Map<string,T.MeshToonMaterial>();private sharedSphere=new T.SphereGeometry(1,16,10);private toonCache=new Map<T.Material,T.MeshToonMaterial>();
 constructor(private container:HTMLElement,onChange:(s:View)=>void,private onInteract?:(service:IslandService)=>void){
 this.listener=onChange;this.reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;try{const preference=localStorage.getItem('wildseed-motion');if(preference!==null)this.reducedMotion=preference==='reduced';}catch{}
 try{const raw=localStorage.getItem('wildseed-v1');if(raw)this.farm=hydrateFarm(JSON.parse(raw));}catch{this.saved=false;}
 this.build=freshBuild(this.farm.hero);this.scene.background=new T.Color('#8fd9f5');this.scene.fog=new T.Fog('#8fd9f5',85,210);
 this.camera=new T.PerspectiveCamera(62,container.clientWidth/container.clientHeight,.1,250);
 this.camera.position.set(18,24,29);this.camera.lookAt(0,0,0);
 this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setSize(container.clientWidth,container.clientHeight);
 this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.toneMapping=T.NeutralToneMapping;this.renderer.toneMappingExposure=1;this.cartoon=new CartoonRenderer(this.renderer);this.cartoon.resize(container.clientWidth,container.clientHeight);container.appendChild(this.renderer.domElement);
 this.scene.add(new T.HemisphereLight('#fff6dc','#514277',.85));
 const sun=this.sunlight=new T.DirectionalLight('#fff0cc',2.8);sun.position.set(-12,25,14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.045;sun.shadow.bias=-.0003;this.scene.add(sun,sun.target);
 addCartoonSky(this.scene);this.scene.add(this.farmWorld,this.arena,this.player,this.playerBar);this.arena.visible=false;this.player.position.set(1,0,7);
 this.enemyBatch=new EnemyBatch(this.arena);this.fx=new CombatFX(this.scene,window.matchMedia('(prefers-reduced-motion: reduce)').matches);this.enemyAttacks=new EnemyAttacks(this.scene,(x,z)=>terrainHeight('dungeon',x,z),this.fx,()=>this.combatAudio.play('meteor'));this.actionFx=new ActionFeedback(container);this.plotPrompt=new PlotPrompt(container,()=>this.tendPlot());this.makeFarm();this.makeArena();this.expandWorld(this.farmWorld,'farm');this.expandWorld(this.arena,'dungeon');this.atmosphere=new IslandAtmosphere(this.farmWorld,this.arena);this.collisions.farm.capture(this.farmWorld,(x,z)=>terrainHeight('farm',x,z));this.collisions.dungeon.capture(this.arena,(x,z)=>terrainHeight('dungeon',x,z));batchTrees(this.farmWorld);batchTrees(this.arena);this.pickups=new BattlePickups(this.arena,(x,z)=>terrainHeight('dungeon',x,z),WORLD_RADIUS.dungeon);this.spells=new SpellEngine(this.scene,{fx:this.fx,audio:this.combatAudio,height:(x,z)=>terrainHeight('dungeon',x,z),cast:(id,point)=>this.weaponCast(id,point),collision:(from,to)=>this.collisions.dungeon.firstHit(from,to)});
 this.followCamera=new FollowCamera(this.camera,this.renderer.domElement,()=>this.started&&!this.paused&&!this.upgrade&&!this.result&&!document.hidden,this.click);
 this.scene.updateMatrixWorld(true);
 for(const world of [this.farmWorld,this.arena])world.traverse(o=>{if(o instanceof T.Mesh&&!o.userData.cameraIgnore){const box=new T.Box3().setFromObject(o);if(box.max.y>1&&box.max.y-box.min.y>.8)this.cameraObstacles.push(o);}});
 this.followCamera.pitch=.72;this.followCamera.yaw=.28;this.followCamera.snap(new T.Vector3(0,0,1));
 this.ring=new T.Mesh(new T.RingGeometry(.8,1,48),new T.MeshBasicMaterial({color:'#ffedac',side:T.DoubleSide,transparent:true,opacity:.85}));this.ring.rotation.x=-Math.PI/2;this.ring.position.y=.22;this.farmWorld.add(this.ring);
 this.portal=this.farmWorld.getObjectByName('portal') as T.Mesh;
 this.refreshPlants();
 this.resizeObserver=new ResizeObserver(()=>{if(this.stopped)return;this.camera.aspect=container.clientWidth/container.clientHeight;this.camera.updateProjectionMatrix();this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setSize(container.clientWidth,container.clientHeight);this.cartoon.resize(container.clientWidth,container.clientHeight);});this.resizeObserver.observe(container);
 window.addEventListener('keydown',this.keyDown);window.addEventListener('keyup',this.keyUp);window.addEventListener('blur',this.blur);document.addEventListener('visibilitychange',this.visibility);this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
 this.abortTools=registerGameTools(()=>this.farm,(i,seed)=>{if(this.mode!=='farm'||!this.started)throw Error('Enter the garden before tending plots');this.syncNearbyPlot();if(i!==this.selected||!this.inReach)throw Error('Move next to this bed first');if(isSeed(this.held)&&seed!==this.held)throw Error('Equip these seeds in the hotbar first');return this.tendPlot();});
 this.loadActors();this.emit();this.frame=requestAnimationFrame(this.tick);
 }
 private mat(color:string,surface:Surface='stone'){const key=color+surface;let m=this.materialCache.get(key);if(!m){m=toonMaterial(color);this.materialCache.set(key,m);}return m;}
 private shape(parent:T.Object3D,geo:T.BufferGeometry,color:string,x:number,y:number,z:number,sx=1,sy=1,sz=1){const m=new T.Mesh(geo,this.mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;m.userData.solid=geo!==this.sharedSphere;parent.add(m);return m;}
 private box(p:T.Object3D,c:string,x:number,y:number,z:number,w:number,h:number,d:number){return this.shape(p,new RoundedBoxGeometry(w,h,d,1,Math.min(w,h,d)*.035),c,x,y,z);}
 private blob(p:T.Object3D,c:string,x:number,y:number,z:number,sx:number,sy=sx,sz=sx){return this.shape(p,this.sharedSphere,c,x,y,z,sx,sy,sz);}
 private tree(p:T.Object3D,x:number,z:number,s:number){
  if(p===this.farmWorld&&Math.abs(x)<7&&z>-3&&z<16)return;
  if(p===this.farmWorld&&[...Object.values(HERO_SPOTS),...RESIDENTS].some(spot=>Math.hypot(x-spot.x,z-spot.z)<3))return;
  if(p===this.farmWorld){if(gardenStreamNear(x,z,3)||Math.abs(x)<6&&z< -14)return;p.add(createGardenTree(x,z,s,Math.sin(x*3+z)>.8));return;}
  const tree=createGardenTree(x,z,s,Math.sin(x*3+z)>.82);tree.position.y=terrainHeight('dungeon',x,z);p.add(tree);
 }

 private makeFarm(){
 const p=this.farmWorld;makeFarmLandscape(p);
 // Clear paths keep the work area easy to read.
 for(let i=0;i<PLOT_COUNT;i++){const pos=plotPosition(i);const b=this.box(p,'#776049',pos.x,.10,pos.z,1.94,.21,1.94);b.userData.plot=i;this.plots.push(b);const plant=new T.Group();plant.position.copy(pos);this.plants.push(plant);p.add(plant);
 for(const dx of [-1,1])this.box(p,'#bca479',pos.x+dx*.97,.22,pos.z,.1,.16,2.04);for(const dz of [-1,1])this.box(p,'#bca479',pos.x,.22,pos.z+dz*.97,2.04,.16,.1);}
 // Cottage and open-air cooking nook.
 p.add(createGardenCottage());

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

 const forge=new T.Group();forge.name='key-forge';forge.position.set(FARM_FORGE.x,terrainHeight('farm',FARM_FORGE.x,FARM_FORGE.z),FARM_FORGE.z);p.add(forge);
 const base=this.box(forge,'#645447',0,.42,0,1.5,.84,1.15);base.userData.solid=true;
 this.box(forge,'#344654',0,1.02,0,.65,.45,.6);
 this.box(forge,'#7d939e',0,1.31,0,1.7,.22,.85);
 const horn=this.shape(forge,new T.ConeGeometry(.3,.65,8),'#7d939e',1.08,1.31,0);horn.rotation.z=-Math.PI/2;
 const handle=this.box(forge,'#9b6039',-.25,1.5,.1,.13,.13,.9);handle.rotation.y=.45;
 this.box(forge,'#41586b',-.43,1.59,-.23,.48,.3,.3);
 const furnace=this.box(forge,'#705e53',-1.55,.5,-.35,.85,1,.85);furnace.userData.solid=true;
 this.box(forge,'#ff9b39',-1.55,.85,.085,.55,.37,.03);
 this.shape(forge,new T.TorusGeometry(.24,.07,8,16),'#ffd577',0,2.38,-.5);
 this.box(forge,'#ffd577',0,2.05,-.5,.11,.44,.11);this.box(forge,'#ffd577',.12,1.9,-.5,.3,.1,.11);
 this.box(forge,'#6a4935',.65,1.3,-.62,.12,2.6,.12);this.box(forge,'#6a4935',.25,2.64,-.62,.9,.12,.12);
 this.addFarmDetails(p);
 // One service lane above the fields, with a branch to the campfire.
 for(const [ax,az,bx,bz] of [[-7,-3.5,7.5,-3.5],[-7,-3.5,-7,1.6],[0,-3.5,0,-4.5],[7.5,-3.5,7.5,-4.4]]){
  const steps=Math.ceil(Math.hypot(bx-ax,bz-az)/.8);
  for(let i=0;i<=steps;i++){const t=i/steps,x=ax+(bx-ax)*t,z=az+(bz-az)*t;this.shape(p,new T.CylinderGeometry(.5,.52,.06,7),'#d5bf88',x,terrainHeight('farm',x,z)+.06,z);}
 }
 for(const service of ISLAND_SERVICES){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=80;const ctx=canvas.getContext('2d');if(!ctx)continue;
  ctx.fillStyle='#183440';ctx.beginPath();ctx.roundRect(4,4,248,72,18);ctx.fill();ctx.strokeStyle='#e6c17a';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#fff0ce';ctx.font='bold 32px Trebuchet MS';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(service.kind==='forge'?'FORGE':service.kind==='kitchen'?'COOK':'PORTAL',128,42);
  const material=new T.SpriteMaterial({map:crispTexture(new T.CanvasTexture(canvas)),depthTest:false,depthWrite:false});const sign=new T.Sprite(material);sign.name='station-'+service.kind;sign.userData.cameraIgnore=true;sign.position.set(service.x,3.8,service.kind==='travel'?-6:service.kind==='kitchen'?.5:service.z);sign.scale.set(2.5,.78,1);sign.renderOrder=10;p.add(sign);
 }
 // Pond, lily pads and stepping stones.
 const pond=this.shape(p,new T.CircleGeometry(1,48),'#12b8d8',8,.065,5,2.6,2.9,1);pond.rotation.x=-Math.PI/2;for(let i=0;i<9;i++)this.box(p,'#c5ffeb',6.4+i%3*1.3,.089,3.7+Math.floor(i/3)*1.1,.6,.012,.1);
 for(let i=0;i<14;i++){const a=i/14*Math.PI*2;this.blob(p,'#bec5a0',8+Math.cos(a)*2.8,.1,5+Math.sin(a)*3.15,.4,.25,.38);}
 for(let i=0;i<4;i++)this.box(p,'#6c9b5d',7.2+i*.55,.13,4.5+Math.sin(i)*1.1,.55,.04,.55);
 // The ancient gate is part of the world, rather than a separate menu page.
 this.box(p,'#8c9b87',6,1.5,-6,.8,3,1);this.box(p,'#8c9b87',9,1.5,-6,.8,3,1);this.box(p,'#a4b09a',7.5,3.2,-6,4,.8,1.1);
 const portal=new T.Mesh(new T.CircleGeometry(1.32,48),new T.MeshBasicMaterial({color:'#b8b1ff',transparent:true,opacity:.62,side:T.DoubleSide}));portal.name='portal';portal.position.set(7.5,1.6,-5.8);p.add(portal);const portalRim=new T.Mesh(new T.TorusGeometry(1.4,.095,8,40),this.mat('#84f2d0'));portalRim.position.copy(portal.position);p.add(portalRim);
 for(const dx of [-1.4,1.4])this.box(p,'#d9cdff',7.5+dx,1.6,-5.7,.1,2.9,.1);for(const dy of [.2,3])this.box(p,'#d9cdff',7.5,dy,-5.7,2.9,.1,.1);
 for(let i=0;i<4;i++){const a=i/4*Math.PI*2,x=Math.cos(a)*15,z=Math.sin(a)*15;if(z>0&&Math.abs(x)<7)continue;this.tree(p,x,z,.65+(i%4)*.13);}
 const geo=new T.ConeGeometry(.09,.4,5),grass=new T.InstancedMesh(geo,this.mat('#699d4f'),450);const matrix=new T.Matrix4();let count=0;for(let i=0;i<850&&count<450;i++){const x=Math.sin(i*127.1)*13,z=Math.sin(i*311.7)*13;if(x*x+z*z>170||Math.abs(x)<6&&z>-3&&z<14||x<-4&&z<2||x>5&&z>-8&&z<9)continue;matrix.compose(new T.Vector3(x,.18,z),new T.Quaternion(),new T.Vector3(1,1+(i%3)*.2,1));grass.setMatrixAt(count++,matrix);}grass.count=count;p.add(grass);
 for(let i=0;i<24;i++){const x=Math.sin(i*51.9)*12,z=Math.cos(i*37.7)*12;if(x*x+z*z>165||Math.abs(x)<6&&z>-3&&z<14)continue;this.blob(p,i%3===0?'#fff0a9':i%3===1?'#e8adbb':'#c2b4e7',x,.22,z,.13,.17,.13);}
 this.gardenArt=new GardenArt(p);
 }
 private addFarmDetails(p:T.Group){
 // Broad tilled fields, a cross path, and fenced lanes make room for 24 working beds.
 const field=this.box(p,'#927048',0,.025,5.2,9.25,.08,15.8);field.name='cultivated-field';field.userData.cameraIgnore=true;
 this.box(p,'#dfbf7e',0,.075,5.65,10.8,.06,1.2);
 for(let i=0;i<PLOT_COUNT;i++){const at=plotPosition(i);for(const dx of [-.6,0,.6])this.box(p,'#644530',at.x+dx,.222,at.z,.07,.015,1.6);}
 for(const x of [-5.6,5.6])for(let z=-2.4;z<=13.6;z+=2){
  if(z>3.5&&z<7)continue;
  this.box(p,'#a77848',x,.65,z,.17,1.3,.17);
  if(z<13){this.box(p,'#e0ba7c',x,.9,z+.85,.12,.15,1.7);this.box(p,'#bd9059',x,.43,z+.85,.12,.13,1.7);}
 }
 for(const x of [-4.6,-2.6,2.6,4.6]){this.box(p,'#a77848',x,.65,13.7,.17,1.3,.17);this.box(p,'#e0ba7c',x,.82,13.7,1.7,.16,.12);}
 // A farm shed, with hay, water barrels and a compost corner.
 const barn=new T.Group();barn.name='farm-shed';barn.position.set(-11.7,0,8.7);p.add(barn);
 this.box(barn,'#bd5b43',0,1.4,0,4.2,2.8,3.3);this.box(barn,'#eee0af',0,.2,0,4.4,.25,3.5);
 const roof=this.shape(barn,new T.ConeGeometry(3.5,1.7,4),'#465f78',0,3.45,0);roof.rotation.y=Math.PI/4;
 for(const x of [-1.85,1.85])this.box(barn,'#f2d7a1',x,1.5,1.7,.14,2.7,.12);
 this.box(barn,'#684737',0,1.05,1.72,1.65,2.05,.12);
 for(const a of [-.65,.65]){const brace=this.box(barn,'#e5c490',0,1.05,1.82,.12,2.4,.08);brace.rotation.z=a;}
 this.box(barn,'#f1d29a',0,2.8,1.75,4.2,.16,.12);
 for(const [x,z] of [[-9.3,11.8],[-10.6,12],[-10,11.1]]){
  this.box(p,'#ebbb51',x,.45,z,1.15,.85,.85);
  for(const dx of [-.33,.33])this.box(p,'#906136',x+dx,.48,z,.075,.9,.89);
 }
 for(const z of [4.3,5.5]){
  this.shape(p,new T.CylinderGeometry(.48,.43,.9,10),'#855b40',-13,.45,z);
  for(const y of [.17,.7])this.shape(p,new T.TorusGeometry(.46,.04,5,10),'#536775',-13,y,z).rotation.x=Math.PI/2;
  this.shape(p,new T.CircleGeometry(.39,12),'#53cce1',-13,.91,z).rotation.x=-Math.PI/2;
 }
 for(const x of [-8,-6.9]){this.box(p,'#815835',x,.35,10.1,.95,.65,1);this.box(p,'#4d3a2d',x,.7,10.1,.8,.07,.85);}
 const scarecrow=new T.Group();scarecrow.name='scarecrow';scarecrow.position.set(4.8,0,8.8);p.add(scarecrow);
 this.box(scarecrow,'#795135',0,1,0,.15,2,.15);this.box(scarecrow,'#e7ad56',0,1.75,0,1.3,.15,.15);
 this.box(scarecrow,'#3e9e91',0,1.5,0,.55,.65,.32);this.blob(scarecrow,'#e9c586',0,2.12,0,.29);
 this.shape(scarecrow,new T.ConeGeometry(.44,.33,8),'#c8974d',0,2.48,0);
 this.shape(scarecrow,new T.CylinderGeometry(.57,.57,.08,10),'#efc96b',0,2.32,0);
 for(const x of [-.1,.1])this.blob(scarecrow,'#283941',x,2.17,.26,.035);
 }

 private makeArena(){this.terrainChunks=makeLandscape(this.arena);}
 private expandWorld(p:T.Group,mode:'farm'|'dungeon'){
 if(mode==='dungeon')return;
 const count=6;
 for(let i=0;i<count;i++){
  const a=i*2.39996,r=18+(i%9)/9*10;
  const x=Math.cos(a)*r,z=Math.sin(a)*r;
  this.tree(p,x,z,.8+(i%4)*.18);
 }
 }

 private actor(g:GLTF,height:number):Actor{const actor=createAxieActor(g,height);toonify(actor.root);return actor;}
 private lastFarmAction?:{kind:'plant'|'water'|'harvest';plot:number;serial:number};
 private loadingDone=0;private loadingTotal=0;
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
  this.loadingTotal=jobs.length;this.loadingDone=0;this.emit();
  let cursor=0;await Promise.all(Array.from({length:3},async()=>{while(!this.stopped&&cursor<jobs.length){await jobs[cursor++]();if(this.stopped)return;this.loadingDone++;this.emit();}}));
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
 this.syncFarmEquipment();
 }
 interact(){
 if(this.mode==='dungeon'){this.returnHome();return;}
 if(this.mode!=='farm'||!this.started||this.paused||this.upgrade||this.result)return;
 this.syncNearbyPlot();
 if(this.nearby){this.setPaused(true);this.onInteract?.(this.nearby);return;}
 this.tendPlot();
 }
 private animate(a:Actor,name:string){if(a.current===name)return;const next=a.actions.get(name)||a.actions.get('Idle');if(!next)return;a.actions.get(a.current)?.fadeOut(.18);next.reset().fadeIn(.18).play();a.current=name;}
 private refreshPlants(){for(let i=0;i<this.farm.plots.length;i++){const group=this.plants[i],p=this.farm.plots[i],signature=[p.crop,Math.floor(p.growth*3),p.watered,p.rich].join(':');if(group.userData.plantSignature===signature)continue;group.userData.plantSignature=signature;while(group.children.length){const child=group.children[0];group.remove(child);child.traverse(o=>{if(o instanceof T.Sprite){o.material.map?.dispose();o.material.dispose();}if(o instanceof T.Mesh&&o.geometry!==this.sharedSphere)o.geometry.dispose();});}this.plots[i].material=this.mat(p.watered?'#544b3e':p.rich?'#594337':'#80604b','soil');if(!p.crop)continue;
 group.add(createGardenCrop(p.crop,Math.floor(p.growth*3)));
 }
 }
 private save(){try{localStorage.setItem('wildseed-v1',JSON.stringify(this.farm));this.saved=true;}catch{this.saved=false;}}
 private emit(){const boss=this.mode==='dungeon'?this.enemies.find(e=>e.boss&&e.hp>0):undefined;const exitOffset=this.returnPortal?.position.clone().sub(this.player.position),exitDistance=exitOffset?Math.hypot(exitOffset.x,exitOffset.z):0;const exitLocal=exitOffset?.applyQuaternion(this.camera.quaternion.clone().invert());this.listener({farmAction:this.lastFarmAction,loadingDone:this.loadingDone,loadingTotal:this.loadingTotal,enemiesLeft:this.enemies.length+(this.waves?.pending??0),exitBearing:exitLocal?Math.atan2(exitLocal.x,-exitLocal.z):0,exitDistance,wave:this.waves?.number??1,waveBreak:this.waves?.breakLeft??0,lootQuality:{...this.lootQuality},boss:boss?{name:ENEMY_INFO[boss.kind].name,hp:boss.hp,max:boss.max,enraged:boss.enraged,color:ENEMY_INFO[boss.kind].color}:null,position:{x:this.player.position.x,z:this.player.position.z},challenge:this.challenge,reducedMotion:this.reducedMotion,held:this.held,exitReady:!!this.returnPortal,nearExit:this.mode==='dungeon'&&this.nearReturnPortal,nearby:this.mode==='farm'?this.nearby:null,build:structuredClone(this.build),choices:structuredClone(this.choices),xp:this.xp,xpNext:xpNeeded(this.level),farm:structuredClone(this.farm),mode:this.mode,ready:this.ready,error:this.error,selected:this.selected,inReach:this.inReach,seed:this.seed,hp:this.hp,maxHp:this.maxHp,time:this.time,kills:this.kills,level:this.level,dash:this.dash,loot:{...this.loot},upgrade:this.upgrade,result:this.result?structuredClone(this.result):null,message:this.message,paused:this.paused,saved:this.saved,meal:this.meal,tier:this.tier});}
 private toast(s:string){this.message=s;this.messageUntil=this.elapsed+2.5;this.emit();return s;}
 private changed(s:string){this.save();this.refreshPlants();return this.toast(s);}
 permanentUpgrade(id:Upgrade){if(this.mode!=='farm')return;if(buyUpgrade(this.farm,id)){this.sound(780);this.changed('Upgraded');}}
 mixCompost(kind:'growth'|'yield'){if(this.mode!=='farm')return;if(craftCompost(this.farm,kind)){this.sound(660);this.changed(kind==='yield'?'+4 boosted harvests':'Growth boosted');}}
 setReducedMotion(value:boolean){this.reducedMotion=value;this.fx.setReducedMotion(value);try{localStorage.setItem('wildseed-motion',value?'reduced':'full');}catch{}this.emit();}
 setVolume(value:number){this.combatAudio.setVolume(value);try{localStorage.setItem('wildseed-volume',String(value));}catch{}}
 start(){if(!this.ready)return;this.started=true;this.followCamera.pitch=.67;this.toast('');}
 setPaused(value:boolean){this.paused=value;if(value)this.plotPrompt?.hide();this.keys.clear();this.emit();}
 setMuted(value:boolean){this.muted=value;this.combatAudio.muted=value;if(!value)this.combatAudio.enable();try{this.combatAudio.setVolume(Number(localStorage.getItem('wildseed-volume')??.7));}catch{}if(!value){this.audio??=new AudioContext();void this.audio.resume();this.sound(440);}}
 private sound(freq:number){if(this.muted||!this.audio)return;const osc=this.audio.createOscillator(),gain=this.audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,this.audio.currentTime);osc.frequency.exponentialRampToValueAtTime(freq*.7,this.audio.currentTime+.15);gain.gain.setValueAtTime(.035,this.audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+.2);osc.connect(gain);gain.connect(this.audio.destination);osc.start();osc.stop(this.audio.currentTime+.21);}
 selectHero(id:HeroId){if(this.mode!=='farm'||!this.actors.has(id))return;this.playerFeel?.reset(this.actors.get(this.farm.hero)?.root);this.farm.hero=id;this.build=freshBuild(id);this.weaponAttackUntil=0;this.syncHeroes();this.nearby=null;this.save();this.emit();}
 selectSeed(id:CropId){this.selectFarmItem(id);}
 selectFarmItem(item:FarmItem){if(this.mode!=='farm'||!FARM_SLOTS.includes(item))return;this.held=item;if(isSeed(item))this.seed=item;this.syncFarmEquipment();this.emit();}
 private syncFarmEquipment(){for(const [id,a] of this.actors??[])setFarmEquipment(a,this.mode==='farm'&&id===this.farm.hero?this.held:null);}
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
 const use=farmAction(this.farm,this.selected,this.held);if(!use.ready)return this.toast(use.label);
 if(this.held==='soil'||this.held==='fertilizer'){this.improvePlot(this.held);return '';}
 const before={...this.farm.plots[this.selected]},harvests=this.farm.harvests;
 const msg=tend(this.farm,this.selected,this.seed),after=this.farm.plots[this.selected];
 const kind=!before.crop&&after.crop?'plant':before.crop&&!after.crop?'harvest':!before.watered&&after.watered?'water':null;
 if(!kind)return this.toast(!before.crop?'No seeds':before.watered?'Growing':'Unavailable');
 this.lastFarmAction={kind,plot:this.selected,serial:(this.lastFarmAction?.serial??0)+1};
 const amount=kind==='harvest'?this.farm.harvests-harvests:undefined;
 const point=plotPosition(this.selected);this.farmGesture(point);this.sound(kind==='water'?520:kind==='harvest'?780:400);this.pulse(point,kind==='water'?'#6bd5ff':CROPS[before.crop??this.seed].color);
 this.actionDone(kind,point.clone().add(new T.Vector3(0,1,0)),amount,undefined,kind==='harvest'?'Harvested '+amount+' '+CROPS[before.crop!].name:kind==='water'?'Watered':CROPS[this.seed].name+' planted');
 return msg;
 }
 private farmGesture(point:T.Vector3){const actor=this.actors?.get(this.farm.hero);if(actor){actor.root.rotation.y=Math.atan2(point.x-this.player.position.x,point.z-this.player.position.z);useFarmEquipment(actor);}}
 private actionDone(kind:ActionKind,point:T.Vector3,amount?:number,anchor?:string,label?:string,crop?:CropId){this.actionFx?.spawn(kind,point,{amount,anchor,label,crop});this.changed('');}
 improvePlot(kind:'soil'|'fertilizer'){
 if(this.held!==kind)return;
 if(this.mode!=='farm'||!this.started||this.paused||this.result)return;
 this.syncNearbyPlot();if(!this.inReach){this.toast('Move closer');return;}
 const before=this.farm[kind],msg=improve(this.farm,this.selected,kind);
 if(this.farm[kind]===before){this.toast(msg);return;}
 this.farmGesture(plotPosition(this.selected));this.sound(600);this.actionDone(kind,plotPosition(this.selected).add(new T.Vector3(0,1,0)),undefined,undefined,kind==='soil'?'Soil improved':'Fertilized');
 }
 cookMeal(id:CropId,hits=0){
 if(this.mode!=='farm')return 0;const before=this.farm.meals[id],msg=cook(this.farm,id,hits);
 if(this.farm.meals[id]===before){this.toast(msg);return 0;}
 this.sound(660);this.actionDone('meal',new T.Vector3(-7,2,.5),this.farm.meals[id]-before,'cook-'+id,hits===3?'Perfect!':'Meal cooked',id);return this.farm.meals[id]-before;
 }
 equipMeal(id:CropId){if(this.mode!=='farm')return;if(this.farm.meals[id]<1){this.toast('Cook a meal first');return;}this.farm.meal=this.farm.meal===id?null:id;this.save();this.emit();}
 craftDungeonKey(tier:1|2,score=0){
 if(this.mode!=='farm')return 0;const key=tier===1?'grove':'hollow',before=this.farm.keys[key],msg=craftKey(this.farm,tier,score);if(this.farm.keys[key]===before){this.toast(msg);return 0;}this.sound(920);this.actionDone('unlock',new T.Vector3(FARM_FORGE.x,2,FARM_FORGE.z),1,'forge',msg);return 1;
 }
 unlock(){
 if(this.mode!=='farm')return;const before=this.farm.unlocked,msg=offerHarvest(this.farm);
 if(before===this.farm.unlocked){this.toast(msg);return;}
 this.sound(920);this.actionDone('unlock',new T.Vector3(7.5,2,-5.8),undefined,'portal','Bramble Hollow unlocked');
 }
 expedition(tier:number,challenge:Challenge='calm',meals:CropId[]=[],keyStars?:Stars){if(!Object.hasOwn(CHALLENGES,challenge))return;if(!this.ready||!this.started||this.mode!=='farm')return;let stats;try{stats=beginExpedition(this.farm,tier,meals,keyStars);}catch(e){this.toast((e as Error).message);return;}this.actionFx.clear();this.pickups.clear();this.clearReturnPortal();this.clearDefeated();this.playerFeel?.reset(this.actors.get(this.farm.hero)?.root);this.mode='dungeon';this.challenge=challenge;this.hitStop=0;discover(this.farm,'dungeon:'+tier);this.syncFarmEquipment();this.tier=tier;this.waves.reset();this.time=0;this.kills=0;this.level=1;this.xp=0;this.build=freshBuild(this.farm.hero);this.build.food=stats.buffs;this.build.meals=stats.meals;this.build.mealStars=stats.mealStars;this.build.keyStars=stats.keyStars;this.lootQuality={};if((progress(this.farm).wins[this.farm.hero]??0)>=3){this.build.heroMastery=this.farm.hero;if(this.farm.hero==='pomodoro')this.build.mastery='thorn';}discover(this.farm,'weapon:'+STARTER_SPELL[this.farm.hero]);this.weaponAttackUntil=0;this.spells.clear();this.fx.clear();this.clearHostiles();this.spawnIndex=0;this.choices=[];this.upgrade=false;this.loot=emptyLoot();this.hp=this.maxHp=this.baseMaxHp=stats.hp;this.damage=stats.damage;this.speed=stats.speed*1.5;this.meal=stats.meal;this.bossDead=false;this.bossSpawned=false;this.spawnTimer=0;this.invuln=1;this.dash=0;this.motor.reset();this.target=null;this.paused=false;this.player.position.set(0,terrainHeight('dungeon',0,0),0);this.followCamera.pitch=.48;this.followCamera.snap(this.player.position);this.farmWorld.visible=false;this.arena.visible=true;this.scene.background=new T.Color(tier===1?'#8fd9f5':'#b6b3ed');this.scene.fog=new T.Fog(tier===1?'#8fd9f5':'#b6b3ed',45,85);this.openReturnPortal();this.save();this.toast('');return true;}
 escape(){this.returnHome();}
 private finish(outcome:'won'|'escaped'|'lost'){if(this.mode!=='dungeon')return;if(outcome==='won'){const p=progress(this.farm);p.wins[this.farm.hero]=(p.wins[this.farm.hero]??0)+1;if(!p.challenges.includes(this.challenge))p.challenges.push(this.challenge);if(this.challenge==='drought')grantQuality(this.farm,'key:'+(this.tier===1?'grove':'hollow'),1,this.build?.keyStars??1);}const loot=settleExpedition(this.farm,this.loot,outcome,this.tier,this.lootQuality);this.pickups.clear();this.clearReturnPortal();this.clearDefeated();this.playerFeel?.reset(this.actors.get(this.farm.hero)?.root);this.result={outcome,loot,kills:this.kills,tier:this.tier};this.mode='farm';this.syncFarmEquipment();this.hp=this.maxHp;this.upgrade=false;this.paused=false;this.farmWorld.visible=true;this.arena.visible=false;this.player.position.set(5,0,-3);this.followCamera.pitch=.67;this.motor.reset();this.dash=0;this.followCamera.snap(this.player.position);this.target=null;this.keys.clear();for(const e of this.enemies)this.removeEnemy(e);this.enemies=[];this.spells.clear();this.fx.clear();this.clearHostiles();this.choices=[];this.scene.background=new T.Color('#8fd9f5');this.scene.fog=new T.Fog('#8fd9f5',85,210);this.refreshPlants();this.save();this.emit();}
 dismissResult(){this.result=null;this.emit();}
 private weaponCast(id:WeaponId,point:T.Vector3){
 if(id!==STARTER_SPELL[this.farm.hero])return;
 const actor=this.actors.get(this.farm.hero);if(!actor)return;
 const direction=point.clone().sub(this.player.position);direction.y=0;if(direction.lengthSq())this.playerFeel?.fire(direction.normalize(),id==='hammer'||id==='cannon');
 const name=EQUIPMENT[this.farm.hero].prefix+'.Attack',attack=actor.actions.get(name);if(!attack)return;
 actor.actions.get(actor.current)?.fadeOut(.08);
 attack.reset().setLoop(T.LoopOnce,1).setEffectiveTimeScale(attack.getClip().duration/.5);attack.clampWhenFinished=true;attack.fadeIn(.08).play();
 actor.current=name;this.weaponAttackUntil=this.elapsed+.5;
 actor.root.rotation.y=Math.atan2(point.x-this.player.position.x,point.z-this.player.position.z);
 }
 private queueUpgrade(){if(this.mode!=='dungeon'||this.upgrade||this.xp<xpNeeded(this.level))return;this.xp-=xpNeeded(this.level);this.level++;this.combatAudio?.play('levelup');this.choices=draftChoices(this.build);if(this.challenge==='drought'&&this.choices.every(c=>c.id==='heal'))this.choices=[{id:'heal',kind:'heal',name:'Endurance',text:'+5 maximum health',level:1,color:'#a8dbaf'}];this.upgrade=true;this.keys.clear();this.emit();}
 chooseUpgrade(id:Choice['id']){if(!this.upgrade||this.mode!=='dungeon')return;const choice=this.choices.find(c=>c.id===id);if(!choice||!applyChoice(this.build,choice))return;if(choice.id==='heal'&&this.challenge==='drought')this.baseMaxHp+=5;if(choice.id!=='heal')discover(this.farm,(choice.kind==='evolution'?'evolution:':'weapon:')+choice.id);const oldMax=this.maxHp;this.maxHp=this.baseMaxHp+modifiers(this.build).health;this.hp=this.challenge==='drought'?Math.min(this.hp,this.maxHp):Math.min(this.maxHp,this.hp+this.maxHp-oldMax+(id==='heal'?35:0));this.upgrade=false;this.choices=[];this.keys.clear();this.combatAudio?.play(choice.kind==='evolution'?'evolve':'pickup');this.fx?.burst(this.player.position,choice.color,18,4);this.fx?.ring(this.player.position,2,choice.color,.4);if(choice.kind==='evolution')this.toast(choice.name+' awakened!');this.queueUpgrade();this.emit();}


 jumpNow(){if(!this.started||this.paused||this.upgrade||this.result)return;this.motor.requestJump();}
 dashNow(){if(!this.started||this.paused||this.upgrade||this.result)return;const facing=this.actors.get(this.farm.hero)?.root.rotation.y??Math.PI;const dir=this.motor.velocity.lengthSq()>.1?this.motor.velocity:new T.Vector3(Math.sin(facing),0,Math.cos(facing));if(this.motor.dash(dir)){this.invuln=.24;this.combatAudio.play('dash');this.fx.burst(this.player.position.clone().add(new T.Vector3(0,.5,0)),'#b6ead5',12,3);}}

 private pulse(pos:T.Vector3,color:string){const mesh=new T.Mesh(new T.RingGeometry(.2,.3,32),new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.8}));mesh.rotation.x=-Math.PI/2;mesh.position.copy(pos);mesh.position.y=.3;this.scene.add(mesh);this.effects.push({mesh,life:.6});}
 private spawn(boss=false,angle?:number,forced?:EnemyKind){
 if(!boss&&this.enemies.length>=60)return;
 const clears=Object.values(this.farm?.progress?.wins??{}).reduce<number>((sum,n)=>sum+(n??0),0);
 const kind=forced??(boss?bossKindFor(this.tier,clears+Math.max(0,Math.floor((this.waves?.number??1)/5)-1)):enemyKindFor(this.time,this.spawnIndex++,this.tier)),e=makeEnemy(kind,this.tier,this.spawnIndex*.71);
 const a=angle??Math.random()*Math.PI*2,dist=boss?19:(this.time<10?14:16)+Math.random()*3;
 e.mesh.position.copy(battleSpawn(this.player.position,a,dist,e.radius,this.collisions.dungeon));
 if(this.challenge==='rush')e.speed*=1.25;if(this.challenge==='bounty')e.max*=1.25;
 if(this.challenge==='elite'&&!boss&&this.spawnIndex%4===0){e.max*=2;e.xpValue*=2;e.mesh.userData.elite=true;for(const m of e.rig.materials)m.color.lerp(new T.Color('#ffc84a'),.55);}
 e.mesh.position.y=terrainHeight('dungeon',e.mesh.position.x,e.mesh.position.z);this.collisions.dungeon.resolve(e.mesh.position,e.push,e.radius,e.boss?5:1.5);e.mesh.position.y=terrainHeight('dungeon',e.mesh.position.x,e.mesh.position.z);e.max*=1+Math.max(0,(this.waves?.number??1)-1)*.14;e.speed*=1+Math.min(.25,Math.max(0,(this.waves?.number??1)-1)*.015);e.hp=e.max;
 this.arena.add(e.mesh);this.enemies.push(e);this.fx.ring(e.mesh.position,e.boss?3:1.2,ENEMY_INFO[kind].color,.5);
 }
 private clampEnemy(e:EnemyUnit){const r=Math.hypot(e.mesh.position.x,e.mesh.position.z),limit=WORLD_RADIUS.dungeon-3;if(r>limit){e.mesh.position.x*=limit/r;e.mesh.position.z*=limit/r;}}
 private removeEnemy(e:EnemyUnit){disposeEnemy(e);}
 private hurtEnemy(e:EnemyUnit,damage:number){
 if(e.hp<=0)return;if(!this.reducedMotion&&damage>=25&&this.elapsed-this.impactAt>.24){this.hitStop=.018;this.impactAt=this.elapsed;}e.hp-=damage;e.flash=damage>=12?.11:.055;if(damage>=12)e.stagger=Math.max(e.stagger,e.boss?.018:.055);e.bar.update(e.hp,e.max);
 const away=e.mesh.position.clone().sub(this.player.position);away.y=0;if(away.lengthSq())e.push.addScaledVector(away.normalize(),e.boss?1:damage>=18?7:2);
 this.fx.impact(e.mesh.position.clone().add(new T.Vector3(0,e.aimHeight,0)),damage,ENEMY_INFO[e.kind].color,e.hp<=0,e.boss,away);
 this.combatAudio.play(e.hp<=0?'kill':'hit');
 if(e.hp<=0){discover(this.farm,'enemy:'+e.kind);this.kills++;const point=e.mesh.position.clone();this.pickups.spawn('xp',e.xpValue,point);for(const drop of rollDrops(this.tier,e.boss,Math.random,e.kind,this.build?.keyStars??1,this.build?.food?.loot??0))this.pickups.spawn(drop.kind,drop.amount*(this.challenge==='bounty'&&drop.kind in CROPS?2:1),point,rollQuality(0,farmLuck(this.farm)+(this.build?.food?.luck??0)+modifiers(this.build).luck,this.build?.keyStars??1));if(e.boss&&this.challenge==='elite')this.pickups.spawn('soil',2,point);if(e.boss&&this.challenge==='rush')this.pickups.spawn('fertilizer',4,point);if(e.boss)this.bossDead=true;this.enemyAttacks?.cancel(e);this.leaveDefeated(e,away);this.enemies=this.enemies.filter(x=>x!==e);}
 }
 private leaveDefeated(e:EnemyUnit,direction:T.Vector3){
  e.bar.visible=false;
  this.defeated??=[];
  if(this.defeated.length>=24)this.removeEnemy(this.defeated.shift()!.enemy);
  this.defeated.push({enemy:e,life:e.boss?.55:.32,max:e.boss?.55:.32,velocity:direction.clone().multiplyScalar(e.boss?2:6).add(new T.Vector3(0,e.boss?2.5:4.5,0)),base:e.visual.scale.clone()});
 }
 private updateDefeated(dt:number){
  for(let i=this.defeated.length-1;i>=0;i--){
   const d=this.defeated[i];d.life-=dt;d.enemy.flash=Math.max(0,d.enemy.flash-dt);
   if(d.life<=0){this.removeEnemy(d.enemy);this.defeated.splice(i,1);continue;}
   d.velocity.y-=18*dt;d.enemy.mesh.position.addScaledVector(d.velocity,dt);
   d.enemy.mesh.rotation.z+=dt*(d.enemy.boss?1.3:5);d.enemy.mesh.rotation.x+=dt*2;
   d.enemy.visual.scale.copy(d.base).multiplyScalar(Math.min(1,d.life/d.max*2.3));
  }
 }
 private clearDefeated(){for(const d of this.defeated??[])this.removeEnemy(d.enemy);this.defeated=[];}

 private collectDrop(kind:PickupKind,amount:number,point:T.Vector3,stars:Stars=1){
  if(kind==='xp'){this.xp+=amount;this.fx.burst(point,'#83f6d3',3,2);}
  else{if(kind in CROPS)discover(this.farm,'crop:'+kind);this.loot[kind]+=amount;if(stars>1){this.lootQuality??={};const bin=this.lootQuality[kind]??=[0,0];bin[stars-2]+=amount;}this.fx.burst(point,kind in CROPS?CROPS[kind as CropId].color:'#ffe299',10,3);this.fx.ring(this.player.position,.9,'#ffe299',.25);}
  this.combatAudio.play(kind==='xp'?'xp':'pickup');
 }
 private openReturnPortal(){
  if(this.returnPortal)return;
  const p=this.player.position.clone().add(new T.Vector3(4,0,0)),limit=WORLD_RADIUS.dungeon-6,r=Math.hypot(p.x,p.z);
  if(r>limit){p.x*=limit/r;p.z*=limit/r;}this.collisions.dungeon.resolve(p,new T.Vector3(),2.1,1.5);p.y=Math.max(.1,terrainHeight('dungeon',p.x,p.z));
  const group=new T.Group();group.name='return-portal';group.position.copy(p);
  const rim=new T.Mesh(new T.TorusGeometry(1.35,.12,8,40),new T.MeshBasicMaterial({color:'#b7ffda'}));rim.position.y=1.6;group.add(rim);
  const glow=new T.Mesh(new T.CircleGeometry(1.23,40),new T.MeshBasicMaterial({color:'#4dd0b3',transparent:true,opacity:.6,side:T.DoubleSide}));glow.position.y=1.6;group.add(glow);
  const beacon=new T.Mesh(new T.CylinderGeometry(.12,.38,9,12,1,true),new T.MeshBasicMaterial({color:'#9bffdb',transparent:true,opacity:.28,side:T.DoubleSide,depthWrite:false}));beacon.name='home-beacon';beacon.position.y=4.5;group.add(beacon);
  const base=new T.Mesh(new T.RingGeometry(1.6,1.83,40),new T.MeshBasicMaterial({color:'#d8ffe6',side:T.DoubleSide,transparent:true,opacity:.8}));base.rotation.x=-Math.PI/2;base.position.y=.08;group.add(base);
  this.returnPortal=group;this.arena.add(group);
 }
 private clearReturnPortal(){if(!this.returnPortal)return;this.returnPortal.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose();}});this.returnPortal.removeFromParent();this.returnPortal=null;}
 private get nearReturnPortal(){return !!this.returnPortal&&this.player.position.distanceTo(this.returnPortal.position)<3;}
 returnHome(){if(this.started&&!this.result&&this.mode==='dungeon'&&this.returnPortal&&this.nearReturnPortal&&!this.paused&&!this.upgrade)this.finish(this.bossDead?'won':'escaped');}

 private damagePlayer(amount:number,origin:T.Vector3){
 if(this.invuln>0||this.mode!=='dungeon')return;
 this.hp=Math.max(0,this.hp-amount*(1-(this.build.food?.armor??0))*(1-modifiers(this.build).armor));this.hurtFlash=this.reducedMotion?0:.18;this.invuln=.65;this.fx.hurt(this.player.position.clone().add(new T.Vector3(0,1,0)));this.combatAudio.play('hurt');
 const away=this.player.position.clone().sub(origin);away.y=0;if(away.lengthSq())this.motor.velocity.addScaledVector(away.normalize(),4);
 }
 private clearHostiles(){this.enemyAttacks?.clear();}
 private combat(dt:number){
 this.time+=dt;this.invuln=Math.max(0,this.invuln-dt);this.spawnTimer-=dt;if(this.challenge!=='drought')this.hp=Math.min(this.maxHp,this.hp+dt*(modifiers(this.build).regen+this.spells.healingAt(this.player.position)));
 this.waves.tick(dt,this.enemies.length,boss=>this.spawn(boss));
 const player=this.player.position;
 for(const e of this.enemies){
  const distance=Math.hypot(player.x-e.mesh.position.x,player.z-e.mesh.position.z);
  if(!e.boss&&distance>38){const a=Math.random()*Math.PI*2;e.mesh.position.copy(battleSpawn(player,a,18,e.radius,this.collisions.dungeon));e.mesh.position.y=terrainHeight('dungeon',e.mesh.position.x,e.mesh.position.z);e.state='seek';e.cooldown=1;e.spawnAge=0;}
  updateEnemy(e,dt,player,this.time,(x,z)=>terrainHeight('dungeon',x,z),this.spells.speedMultiplier(e),{
   telegraph:(point,radius,duration)=>this.enemyAttacks?.warning(point,radius,duration,e),
   lane:(point,heading,length,width,duration)=>this.enemyAttacks?.lane(point,heading,length,width,duration,e),
   projectile:(from,to,style)=>this.enemyAttacks?.shot(from,to,style,e),
   slam:(point,radius)=>this.enemyAttacks?.wave(point,radius,e),
   zone:(point,radius,delay,damage,color)=>this.enemyAttacks?.zone(point,radius,delay,damage,color,e),
   summon:(kind,count)=>{const live=this.enemies.filter(x=>x.kind===kind).length;for(let i=0;i<Math.min(count,6-live);i++)this.spawn(false,e.phase+i*1.6,kind);},
   damage:(amount,point)=>this.damagePlayer(amount,point)
  },this.collisions.dungeon);
  this.clampEnemy(e);e.bar.face(this.camera);
 }
 this.enemyAttacks?.update(dt,player,(amount,point)=>this.damagePlayer(amount,point),this.collisions.dungeon);
 if(this.hp<=0){this.finish('lost');return;}
 this.spells.update(dt,player,this.build,this.damage,this.enemies,(target:SpellTarget,damage:number)=>this.hurtEnemy(target as EnemyUnit,damage));
 this.pickups.update(dt,player,(kind,amount,point,stars)=>this.collectDrop(kind,amount,point,stars),(this.build.food?.magnet??0)+modifiers(this.build).magnet);
 this.queueUpgrade();
 }

 private tick=(t:number)=>{if(this.stopped)return;this.frame=requestAnimationFrame(this.tick);const realDt=this.last?Math.min((t-this.last)/1000,.05):0;this.hitStop=Math.max(0,this.hitStop-realDt);const dt=this.mode==='dungeon'&&this.hitStop>0?realDt*.12:realDt;this.hurtFlash=Math.max(0,this.hurtFlash-realDt);this.container.style.setProperty('--hurt-opacity',String(this.hurtFlash*2));this.last=t;this.elapsed+=realDt;
 const active=this.started&&!this.paused&&!this.upgrade&&!this.result&&!document.hidden;if(active)this.worldTime+=realDt;this.atmosphere?.update(this.worldTime,this.farm.day,this.mode,this.tier,this.reducedMotion,this.scene,this.sunlight,(this.farm.progress?.upgrades.greenhouse??0)>0);
 if(active){grow(this.farm,dt);let dx=Number(this.keys.has('d')||this.keys.has('arrowright'))-Number(this.keys.has('a')||this.keys.has('arrowleft')),dz=Number(this.keys.has('s')||this.keys.has('arrowdown'))-Number(this.keys.has('w')||this.keys.has('arrowup'));let dir=this.followCamera.movement(dx,dz);if(dir.lengthSq()){dir.normalize();this.target=null;}else if(this.target){dir.copy(this.target).sub(this.player.position);dir.y=0;if(dir.length()<.22){dir.set(0,0,0);this.target=null;}else dir.normalize();}
 const wasGrounded=this.motor.grounded,fallSpeed=this.motor.vertical;const jumped=this.motor.step(dt,this.player.position,dir,this.mode==='dungeon'?this.speed*modifiers(this.build).speed:8,this.keys.has('shift'),WORLD_RADIUS[this.mode]-2.5,(x,z)=>terrainHeight(this.mode,x,z),this.collisions[this.mode]);this.dash=this.motor.dashCooldown;if(jumped){this.playerFeel.takeoff();this.combatAudio.play('jump');this.fx.burst(this.player.position,'#e5dfbd',8,2);}if(this.motor.dashing)this.fx.trail(this.player.position.clone().add(new T.Vector3(0,.6,0)),'#bcebd1',.2);const moving=this.motor.velocity.lengthSq()>.1;if(moving)dir.copy(this.motor.velocity).normalize();
 if(!wasGrounded&&this.motor.grounded){this.playerFeel.land(fallSpeed);this.combatAudio.play('land');this.fx.burst(this.player.position,'#e9d7a1',8,2.5);}
 if(moving&&this.motor.grounded&&this.elapsed>this.dustAt){this.dustAt=this.elapsed+.09;this.fx.trail(this.player.position,'#dfc994',.11);}
 const actor=this.actors.get(this.farm.hero);if(actor&&this.elapsed>=this.weaponAttackUntil){if(moving)actor.root.rotation.y=Math.atan2(dir.x,dir.z);this.animate(actor,equippedMotion(actor,this.farm.hero,moving));}
 if(this.mode==='dungeon')this.combat(dt);else this.syncNearbyPlot();
 this.updateDefeated(dt);
 }
 for(const [id,a] of this.actors)if(id===this.farm.hero||this.mode==='farm')a.mixer.update(active?dt:dt*.4);this.updateResidents(dt,active);
 const playerActor=this.actors.get(this.farm.hero);updateFarmEquipment(playerActor,active?dt:0);if(playerActor)this.playerFeel.update(active?dt:0,playerActor.root,this.motor.velocity.lengthSq()>.1,this.motor.dashing,this.reducedMotion);
 if(this.campFlame)this.campFlame.scale.set(1+Math.sin(this.elapsed*9)*.06,1+Math.sin(this.elapsed*12)*.12,1);
 if(this.returnPortal&&!this.reducedMotion){const glow=this.returnPortal.children[1] as T.Mesh;glow.scale.setScalar(1+Math.sin(this.worldTime*2.2)*.035);const beacon=this.returnPortal.getObjectByName('home-beacon') as T.Mesh;(beacon.material as T.MeshBasicMaterial).opacity=.24+Math.sin(this.worldTime*2)*.06;}
 if(this.portal)this.portal.scale.setScalar(1+Math.sin(this.elapsed*1.8)*.045);
 this.ring.visible=this.inReach||!!this.nearby;this.ring.position.copy(this.nearby?new T.Vector3(this.nearby.x,.25,this.nearby.z):plotPosition(this.selected));this.ring.position.y=.25;this.ring.scale.setScalar(1+Math.sin(this.elapsed*3)*.03);
 for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.life-=dt;e.mesh.scale.addScalar(dt*6);(e.mesh.material as T.MeshBasicMaterial).opacity=Math.max(0,e.life);if(e.life<=0){this.scene.remove(e.mesh);e.mesh.geometry.dispose();(e.mesh.material as T.Material).dispose();this.effects.splice(i,1);}}
 this.followCamera.update(dt,this.started?this.player.position:new T.Vector3(0,0,1),this.cameraObstacles.filter(o=>{let p:T.Object3D|null=o;while(p){if(!p.visible)return false;p=p.parent;}return true;}),(x,z)=>terrainHeight(this.mode,x,z));
 const desiredFov=this.reducedMotion?62:this.motor.dashing?67:this.keys.has('shift')?65:62;this.camera.fov=T.MathUtils.lerp(this.camera.fov,desiredFov,1-Math.exp(-dt*6));this.camera.updateProjectionMatrix();this.sunlight.position.copy(this.player.position).add(new T.Vector3(-12,25,14));this.sunlight.target.position.copy(this.player.position);
 this.player.visible=this.mode!=='dungeon'||this.invuln<=0||Math.floor(this.invuln*18)%2===0;this.enemyBatch.update(this.defeated.length?[...this.enemies,...this.defeated.map(d=>d.enemy)]:this.enemies);this.playerBar.position.copy(this.player.position).add(new T.Vector3(0,2.5,0));this.playerBar.visible=this.started&&this.mode==="dungeon"&&!this.result;this.playerBar.update(this.hp,this.maxHp,active?dt:0);this.playerBar.face(this.camera);for(const e of this.enemies)e.bar.face(this.camera);
 if(this.mode==="farm")this.gardenArt?.update(this.elapsed,this.reducedMotion);else setGardenMotionTime(this.elapsed,this.reducedMotion);this.fx.update(active?realDt:0,active?this.camera:undefined);this.cartoon.render(this.scene,this.camera);this.actionFx.update(document.hidden?0:realDt,this.camera);this.plotPrompt?.update(this.camera,this.farm,this.selected,this.held,this.seed,active&&this.mode==='farm'&&this.inReach&&!this.nearby);
 if(this.elapsed-this.emitAt>.2){this.emitAt=this.elapsed;if(this.message&&this.elapsed>this.messageUntil)this.message='';this.emit();}
 if(this.elapsed-this.saveAt>3){this.saveAt=this.elapsed;if(active){if(this.mode==='farm')this.refreshPlants();this.save();}}
 };
 private keyDown=(e:KeyboardEvent)=>{const tag=(e.target as HTMLElement)?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag)||!this.started||this.paused||this.result||this.upgrade)return;const key=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','shift','q'].includes(key))e.preventDefault();this.keys.add(key);if(e.repeat)return;if(key==='v')this.followCamera.reset((this.actors.get(this.farm.hero)?.root.rotation.y??Math.PI)+Math.PI);if(key==='e')this.interact();if(key===' ')this.jumpNow();if(key==='q')this.dashNow();if(this.mode==='farm'){const slot=FARM_SLOT_KEYS.indexOf(key as typeof FARM_SLOT_KEYS[number]);if(slot>=0){e.preventDefault();this.selectFarmItem(FARM_SLOTS[slot]);}}};
 private keyUp=(e:KeyboardEvent)=>{this.keys.delete(e.key.toLowerCase());};
 private blur=()=>{this.keys.clear();};
 private visibility=()=>{this.keys.clear();this.save();};
 private contextLost=(e:Event)=>{e.preventDefault();this.error='The graphics context was interrupted. Your garden is saved; reload to continue.';this.paused=true;this.emit();};
 private click=(e:PointerEvent)=>{if(!this.started||this.paused||this.upgrade||this.result)return;const rect=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);
 const terrain=this.farmWorld.getObjectByName('terrain-surface');const surface=this.mode==='dungeon'?this.ray.intersectObjects(this.terrainChunks,false)[0]:terrain?this.ray.intersectObject(terrain,false)[0]:null;const point=surface?surface.point.clone():new T.Vector3();if(surface||this.ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),point)){point.y=0;const bound=WORLD_RADIUS[this.mode]-3;const flat=Math.hypot(point.x,point.z);if(flat>bound){point.x*=bound/flat;point.z*=bound/flat;}point.y=terrainHeight(this.mode,point.x,point.z);this.target=point;}};
 moveKey(key:string,down:boolean){if(down)this.keys.add(key);else this.keys.delete(key);}
 dispose(){this.stopped=true;cancelAnimationFrame(this.frame);this.save();this.abortTools();this.resizeObserver.disconnect();window.removeEventListener('keydown',this.keyDown);window.removeEventListener('keyup',this.keyUp);window.removeEventListener('blur',this.blur);document.removeEventListener('visibilitychange',this.visibility);this.followCamera.dispose();this.pickups.dispose();this.clearReturnPortal();this.clearDefeated();this.actionFx.dispose();this.plotPrompt?.dispose();this.spells.dispose();this.enemyBatch.dispose();this.fx.dispose();this.combatAudio.dispose();this.clearHostiles();this.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost);this.scene.traverse(o=>{if(o instanceof T.Sprite){o.material.map?.dispose();o.material.dispose();}if(o instanceof T.Mesh){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){for(const value of Object.values(m))if(value instanceof T.Texture)value.dispose();m.dispose();}}});this.cartoon.dispose();this.renderer.dispose();this.renderer.domElement.remove();void this.audio?.close();}
}


