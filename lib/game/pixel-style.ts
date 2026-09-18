import * as T from 'three';

// Billboards use exact texels, without blurred mip levels.
export function crispTexture<TTexture extends T.Texture>(texture:TTexture):TTexture{
 texture.magFilter=T.NearestFilter;texture.minFilter=T.NearestFilter;
 texture.generateMipmaps=false;texture.anisotropy=1;texture.needsUpdate=true;
 return texture;
}

// Keep the official model artwork, UVs and rig, sampled on a smaller pixel grid.
export function pixelModelMaterial(material:T.MeshToonMaterial){
 if(material.map)crispTexture(material.map);
 if(material.emissiveMap)crispTexture(material.emissiveMap);
 const image=material.map?.image as {width?:number;height?:number}|undefined;
 const width=image?.width??256,height=image?.height??256;
 const scale=Math.min(1,256/Math.max(width,height));
 const grid=new T.Vector2(Math.max(1,Math.round(width*scale)),Math.max(1,Math.round(height*scale)));
 material.onBeforeCompile=shader=>{
  shader.uniforms.retroMapGrid={value:grid};
  shader.fragmentShader='uniform vec2 retroMapGrid;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
   T.ShaderChunk.map_fragment.replace(/vMapUv/g,'((floor(vMapUv * retroMapGrid) + 0.5) / retroMapGrid)'));
 };
 material.customProgramCacheKey=()=> 'retro-model-map-v1';
 return material;
}

// Consistent world-space pixel size, including merged and instanced scenery.
export function pixelSurfaceMaterial(material:T.MeshToonMaterial){
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 retroPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',
   '#include <project_vertex>\nvec4 retroWorld=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nretroWorld=instanceMatrix*retroWorld;\n#endif\nretroPosition=(modelMatrix*retroWorld).xyz;');
  shader.fragmentShader='varying vec3 retroPosition;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
   '#include <color_fragment>\nvec3 cell=floor(retroPosition*8.0);\nfloat grain=fract(sin(dot(cell,vec3(127.1,311.7,74.7)))*43758.5453);\ndiffuseColor.rgb*=grain<0.22?0.89:(grain>0.82?1.07:1.0);');
 };
 material.customProgramCacheKey=()=> 'retro-surface-v1';
 return material;
}
