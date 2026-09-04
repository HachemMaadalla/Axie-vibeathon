import * as T from 'three';
import {cliffGeometry} from './garden-art';
import {createTerrainMesh} from '../gameblocks/modules/world/environment/TerrainMeshFactory.js';
import {createGroundRockVisual} from '../gameblocks/modules/world/object/factory/RockVisualFactory.js';
import {RandomGenerator} from '../gameblocks/modules/math/RandomUtils.js';
import {WORLD_RADIUS,terrainHeight,dungeonTerrain} from './terrain';
import {toonMaterial} from './environment';

function islandSurface(parent:T.Group,mode:'farm'|'dungeon'){
 const sampler=mode==='farm'?{basis:dungeonTerrain.basis,sample:(x:number,f:number)=>({height:terrainHeight('farm',x,-f)+.02,color:new T.Color('#80bd52').lerp(new T.Color('#b5ce66'),.18+.17*Math.sin(x*.65)*Math.cos(f*.49))})}:dungeonTerrain;
 const mesh=createTerrainMesh({terrainSampler:sampler,size:60,segments:48,includeCell:(x:number,f:number)=>Math.hypot(x,f)<WORLD_RADIUS[mode]});
 mesh.material.dispose();const surface=toonMaterial('#ffffff');surface.vertexColors=true;mesh.material=surface;mesh.name=mode==='farm'?'terrain-surface':'battle-island-surface';mesh.userData.cameraIgnore=true;mesh.userData.terrainSurface=true;parent.add(mesh);
 const cliffMat=toonMaterial('#ffffff');cliffMat.vertexColors=true;const cliffs=new T.Mesh(cliffGeometry(WORLD_RADIUS[mode]),cliffMat);cliffs.name=mode==='farm'?'floating-island-cliffs':'battle-island-cliffs';cliffs.userData.cameraIgnore=true;parent.add(cliffs);
 return mesh;
}

export function makeLandscape(parent:T.Group){
 const surface=islandSurface(parent,'dungeon');
 const rng=new RandomGenerator(71031),rockMaterials=['#718383','#879089','#a09a7b'].map(c=>toonMaterial(c));
 const rocks=new T.Group();rocks.userData.batchable=true;rocks.name='battle-island-rocks';parent.add(rocks);
 // Natural cover only: no buildings, NPCs, bridges, gates, or landmark clutter.
 for(let i=0;i<18;i++){
  const a=i*2.39996,r=11+(i%7)/6*12,x=Math.cos(a)*r,z=Math.sin(a)*r;
  const rock=createGroundRockVisual({material:rockMaterials[i%3],prng:rng});rock.position.set(x,terrainHeight('dungeon',x,z)-.14,z);rock.scale.multiplyScalar(.7+(i%4)*.17);rock.userData.solid=i%2===0;rocks.add(rock);
 }
 const grass=new T.Group();grass.userData.batchable=true;grass.name='battle-meadow';parent.add(grass);
 const blade=new T.ConeGeometry(.1,.65,5),mats=['#3f9951','#7aba45','#acd35f'].map(c=>toonMaterial(c));
 for(let i=0;i<360;i++){
  const a=i*2.39996,r=8+Math.sqrt((i+.5)/360)*17,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(i%11<3)continue;const h=.28+(i%4)*.08,mesh=new T.Mesh(blade.clone(),mats[i%3]);mesh.position.set(x,terrainHeight('dungeon',x,z)+h*.45,z);mesh.scale.y=h;mesh.userData.cameraIgnore=true;grass.add(mesh);
 }
 blade.dispose();return [surface];
}

export function makeFarmLandscape(parent:T.Group){return islandSurface(parent,'farm');}
