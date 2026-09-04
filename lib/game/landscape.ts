import * as T from 'three';
import {createTerrainMesh} from '../gameblocks/modules/world/environment/TerrainMeshFactory.js';
import {createGroundRockVisual} from '../gameblocks/modules/world/object/factory/RockVisualFactory.js';
import {RandomGenerator} from '../gameblocks/modules/math/RandomUtils.js';
import {TERRAIN_STEP,WORLD_RADIUS,DUNGEON_DETAIL_SCALE,terrainHeight,terrainBiome,isWater,isBridge,riverX,terrainRoads,dungeonTerrain} from './terrain';
import {toonMaterial} from './environment';

export function makeLandscape(parent:T.Group){
 const chunks:T.Mesh[]=[],radius=WORLD_RADIUS.dungeon,size=25;
 const surface=toonMaterial('#ffffff');surface.vertexColors=true;
 const extent=Math.ceil((radius+7)/size)*size;
 for(let x=-extent;x<extent;x+=size)for(let f=-extent;f<extent;f+=size){
  if(Math.hypot(x+size/2,f+size/2)>radius+size)continue;
  const mesh=createTerrainMesh({terrainSampler:dungeonTerrain,size,segments:size/TERRAIN_STEP,centerRight:x+size/2,centerForward:f+size/2,
   includeCell:(r:number,forward:number)=>Math.hypot(r,forward)<radius+7,materialOptions:{flatShading:false,roughness:1}});
  if(!mesh.geometry.index?.count){mesh.geometry.dispose();mesh.material.dispose();continue;}
  mesh.material.dispose();mesh.material=surface;const pos=mesh.geometry.attributes.position,normal=mesh.geometry.attributes.normal;for(let i=0;i<pos.count;i++){const n=dungeonTerrain.normalAt(pos.getX(i),-pos.getZ(i));normal.setXYZ(i,n.x,n.y,n.z);}mesh.name='terrain-chunk';mesh.userData.cameraIgnore=true;mesh.userData.terrainSurface=true;mesh.geometry.computeBoundingSphere();parent.add(mesh);chunks.push(mesh);
 }
 addWater(parent);addGroundDetails(parent);
 return chunks;
}
function addWater(parent:T.Group){
 const material=toonMaterial('#12afd2');material.transparent=true;material.opacity=.88;material.depthWrite=false;
 // The river has its own surface over the carved bed, instead of blue-colored dirt.
 const geo=new T.BufferGeometry(),positions:number[]=[],uv:number[]=[],indices:number[]=[];
 for(let z=-WORLD_RADIUS.dungeon;z<WORLD_RADIUS.dungeon;z+=2.5){
  if(Math.abs(z)<28||Math.hypot(riverX(z),z)>WORLD_RADIUS.dungeon)continue;
  const x1=riverX(z),x2=riverX(z+2.5),i=positions.length/3;
  positions.push(x1-5.4,.08,z,x1+5.4,.08,z,x2+5.4,.08,z+2.5,x2-5.4,.08,z+2.5);
  uv.push(0,z/3,3,z/3,3,(z+2.5)/3,0,(z+2.5)/3);indices.push(i,i+2,i+1,i,i+3,i+2);
 }
 geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
 const river=new T.Mesh(geo,material);river.name='river-water';river.userData.cameraIgnore=true;parent.add(river);
 const ocean=new T.Mesh(new T.RingGeometry(radiusForSea(),335,128),material);ocean.rotation.x=-Math.PI/2;ocean.position.y=-.4;ocean.userData.cameraIgnore=true;ocean.name='coastal-water';parent.add(ocean);
 const foamMat=new T.MeshBasicMaterial({color:'#d2eee0',transparent:true,opacity:.65});
 const foam=new T.InstancedMesh(new T.BoxGeometry(1,1,1),foamMat,280);foam.userData.cameraIgnore=true;foam.name='river-ripples';
 const matrix=new T.Matrix4(),q=new T.Quaternion();let count=0;
 for(let i=0;i<280;i++){
  const z=-WORLD_RADIUS.dungeon+i*(WORLD_RADIUS.dungeon*2/280),x=riverX(z)+Math.sin(i*2.4)*3.5;if(Math.hypot(x,z)>WORLD_RADIUS.dungeon-3||!isWater(x,z)||terrainHeight('dungeon',x,z)>.05)continue;
  matrix.compose(new T.Vector3(x,.11,z),q,new T.Vector3(.45+(i%4)*.3,.015,.07));foam.setMatrixAt(count++,matrix);
 }
 foam.count=count;parent.add(foam);
}
const radiusForSea=()=>WORLD_RADIUS.dungeon-2;
function addGroundDetails(parent:T.Group){
 const rng=new RandomGenerator(71031),rockMaterials=['#5c718c','#b77859','#8064bd'].map(c=>toonMaterial(c));
 const ground=new T.Group();ground.userData.batchable=true;ground.name='gameblocks-rocks';parent.add(ground);
 for(let i=0;i<Math.round(380*DUNGEON_DETAIL_SCALE);i++){
  const a=rng.uniform(0,Math.PI*2),r=Math.sqrt(rng.random())*(WORLD_RADIUS.dungeon-14),x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(r<18||isWater(x,z)||isBridge(x,z)||terrainRoads.distanceToRoad(x,-z)<6)continue;
  const rock=createGroundRockVisual({material:rockMaterials[i%3],prng:rng});rock.position.set(x,terrainHeight('dungeon',x,z)-.15,z);
  if(i%7===0){rock.scale.multiplyScalar(2.7);rock.position.y-=.35;}
  ground.add(rock);
 }
 const materials=['#288449','#a8d951','#17776e','#f5c366'].map(c=>toonMaterial(c));
 const patch=new T.Group();patch.userData.batchable=true;patch.name='meadow-patches';parent.add(patch);
 const geometry=new T.ConeGeometry(.12,1,5);
 for(let i=0;i<Math.round(2000*DUNGEON_DETAIL_SCALE);i++){
  const a=rng.uniform(0,Math.PI*2),r=Math.sqrt(rng.random())*(WORLD_RADIUS.dungeon-17),x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(r<16||isBridge(x,z)||isWater(x,z)||terrainRoads.distanceToRoad(x,-z)<4)continue;
  const biome=terrainBiome(x,z),mat=materials[biome==='marsh'?2:biome==='badlands'?3:i%2],height=biome==='marsh'?.9:.2+rng.random()*.4;
  const blade=new T.Mesh(geometry.clone(),mat);blade.position.set(x,terrainHeight('dungeon',x,z)+height*.45,z);blade.scale.y=height;patch.add(blade);
 }
 geometry.dispose();
}


export function makeFarmLandscape(parent:T.Group){
 const mesh=createTerrainMesh({terrainSampler:{basis:dungeonTerrain.basis,sample:(x:number,f:number)=>({height:terrainHeight("farm",x,-f)+.02,color:new T.Color("#78c850")})},size:60,segments:48,includeCell:(x:number,f:number)=>Math.hypot(x,f)<30});
 mesh.material.dispose();const surface=toonMaterial("#ffffff");surface.vertexColors=true;mesh.material=surface;mesh.name="terrain-surface";mesh.userData.cameraIgnore=true;parent.add(mesh);
 const base=new T.Mesh(new T.CylinderGeometry(30,28,4,96),toonMaterial("#74577c"));base.position.y=-2.04;base.userData.cameraIgnore=true;parent.add(base);return mesh;
}
