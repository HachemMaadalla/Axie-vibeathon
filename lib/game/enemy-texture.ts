import * as T from 'three';
import {toonMaterial} from './toon';
import type {EnemyKind} from './enemies';

// Five 32px tiles: split bark, chitin plates, spores, wing veins, mineral fractures.
// Integer texels and nearest filtering keep the pattern attached to the 3D surface.
export const enemySurface=(kind:EnemyKind)=>kind==='beetle'?1:kind==='shaman'||kind==='bomber'?2:kind==='moth'||kind==='broodqueen'?3:kind==='crystal'||kind==='golem'||kind==='brute'?4:0;
export function enemyPixelAtlas(){
 const size=32,data=new Uint8Array(size*size*5*4);
 for(let tile=0;tile<5;tile++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const hash=(a:number,b:number)=>((Math.imul(a+19,374761393)^Math.imul(b+tile*37,668265263))>>>0)%101;
  const grain=hash(x>>1,y>>1);
  let value=grain<22?172:grain<60?210:238;
  if(tile===0){const seam=(x+Math.floor(y/7))%9;value=seam===0?78:seam===1?255:grain<28?157:215;}
  if(tile===1){const seamY=y%8,seamX=(x+(Math.floor(y/8)%2)*4)%8;value=seamY===0||seamX===0?85:seamY===1?255:grain<25?175:222;}
  if(tile===2){const dx=x%8-4,dy=y%8-4;value=dx*dx+dy*dy<5?95:dx*dx+dy*dy<10?250:grain<35?170:214;}
  if(tile===3){const vein=(x+y*2)%13;value=vein<2||x%15===0?66:vein===2?250:((x+y)%4===0?173:224);}
  if(tile===4){const crack=(x+Math.floor(y/4)*3)%15;value=crack===0?68:crack===1?255:Math.floor((x+y)/6)%3===0?169:226;}
  const i=((tile*size+y)*size+x)*4;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
 }
 const texture=new T.DataTexture(data,size,size*5,T.RGBAFormat);
 texture.name='enemy-pixel-surfaces';texture.magFilter=texture.minFilter=T.NearestFilter;texture.generateMipmaps=false;texture.colorSpace=T.SRGBColorSpace;texture.needsUpdate=true;
 return texture;
}
export function enemyPixelMaterial(atlas:T.Texture){
 const material=toonMaterial('#ffffff');material.map=atlas;
 material.onBeforeCompile=shader=>{
  shader.vertexShader='attribute float enemySurface; varying float vEnemySurface;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvEnemySurface = enemySurface;');
  shader.fragmentShader='varying float vEnemySurface;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
#ifdef USE_MAP
 vec2 pixelUv=(floor(clamp(vMapUv,0.0,0.99999)*32.0)+0.5)/32.0;
 pixelUv.y=(pixelUv.y+floor(vEnemySurface+0.5))/5.0;
 diffuseColor *= texture2D(map,pixelUv);
#endif
`);
 };
 material.customProgramCacheKey=()=>'enemy-pixel-surfaces-v1';
 return material;
}
