import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from 'three';
import {freshBuild,ITEMS,WEAPONS,PASSIVES,EVOLUTIONS,itemLevel,canEvolve,eligibleChoices,draftChoices,applyChoice,modifiers,spellStats,xpNeeded} from '../lib/game/build.ts';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(e){if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return next(specifier+'.ts',context);throw e;}}});
const {SpellEngine}=await import('../lib/game/spell-engine.ts');
let passed=0;const check=(name,fn)=>{fn();console.log('PASS '+name);passed++;};
const choose=(b,id,kind)=>{const c=eligibleChoices(b).find(c=>c.id===id&&(!kind||c.kind===kind));assert.ok(c,'Choice available '+id);assert.ok(applyChoice(b,c));return c;};
check('All recipes require max spell plus the matching item; evolution preserves slots',()=>{
 for(const id of WEAPONS){
  const b={items:{[id]:2},evolved:[]};
  choose(b,EVOLUTIONS[id].passive);assert.equal(canEvolve(b,id),false);
  choose(b,id);assert.ok(canEvolve(b,id));
  const n=Object.keys(b.items).length;const c=choose(b,id,'evolution');
  assert.equal(Object.keys(b.items).length,n);assert.equal(b.items[id],3);
  assert.equal(applyChoice(b,c),false);assert.equal(canEvolve(b,id),false);
  assert.ok(!eligibleChoices(b).some(c=>c.id===id));
 }
});
check('Drafts are unique, legal, capped and always offer a ready evolution',()=>{
 let seed=13;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 for(let run=0;run<100;run++){
  const b=freshBuild();
  for(let level=0;level<50;level++){
   const choices=draftChoices(b,rng);assert.ok(choices.length>0&&choices.length<=3);
   assert.equal(new Set(choices.map(c=>c.id)).size,choices.length);
   if(WEAPONS.some(id=>canEvolve(b,id)))assert.ok(choices.some(c=>c.kind==='evolution'));
   const picked=choices[Math.floor(rng()*choices.length)];assert.ok(applyChoice(b,picked));
   assert.ok(WEAPONS.filter(id=>itemLevel(b,id)>0).length<=4);
   assert.ok(PASSIVES.filter(id=>itemLevel(b,id)>0).length<=4);
   assert.ok(Object.values(b.items).every(n=>n<=3));
  }
 }
});
check('Maxed builds offer healing and reject stale upgrades or fifth equipment slots',()=>{
 const b={items:{},evolved:[]};
 for(const id of WEAPONS.slice(0,4)){b.items[id]=3;b.evolved.push(id);}
 for(const id of PASSIVES.slice(0,4))b.items[id]=3;
 assert.deepEqual(eligibleChoices(b).map(c=>c.id),['heal']);
 const fresh=freshBuild(),c=eligibleChoices(fresh).find(c=>c.id==='thorn');
 assert.ok(applyChoice(fresh,c));assert.equal(applyChoice(fresh,c),false);
});
check('Passive modifiers reach real spell parameters and stats',()=>{
 const b={items:{thorn:3,sun:3,wind:3,heart:3,echo:3,dew:3},evolved:[]};
 const s=spellStats(b,'thorn'),m=modifiers(b);
 assert.equal(s.count,6);assert.equal(m.health,36);assert.equal(m.regen,1.5);
 assert.ok(s.damage>spellStats({items:{thorn:3},evolved:[]},'thorn').damage);
 assert.ok(s.cooldown<.85);assert.ok(s.area>.2);
});
const target=(x,z)=>{const mesh=new T.Group();mesh.position.set(x,0,z);return{mesh,hp:100000,boss:false};};
check('Every spell and evolution deals damage through its real combat engine',()=>{
 for(const id of WEAPONS)for(const evolved of [false,true]){
  const scene=new T.Scene(),engine=new SpellEngine(scene),player=new T.Vector3();
  const b={items:{[id]:3},evolved:evolved?[id]:[]};
  const targets=Array.from({length:12},(_,i)=>target(Math.cos(i/12*Math.PI*2)*(id === 'petal' ? spellStats(b,id).area : 2.7),Math.sin(i/12*Math.PI*2)*(id === 'petal' ? spellStats(b,id).area : 2.7)));
  let damage=0;
  for(let f=0;f<240;f++)engine.update(1/60,player,b,18,targets,(t,n)=>{assert.ok(Number.isFinite(n)&&n>0);t.hp-=n;damage+=n;});
  assert.ok(damage>0,id+' must hit enemies');
  assert.ok(scene.children[0].children.length<150,'Effects remain bounded');
  engine.clear();assert.equal(scene.children[0].children.length,0);assert.equal(engine.healingAt(player),0);engine.dispose();assert.equal(scene.children.length,0);
 }
});
check('Dream Garden slows enemies and heals only inside its patches',()=>{
 const engine=new SpellEngine(new T.Scene()),t=target(.5,0),b={items:{spore:3,dew:1},evolved:['spore']};
 engine.update(.016,new T.Vector3(),b,18,[t],()=>{});
 assert.equal(engine.speedMultiplier(t),.65);assert.equal(engine.healingAt(new T.Vector3()),3);
 assert.equal(engine.healingAt(new T.Vector3(20,0,20)),0);engine.clear();assert.equal(engine.speedMultiplier(t),1);engine.dispose();
});
check('A 90-second moving-player simulation can reach an evolution',()=>{
 const engine=new SpellEngine(new T.Scene()),b=freshBuild();choose(b,'petal');
 let enemies=[],spawn=0,kills=0,xp=0,level=1;
 let seed=41;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 for(let frame=0;frame<5400;frame++){
  const time=frame/60,player=new T.Vector3(Math.cos(time*.6)*7,0,Math.sin(time*.6)*7);
  spawn-=1/60;
  if(spawn<=0&&enemies.length<55){const a=rng()*Math.PI*2;const t=target(player.x+Math.cos(a)*12,player.z+Math.sin(a)*12);t.hp=30+time*.18;enemies.push(t);spawn=Math.max(.32,.85-time*.005);}
  for(const e of enemies){e.mesh.position.addScaledVector(player.clone().sub(e.mesh.position).normalize(),2/60);}
  engine.update(1/60,player,b,18,enemies,(e,n)=>{e.hp-=n;if(e.hp<=0){kills++;xp++;}});
  enemies=enemies.filter(e=>e.hp>0);
  while(xp>=xpNeeded(level)){
   xp-=xpNeeded(level);level++;
   const choices=draftChoices(b,rng);
   const c=choices.find(c=>c.kind==='evolution')??choices.find(c=>c.id==='thorn')??choices.find(c=>c.id==='sun')??choices.find(c=>c.id==='petal')??choices[0];
   applyChoice(b,c);
  }
 }
 assert.ok(kills>=25,'Enough kills for equipment progression: '+kills);
 console.log('  Pacing: '+kills+' kills, level '+level+', build '+JSON.stringify(b));
 assert.ok(b.evolved.length>0,'A focused build should evolve during one run');
 assert.ok(level>=6&&level<=12,'Level-ups should be spaced out over the run: '+level);
 console.log('  Simulated '+kills+' kills, level '+level+', evolved '+b.evolved.join(', '));
 engine.dispose();
});
console.log(passed+' equipment and combat checks passed.');



const {WildseedGame}=await import('../lib/game/scene.ts');
check('Level-up choices consume queued XP without losing levels or accepting stale clicks',()=>{
 const queuedXp=xpNeeded(1)+xpNeeded(2)+xpNeeded(3)+1;
 const b=freshBuild(),game=Object.assign(Object.create(WildseedGame.prototype),{
  farm:{progress:{seen:[],wins:{},upgrades:{},challenges:[],bonusHarvests:0}},mode:'dungeon',upgrade:true,build:b,choices:[eligibleChoices(b).find(c=>c.id==='thorn')],
  xp:queuedXp,level:1,hp:80,maxHp:135,baseMaxHp:135,keys:new Set(),sound:()=>{},emit:()=>{},toast:()=>{}
 });
 game.chooseUpgrade('heal');assert.equal(b.items.thorn,1);assert.equal(game.xp,queuedXp);
 let picks=0;while(game.upgrade&&picks++<10)game.chooseUpgrade(game.choices[0].id);
 assert.equal(game.level,4);assert.equal(game.xp,1);assert.equal(game.upgrade,false);
 const before=JSON.stringify(game.build);game.chooseUpgrade('thorn');assert.equal(JSON.stringify(game.build),before);
 const dew=eligibleChoices(b).find(c=>c.id==='dew');if(dew){game.choices=[dew];game.upgrade=true;const oldHp=game.hp,oldMax=game.maxHp;game.chooseUpgrade('dew');assert.equal(game.maxHp,oldMax+12);assert.equal(game.hp,oldHp+12);}
});


check('New weapons appear in drafts and passive buffs reach their live modifiers',()=>{
 const b=freshBuild();
 for(let i=0;i<30;i++){const choices=draftChoices(b,()=>i/30);assert.ok(choices.some(c=>c.kind==='spell'&&c.id!=='thorn'));}
 b.items={thorn:1,armor:3,boots:3,magnet:3,focus:3,duration:3,fortune:3};
 const m=modifiers(b);assert.equal(m.armor,.24);assert.equal(m.speed,1.24);assert.equal(m.magnet,4.5);assert.ok(Math.abs(m.crit-.3)<1e-9);assert.equal(m.duration,1.75);assert.equal(m.luck,.09);
});
check('Frost chills temporarily, void pulls, and clearing removes status effects',()=>{
 const scene=new T.Scene(),engine=new SpellEngine(scene),p=new T.Vector3(),target={mesh:new T.Group(),hp:10000,boss:false,radius:.5};target.mesh.position.set(2,0,0);
 engine.update(.05,p,{items:{frost:1},evolved:[]},10,[target],()=>{});assert.equal(engine.speedMultiplier(target),.45);
 engine.clear();assert.equal(engine.speedMultiplier(target),1);
 const second={mesh:new T.Group(),hp:10000,boss:false,radius:.5};second.mesh.position.set(3,0,0);
 engine.update(.05,p,{items:{void:1},evolved:[]},10,[target,second],()=>{});assert.ok(second.mesh.position.x<3);
 engine.dispose();assert.equal(scene.children.length,0);
});

check('Fast projectiles hit the closest crossed enemy regardless of spawn order',()=>{
 const scene=new T.Scene(),engine=new SpellEngine(scene),near={mesh:new T.Group(),hp:100,boss:false,radius:.5},far={mesh:new T.Group(),hp:100,boss:false,radius:.5};
 near.mesh.position.set(0,0,3);far.mesh.position.set(0,0,6);const hits=[];
 engine.update(.3,new T.Vector3(),{items:{cannon:1},evolved:[]},10,[far,near],t=>hits.push(t));
 assert.deepEqual(hits,[near]);engine.dispose();
});
