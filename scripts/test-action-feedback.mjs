import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e}}});
const {WildseedGame}=await import('../lib/game/scene.ts');
const {freshFarm}=await import('../lib/game/state.ts');
const {plotPosition}=await import('../lib/game/farming.ts');
const {ActionFeedback,projectPopup,popupMotion}=await import('../lib/game/action-feedback.ts');
let checks=0;const check=(name,f)=>{f();checks++;console.log('PASS '+name)};
function fixture(){
 const events=[],g=Object.assign(Object.create(WildseedGame.prototype),{farm:freshFarm(),player:new T.Group(),mode:'farm',started:true,paused:false,result:null,upgrade:false,selected:0,inReach:false,nearby:null,seed:'sunroot',
 actionFx:{spawn:(...args)=>events.push(args)},emit:()=>{},sound:()=>{},pulse:()=>{},changed:()=>{},toast:s=>s});
 return {g,events};
}
check('E emits the correct art above the acted-on soil, with exact harvested quantity',()=>{
 const {g,events}=fixture();const index=g.farm.plots.findIndex(p=>!p.crop);g.player.position.copy(plotPosition(index));
 g.syncNearbyPlot();assert.equal(events.length,0);g.interact();assert.equal(events[0][0],'plant');
 assert.equal(events[0][1].x,plotPosition(index).x);assert.equal(events[0][1].z,plotPosition(index).z);assert.ok(events[0][1].y>plotPosition(index).y);
 g.interact();assert.equal(events[1][0],'water');g.interact();assert.equal(events.length,2,'Growing crops do not trigger fake successes');
 g.farm.plots[index].growth=1;g.farm.plots[index].rich=true;g.interact();assert.equal(events[2][0],'harvest');assert.equal(events[2][2].amount,3);
});
check('Missing seeds, distant actions, and paused E never trigger a success icon',()=>{
 const {g,events}=fixture();const index=g.farm.plots.findIndex(p=>!p.crop);g.player.position.copy(plotPosition(index));g.farm.seeds.sunroot=0;g.interact();assert.equal(events.length,0);
 g.farm.seeds.sunroot=3;g.paused=true;g.interact();assert.equal(events.length,0);
 g.paused=false;g.player.position.set(50,0,50);g.interact();assert.equal(events.length,0);
});
check('Soil, fertilizer, cooking, and portal rewards only animate on a real state change',()=>{
 const {g,events}=fixture();g.player.position.copy(plotPosition(0));g.farm.soil=2;g.farm.plots[0].rich=false;g.improvePlot('soil');g.improvePlot('soil');assert.deepEqual(events.map(e=>e[0]),['soil']);
 g.farm.plots[0]={crop:'sunroot',growth:0,watered:false,rich:true,fertilized:false};g.farm.fertilizer=2;g.improvePlot('fertilizer');g.improvePlot('fertilizer');assert.equal(events.length,2);
 g.farm.crops.sunroot=2;g.cookMeal('sunroot');g.cookMeal('sunroot');assert.equal(events.length,3);assert.equal(events[2][2].anchor,'cook-sunroot');assert.equal(events[2][2].amount,1);
 g.farm.crops.sunroot=4;g.farm.crops.moonberry=2;g.unlock();g.unlock();assert.equal(events.length,4);assert.equal(events[3][0],'unlock');
});
check('World anchors follow the camera and hide points behind it; reduced motion has no bounce',()=>{
 const camera=new T.PerspectiveCamera(60,2,.1,100);camera.position.set(0,0,10);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const bounds={left:10,top:20,width:800,height:400},pos=projectPopup(new T.Vector3(),camera,bounds);assert.equal(pos.x,410);assert.equal(pos.y,220);assert.ok(pos.visible);
 assert.equal(projectPopup(new T.Vector3(0,0,20),camera,bounds).visible,false);
 camera.position.x=3;camera.updateMatrixWorld();assert.notEqual(projectPopup(new T.Vector3(),camera,bounds).x,410);
 assert.equal(popupMotion(.5,true).rise,0);assert.equal(popupMotion(.5,true).scale,1);assert.equal(popupMotion(1.35).opacity,0);
});
check('Feedback stays bounded, expires during menus, and removes detached anchors and DOM on dispose',()=>{
 class Element{
  children=[];style={};parent=null;attrs={};rect={left:100,top:200,right:180,width:80,height:40};textContent='';
  get isConnected(){return this===body||!!this.parent?.isConnected}
  appendChild(c){this.children.push(c);c.parent=this;return c}
  setAttribute(k,v){this.attrs[k]=v}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);this.parent=null}
  getBoundingClientRect(){return this.rect}
 }
 const body=new Element(),container=new Element(),anchor=new Element();body.appendChild(container);body.appendChild(anchor);
 globalThis.document={body,createElement:()=>new Element(),querySelector:()=>anchor};
 globalThis.window={matchMedia:()=>({matches:false}),innerWidth:1000,innerHeight:700};globalThis.Image=class{};
 const fx=new ActionFeedback(container),camera=new T.PerspectiveCamera(60,1,.1,100);camera.position.z=10;camera.updateMatrixWorld();
 fx.spawn('coin',new T.Vector3(),{amount:-6,anchor:'cook-sunroot'});fx.spawn('coin',new T.Vector3(),{amount:2,anchor:'cook-sunroot'});assert.equal(fx.popups.length,1);
 fx.update(.2,camera);assert.equal(fx.popups[0].node.style.visibility,'visible');assert.equal(fx.popups[0].node.children[1].textContent,'+2');
 anchor.remove();fx.update(.1,camera);assert.equal(fx.popups.length,0);
 for(let i=0;i<20;i++)fx.spawn('plant',new T.Vector3(i*2,0,0));assert.equal(fx.popups.length,8);
 fx.update(1.4,camera);assert.equal(fx.popups.length,0);fx.dispose();assert.equal(container.children.length,0);assert.deepEqual(body.children,[container]);
 delete globalThis.document;delete globalThis.window;delete globalThis.Image;
});
console.log(checks+' action feedback checks passed.');

