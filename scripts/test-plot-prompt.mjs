import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import * as T from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e}}});
const {plotPromptData,positionPlotPrompt,PlotPrompt}=await import('../lib/game/plot-prompt.ts');
const {freshFarm}=await import('../lib/game/state.ts');
const farm=freshFarm();
let data=plotPromptData(farm,4,'sunroot','sunroot');assert.equal(data.name,'Sunroot');assert.equal(data.status,'Empty soil');assert.equal(data.key,'E');assert.equal(data.label,'Plant');assert.ok(data.src.endsWith('sunroot-seed.png'));
farm.plots[4]={crop:'moonberry',growth:.3,watered:false,rich:false,fertilized:false};
data=plotPromptData(farm,4,'water','sunroot');assert.equal(data.name,'Moonberry');assert.equal(data.status,'Needs water');assert.equal(data.label,'Water');assert.equal(data.ready,true);assert.ok(data.src.endsWith('moonberry-crop.png'));
data=plotPromptData(farm,4,'sunroot','sunroot');assert.equal(data.ready,false);assert.equal(data.key,'4');assert.equal(data.label,'Equip can');
farm.plots[4].growth=1;data=plotPromptData(farm,4,'sickle','sunroot');assert.equal(data.status,'Ready to harvest');assert.equal(data.label,'Harvest');assert.equal(data.key,'E');
data=plotPromptData(farm,4,'water','sunroot');assert.equal(data.ready,false);assert.equal(data.key,'5');
farm.plots[4].growth=.4;farm.plots[4].watered=true;data=plotPromptData(farm,4,'water','sunroot');assert.equal(data.status,'Growing · 40%');assert.equal(data.ready,false);assert.equal(data.key,'');
console.log('PASS Plant, water, harvest, growth and wrong-tool cards match the crop state');
const camera=new T.PerspectiveCamera(60,1.6,.1,100);camera.position.set(0,8,12);camera.lookAt(0,0,0);camera.updateMatrixWorld();
const a=positionPlotPrompt(new T.Vector3(),camera,1000,700);camera.position.x=3;camera.lookAt(0,0,3);camera.updateMatrixWorld();const b=positionPlotPrompt(new T.Vector3(),camera,1000,700);assert.notEqual(a.x,b.x);assert.ok(b.visible);
const behind=camera.position.clone().add(camera.getWorldDirection(new T.Vector3()).multiplyScalar(-5));assert.equal(positionPlotPrompt(behind,camera,1000,700).visible,false);
for(const [w,h] of [[320,640],[600,360],[1400,900]]){const p=positionPlotPrompt(new T.Vector3(2,0,1),camera,w,h,184,100);assert.ok(p.x>=10&&p.x+184<=w-10);assert.ok(p.y>=82&&p.y+100<=h-90);}
console.log('PASS Card follows the camera, hides behind it, and stays inside small viewports');
class Node{children=[];style={setProperty(){}};dataset={};attrs={};offsetWidth=204;offsetHeight=100;clientWidth=1000;clientHeight=700;hidden=false;appendChild(n){this.children.push(n);n.parent=this;}addEventListener(type,fn){this[type]=fn;}setAttribute(k,v){this.attrs[k]=v;}remove(){this.parent.children.splice(this.parent.children.indexOf(this),1);}}
globalThis.document={createElement:()=>new Node()};const container=new Node();let uses=0;const prompt=new PlotPrompt(container,()=>uses++);
prompt.update(camera,farm,0,'sickle','sunroot',true);const node=container.children[0];assert.equal(node.hidden,false);assert.equal(node.disabled,false);node.click();assert.equal(uses,1);
prompt.update(camera,farm,0,'water','sunroot',true);assert.ok(node.disabled);assert.equal(container.children.length,1);
prompt.hide();assert.ok(node.hidden);prompt.update(camera,farm,0,'sickle','sunroot',false);assert.ok(node.hidden);prompt.dispose();assert.equal(container.children.length,0);
console.log('PASS One reusable clickable card updates, hides on pause, and cleans up');
