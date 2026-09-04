export type CombatSound='cast'|'hit'|'kill'|'hurt'|'storm'|'meteor'|'dash'|'cannon'|'slash'|'sword'|'axe'|'hammer'|'xp'|'pickup'|'levelup'|'evolve'|'jump'|'land';
const CLIPS:Partial<Record<CombatSound,[string,number,number]>>={
 cast:['plant_projectile_attack',.16,.32],hit:['plant_projectile_hit',.11,.2],kill:['beast_smash_attack',.15,.3],
 hurt:['beast_bite_attack',.22,.4],storm:['mech_cast_hit',.2,.38],meteor:['mech_projectile_hit',.23,.48],
 dash:['beast_fly',.13,.22],cannon:['mech_projectile_attack',.22,.38],slash:['beast_slash_attack',.18,.28],
 sword:['beast_slash_attack',.17,.2],axe:['beast_slash_attack',.22,.34],
 hammer:['mech_smash_attack',.24,.45],pickup:['leaf',.12,.25],levelup:['power_gain',.23,.8],evolve:['power_awaken',.28,1.1]
};
export const pickupPitch=(chain:number)=>[0,2,4,7,9,12,14,16,19,21,24,26][Math.min(11,Math.max(0,chain))];
export class CombatAudio{
 private context:AudioContext|null=null;private output:GainNode|null=null;private last=new Map<string,number>();
 private buffers=new Map<string,AudioBuffer>();private sources=new Set<AudioScheduledSourceNode>();private loading=false;private disposed=false;
 private chain=0;private lastPickup=-10;private _muted=true;private volume=.7;
 get muted(){return this._muted;}
 set muted(value:boolean){this._muted=value;if(this.output&&this.context)this.output.gain.setValueAtTime(value?0:this.volume,this.context.currentTime);}
 setVolume(value:number){this.volume=Math.max(0,Math.min(1,Number.isFinite(value)?value:.7));this.muted=this._muted;}
 enable(){
  if(this.disposed)return;this.muted=false;
  if(!this.context){
   const ctx=this.context=new AudioContext(),compressor=ctx.createDynamicsCompressor();
   compressor.threshold.value=-16;compressor.knee.value=12;compressor.ratio.value=4;compressor.attack.value=.003;compressor.release.value=.18;
   this.output=ctx.createGain();this.output.gain.value=this.volume;this.output.connect(compressor);compressor.connect(ctx.destination);
  }
  void this.context.resume().catch(()=>{});void this.load();
 }
 private async load(){
  if(this.loading||!this.context)return;this.loading=true;const ctx=this.context;
  await Promise.allSettled([...new Set(Object.values(CLIPS).map(s=>s![0]))].map(async name=>{
   const response=await fetch('/assets/audio/'+name+'.wav');if(!response.ok)return;
   const buffer=await ctx.decodeAudioData(await response.arrayBuffer());if(this.disposed)return;
   // Normalize quiet and loud source files consistently before the mixer.
   let peak=0;for(let channel=0;channel<buffer.numberOfChannels;channel++){const data=buffer.getChannelData(channel);for(let i=0;i<data.length;i++)peak=Math.max(peak,Math.abs(data[i]));}
   if(peak>0)for(let channel=0;channel<buffer.numberOfChannels;channel++){const data=buffer.getChannelData(channel);for(let i=0;i<data.length;i++)data[i]*=.8/peak;}
   let start=buffer.length;for(let channel=0;channel<buffer.numberOfChannels;channel++){const data=buffer.getChannelData(channel);for(let i=0;i<start;i++)if(Math.abs(data[i])>.025){start=i;break;}}
   start=Math.max(0,Math.min(buffer.length-1,start)-Math.round(ctx.sampleRate*.003));
   const trimmed=ctx.createBuffer(buffer.numberOfChannels,buffer.length-start,buffer.sampleRate);
   for(let channel=0;channel<buffer.numberOfChannels;channel++)trimmed.copyToChannel(buffer.getChannelData(channel).subarray(start),channel);
   this.buffers.set(name,trimmed);
  }));
 }
 play(kind:CombatSound){
  const ctx=this.context;if(this.muted||!ctx||ctx.state!=='running'||!this.output||this.disposed)return;
  const now=ctx.currentTime,spacing=kind==='xp'?.035:kind==='hit'?.065:kind==='kill'?.07:kind==='cast'?.09:.1;
  if(now-(this.last.get(kind)??-10)<spacing)return;this.last.set(kind,now);
  const important=kind==='hurt'||kind==='levelup'||kind==='evolve';
  if(this.sources.size>=(important?18:12))return;
  let pitch=1;
  if(kind==='xp'){this.chain=now-this.lastPickup<.45?Math.min(11,this.chain+1):0;this.lastPickup=now;pitch=2**(pickupPitch(this.chain)/12);}
  else pitch=(kind==='sword'?1.2:kind==='axe'?.8:.94)+Math.random()*.1;
  const clip=CLIPS[kind],buffer=clip&&this.buffers.get(clip[0]),gain=ctx.createGain();
  if(buffer){
   const source=ctx.createBufferSource();source.buffer=buffer;source.playbackRate.value=pitch;
   const duration=Math.min(buffer.duration/pitch,clip[2]),volume=clip[1];
   gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.006);gain.gain.setValueAtTime(volume,now+Math.max(.007,duration-.065));gain.gain.linearRampToValueAtTime(0,now+duration);
   source.connect(gain);gain.connect(this.output);this.track(source,gain);source.start(now);source.stop(now+duration+.01);return;
  }
  const source=ctx.createOscillator(),duration=kind==='xp'?.09:kind==='land'?.1:.14;
  source.type=kind==='xp'||kind==='levelup'?'sine':'triangle';
  const base=kind==='xp'?520*pitch:kind==='jump'?440:kind==='land'?85:kind==='hurt'?115:kind==='hammer'||kind==='meteor'?125:kind==='kill'?240:410;
  source.frequency.setValueAtTime(base,now);source.frequency.exponentialRampToValueAtTime(base*(kind==='xp'?1.015:kind==='jump'?1.5:.38),now+duration);
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(kind==='xp'?.09:.12,now+.004);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
  source.connect(gain);gain.connect(this.output);this.track(source,gain);source.start(now);source.stop(now+duration+.01);
 }
 private track(source:AudioScheduledSourceNode,gain:GainNode){this.sources.add(source);source.onended=()=>{this.sources.delete(source);source.disconnect();gain.disconnect();};}
 dispose(){this.disposed=true;for(const source of this.sources)try{source.stop();}catch{}this.sources.clear();this.buffers.clear();void this.context?.close();}
}
