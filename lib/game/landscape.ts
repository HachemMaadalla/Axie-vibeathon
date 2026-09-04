import * as T from 'three';
import {TILE,WORLD_RADIUS,terrainHeight,terrainBiome,isWater,isBridge} from './terrain';
import {pixelMaterial} from './environment';
const palette={woodland:'#89ae68',marsh:'#6a9190',badlands:'#bf9b70',crystal:'#a39ab7'};
// Only top and exposed cliff faces are emitted. Chunks can be frustum-culled;
// a larger map therefore does not draw hundreds of thousands of hidden cubes.
export function makeLandscape(parent:T.Group){
 const radius=WORLD_RADIUS.dungeon,n=Math.floor(radius*2/TILE)+1,heights=new Float32Array(n*n),present=new Uint8Array(n*n);
 for(let x=0;x<n;x++)for(let z=0;z<n;z++){const px=-radius+x*TILE,pz=-radius+z*TILE,i=x*n+z;if(px*px+pz*pz<radius*radius){present[i]=1;heights[i]=terrainHeight('dungeon',px,pz);}}
 const material=pixelMaterial('#ffffff','grass'),chunks:T.Mesh[]=[];
 for(let cx=0;cx<n;cx+=24)for(let cz=0;cz<n;cz+=24){
  const positions:number[]=[],colors:number[]=[],uvs:number[]=[],indices:number[]=[];
  const quad=(points:number[][],color:T.Color)=>{const first=positions.length/3;for(const p of points){positions.push(...p);colors.push(color.r,color.g,color.b);}uvs.push(0,0,0,1,1,1,1,0);indices.push(first,first+1,first+2,first,first+2,first+3);};
  for(let x=cx;x<Math.min(n,cx+24);x++)for(let z=cz;z<Math.min(n,cz+24);z++){
   const i=x*n+z;if(!present[i])continue;
   const px=-radius+x*TILE,pz=-radius+z*TILE,y=heights[i]+.02,a=px-TILE/2,b=px+TILE/2,c=pz-TILE/2,d=pz+TILE/2;
   const color=new T.Color(isBridge(px,pz)?'#a1835d':isWater(px,pz)?'#67bec2':palette[terrainBiome(px,pz)]);
   color.multiplyScalar(.9+((x*7+z*13)%9)*.012);
   quad([[a,y,c],[a,y,d],[b,y,d],[b,y,c]],color);
   const side=color.clone().multiplyScalar(.64);
   const neighbor=(nx:number,nz:number)=>nx>=0&&nx<n&&nz>=0&&nz<n&&present[nx*n+nz]?heights[nx*n+nz]+.02:-5;
   let low=neighbor(x-1,z);if(low<y)quad([[a,low,c],[a,low,d],[a,y,d],[a,y,c]],side);
   low=neighbor(x+1,z);if(low<y)quad([[b,low,d],[b,low,c],[b,y,c],[b,y,d]],side);
   low=neighbor(x,z-1);if(low<y)quad([[b,low,c],[a,low,c],[a,y,c],[b,y,c]],side);
   low=neighbor(x,z+1);if(low<y)quad([[a,low,d],[b,low,d],[b,y,d],[a,y,d]],side);
  }
  if(!positions.length)continue;
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();
  const mesh=new T.Mesh(geo,material);mesh.name='terrain-chunk';mesh.receiveShadow=true;mesh.userData.cameraIgnore=true;mesh.userData.terrainSurface=true;parent.add(mesh);chunks.push(mesh);
 }
 material.vertexColors=true;return chunks;
}

