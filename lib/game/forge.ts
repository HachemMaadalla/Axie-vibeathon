export type ForgePhase='heat'|'strike'|'quench'|'done';
export class ForgeRun{
 phase:ForgePhase='heat';heat=.18;held=false;elapsed=0;hits:number[]=[];quench=0;
 get target(){return [.3,.7,.45,.62,.38][this.hits.length]??.5;}
 get cursor(){return .5+Math.sin(this.elapsed*(4.2+this.hits.length*.4)-Math.PI/2)*.46;}
 get score(){return Math.min(3,(this.hits.reduce((a,b)=>a+b,0)+this.quench)/2);}
 tick(dt:number){dt=Math.max(0,Math.min(.05,dt));if(this.phase==='done')return;this.elapsed+=dt;
 if(this.phase==='heat')this.heat=Math.max(0,Math.min(1,this.heat+dt*(this.held?.38:-.04)));
 if(this.phase==='strike'){this.heat=Math.max(0,this.heat-dt*.075);if(this.elapsed>=3.5)this.strike(true);}
 if(this.phase==='quench'){this.heat=Math.max(0,this.heat-dt*.2);if(this.heat<=0)this.finish(true);}
 }
 press(){if(this.phase==='heat')this.held=true;else if(this.phase==='strike')this.strike();else if(this.phase==='quench')this.finish();}
 release(){if(!this.held)return;this.held=false;if(this.phase==='heat'&&this.heat>=.25){this.phase='strike';this.elapsed=0;}}
 strike(miss=false){if(this.phase!=='strike')return;const aim=Math.max(0,1-Math.abs(this.cursor-this.target)/.18),temperature=Math.max(0,1-Math.abs(this.heat-.72)/.32);this.hits.push(miss?0:aim*temperature);this.elapsed=0;this.phase=this.hits.length===5?'quench':'heat';if(this.phase==='quench')this.heat=.95;}
 finish(miss=false){if(this.phase!=='quench')return;this.quench=miss?0:Math.max(0,1-Math.abs(this.heat-.4)/.22);this.phase='done';this.held=false;}
}
