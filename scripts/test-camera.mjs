import assert from 'node:assert/strict';
import * as T from 'three';
import {FollowCamera,cameraMovement} from '../lib/game/camera.ts';
class Canvas extends EventTarget{
 captures=new Set();clientHeight=800;
 setPointerCapture(id){this.captures.add(id);}
 hasPointerCapture(id){return this.captures.has(id);}
 releasePointerCapture(id){this.captures.delete(id);}
}
const close=(a,b)=>assert.ok(a.distanceTo(b)<1e-6,JSON.stringify([a,b]));
close(cameraMovement(0,-1,0),new T.Vector3(0,0,-1));
close(cameraMovement(0,-1,Math.PI/2),new T.Vector3(-1,0,0));
close(cameraMovement(1,0,Math.PI/2),new T.Vector3(0,0,-1));
assert.equal(cameraMovement(1,1,1).length(),1);
const canvas=new Canvas(),camera=new T.PerspectiveCamera(55,1,.1,150);
let enabled=true,taps=0;
const rig=new FollowCamera(camera,canvas,()=>enabled,()=>taps++);
const player=new T.Vector3(3,0,4);
rig.snap(player);
const focus=player.clone().add(new T.Vector3(0,1.1,0));
assert.ok(Math.abs(camera.position.distanceTo(focus)-10)<1e-6);
rig.zoom(-100000);assert.equal(rig.distance,4.5);
rig.zoom(100000);assert.equal(rig.distance,22);
rig.rotate(0,100000);assert.equal(rig.pitch,1.22);
rig.rotate(0,-100000);assert.equal(rig.pitch,.16);
rig.reset();rig.snap(player);
for(let i=0;i<360;i++){
 rig.rotate(10,0);rig.update(1/60,player,[]);
 assert.ok(camera.position.distanceTo(player)>8,'Orbit must not pass through the player');
}
const moved=player.clone().add(new T.Vector3(15,0,-5));
for(let i=0;i<120;i++)rig.update(1/60,moved,[]);
const target=moved.clone().add(new T.Vector3(0,1.1,0));
const facing=new T.Vector3();camera.getWorldDirection(facing);
assert.ok(facing.dot(target.clone().sub(camera.position).normalize())>.99999);
rig.reset();rig.snap(player);
const direction=camera.position.clone().sub(focus).normalize();
const wall=new T.Mesh(new T.BoxGeometry(2,3,2),new T.MeshBasicMaterial());
wall.position.copy(focus).addScaledVector(direction,6);wall.updateMatrixWorld();
rig.update(1/60,player,[wall]);
assert.ok(camera.position.distanceTo(focus)<6,'Camera must move in front of the wall');
assert.ok(camera.position.distanceTo(focus)>=3,'Camera must retain player clearance');
const blocked=camera.position.distanceTo(focus);rig.update(1/60,player,[]);const recovering=camera.position.distanceTo(focus);assert.ok(recovering>blocked&&recovering<blocked+1,'Clearing a wall must ease out without a camera pop');for(let i=0;i<120;i++)rig.update(1/60,player,[]);assert.ok(Math.abs(camera.position.distanceTo(focus)-10)<.001);
const event=(type,props)=>{const e=new Event(type,{cancelable:true});Object.assign(e,props);canvas.dispatchEvent(e);};
const pointer=(type,x,y,button=0,id=1)=>event(type,{clientX:x,clientY:y,button,pointerId:id});
pointer('pointerdown',100,100);pointer('pointerup',100,100);assert.equal(taps,1);
pointer('pointerdown',100,100);pointer('pointermove',180,130);pointer('pointerup',180,130);assert.equal(taps,1,'Drag must not become click-to-walk');
pointer('pointerdown',100,100,2);pointer('pointerup',100,100,2);assert.equal(taps,1);
rig.reset();
pointer('pointerdown',100,100,0,1);pointer('pointerdown',200,100,0,2);
pointer('pointermove',250,100,0,2);assert.ok(rig.distance<10,'Pinch apart zooms in');
pointer('pointerup',100,100,0,1);pointer('pointerup',250,100,0,2);assert.equal(taps,1);
enabled=false;const yaw=rig.yaw;
pointer('pointerdown',100,100);pointer('pointermove',200,100);pointer('pointerup',200,100);
assert.equal(rig.yaw,yaw);assert.equal(taps,1);
rig.dispose();enabled=true;pointer('pointerdown',100,100);pointer('pointerup',100,100);assert.equal(taps,1);
console.log('Camera checks passed: movement, follow, full orbit clearance, zoom/pitch bounds, wall clearance, tap/drag, pinch, pause, cleanup.');

