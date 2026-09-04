import * as T from 'three';
const gradient=new T.DataTexture(new Uint8Array([75,169,255]),3,1,T.RedFormat);
gradient.minFilter=gradient.magFilter=T.NearestFilter;gradient.generateMipmaps=false;gradient.needsUpdate=true;
export function toonMaterial(color:T.ColorRepresentation){
 return new T.MeshToonMaterial({color,gradientMap:gradient});
}
export function toonify(root:T.Object3D,cache=new Map<T.Material,T.MeshToonMaterial>()){
 root.traverse(o=>{
  if(!(o instanceof T.Mesh))return;
  const convert=(source:T.Material)=>{
   if(source instanceof T.MeshToonMaterial)return source;
   let material=cache.get(source);if(material)return material;
   const lit=source as T.MeshStandardMaterial;
   material=toonMaterial(lit.color??'#ffffff');
   material.map=lit.map??null;material.alphaMap=lit.alphaMap??null;
   material.transparent=source.transparent;material.opacity=source.opacity;material.alphaTest=source.alphaTest;
   material.side=source.side;material.depthWrite=source.depthWrite;material.vertexColors=lit.vertexColors;
   material.emissive.copy(lit.emissive??new T.Color(0));material.emissiveMap=lit.emissiveMap??null;material.emissiveIntensity=lit.emissiveIntensity??1;
   material.name=source.name;cache.set(source,material);return material;
  };
  o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
 });
 return root;
}
// One depth-based outline pass handles skinned Axies and instanced enemies alike.
export class CartoonRenderer{
 readonly target:T.WebGLRenderTarget;
 readonly material:T.ShaderMaterial;
 private scene=new T.Scene();private camera=new T.OrthographicCamera(-1,1,1,-1,0,1);private quad:T.Mesh;
 constructor(private renderer:T.WebGLRenderer){
  this.target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:2});
  this.target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
  this.material=new T.ShaderMaterial({
   uniforms:{tColor:{value:this.target.texture},tDepth:{value:this.target.depthTexture},texel:{value:new T.Vector2(1,1)},near:{value:.1},far:{value:250},ink:{value:new T.Color('#172d44')}},
   vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
   fragmentShader:[
    '#include <common>','#include <packing>',
    'uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 texel; uniform float near; uniform float far; uniform vec3 ink; varying vec2 vUv;',
    'float depthAt(vec2 uv){return -perspectiveDepthToViewZ(texture2D(tDepth,clamp(uv,vec2(0.001),vec2(0.999))).x,near,far);}',
    'void main(){',
    ' vec4 color=texture2D(tColor,vUv); float center=depthAt(vUv);',
    ' float l=depthAt(vUv-vec2(texel.x,0.0)),r=depthAt(vUv+vec2(texel.x,0.0));',
    ' float b=depthAt(vUv-vec2(0.0,texel.y)),t=depthAt(vUv+vec2(0.0,texel.y));',
    // Second differences avoid outlining a continuous slope merely for facing the camera.
    ' float curvature=max(abs(l+r-2.0*center),abs(t+b-2.0*center));',
    ' float threshold=max(0.045,center*0.006);',
    ' float edge=smoothstep(threshold,threshold*2.8,curvature)*(1.0-smoothstep(95.0,160.0,center));',
    ' gl_FragColor=vec4(mix(color.rgb,ink,edge*0.58),color.a);',
    '#include <tonemapping_fragment>','#include <colorspace_fragment>','}'
   ].join('\n'),depthTest:false,depthWrite:false
  });
  this.quad=new T.Mesh(new T.PlaneGeometry(2,2),this.material);this.quad.frustumCulled=false;this.scene.add(this.quad);
 }
 resize(width:number,height:number){
  const ratio=this.renderer.getPixelRatio();this.target.setSize(Math.max(1,Math.round(width*ratio)),Math.max(1,Math.round(height*ratio)));
  this.material.uniforms.texel.value.set(.9/width,.9/height);
 }
 render(scene:T.Scene,camera:T.PerspectiveCamera){
  this.material.uniforms.near.value=camera.near;this.material.uniforms.far.value=camera.far;
  const target=this.renderer.getRenderTarget();
  try{this.renderer.setRenderTarget(this.target);this.renderer.render(scene,camera);this.renderer.setRenderTarget(target);this.renderer.render(this.scene,this.camera);}
  finally{this.renderer.setRenderTarget(target);}
 }
 dispose(){this.target.dispose();this.quad.geometry.dispose();this.material.dispose();}
}


export function addCartoonSky(scene:T.Scene){
 const clouds=new T.InstancedMesh(new T.SphereGeometry(1,12,8),new T.MeshBasicMaterial({color:'#fff9e6'}),64);
 const matrix=new T.Matrix4(),q=new T.Quaternion();let count=0;
 for(let i=0;i<16;i++){
  const angle=i*2.399,range=100+i%4*26,x=Math.cos(angle)*range,z=Math.sin(angle)*range,y=34+i%3*7;
  for(let j=0;j<4;j++){matrix.compose(new T.Vector3(x+(j-1.5)*5,y+Math.sin(j*1.9)*2,z),q,new T.Vector3(7,2.8+(j%2)*1.8,4));clouds.setMatrixAt(count++,matrix);}
 }
 clouds.name='cartoon-clouds';clouds.userData.cameraIgnore=true;scene.add(clouds);
}

