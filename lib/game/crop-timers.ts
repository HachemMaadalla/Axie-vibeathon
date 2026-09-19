import * as T from 'three';
import {cropSecondsRemaining,type FarmState} from './state';
import {plotPosition} from './farming';
import {projectPopup} from './action-feedback';
export class CropTimers{
 private root:HTMLDivElement;private labels:HTMLDivElement[]=[];
 constructor(private container:HTMLElement){this.root=document.createElement('div');this.root.className='crop-timers';container.appendChild(this.root);}
 update(camera:T.Camera,farm:FarmState,visible:boolean){
  this.root.hidden=!visible;if(!visible)return;
  farm.plots.forEach((plot,index)=>{
   let label=this.labels[index];if(!label){label=document.createElement('div');label.className='crop-timer';this.labels[index]=label;this.root.appendChild(label);}
   if(!plot.crop){label.hidden=true;return;}
   const point=plotPosition(index);point.y+=1.65;
   const p=projectPopup(point,camera,{left:0,top:0,width:this.container.clientWidth,height:this.container.clientHeight});
   label.hidden=!p.visible;if(!p.visible)return;
   const seconds=cropSecondsRemaining(farm,plot);
   const text=plot.growth>=1?'✓':!plot.watered?'Water':seconds>=60?Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'):seconds+'s';
   if(label.textContent!==text)label.textContent=text;
   label.dataset.state=plot.growth>=1?'ready':!plot.watered?'dry':'growing';
   label.setAttribute('aria-label',plot.growth>=1?'Ready to harvest':!plot.watered?'Needs water':seconds+' seconds to harvest');
   label.style.transform='translate('+Math.round(p.x)+'px,'+Math.round(p.y)+'px) translate(-50%,-100%)';
  });
 }
 dispose(){this.root.remove();}
}