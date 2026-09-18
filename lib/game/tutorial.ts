export type Lesson={step:'plant'|'water'|'grow'|'done'|'off';plot:number|null};
export type LessonAction={kind:'plant'|'water'|'harvest';plot:number};
export function advanceLesson(current:Lesson,action:LessonAction|undefined,plots:readonly {crop:unknown;watered:boolean}[]):Lesson{
 if(current.step==='off'||current.step==='done')return current;
 let next=current;
 if(current.step==='plant'&&action?.kind==='plant')next={step:'water',plot:action.plot};
 else if(action?.plot===current.plot&&current.step==='water'&&action.kind==='water')next={...current,step:'grow'};
 else if(action?.plot===current.plot&&current.step==='grow'&&action.kind==='harvest')return {...current,step:'done'};
 if(next.step==='water'||next.step==='grow'){
  const plot=next.plot===null?undefined:plots[next.plot];
  if(!plot?.crop)return {step:'plant',plot:null};
  if(next.step==='water'&&plot.watered)return {...next,step:'grow'};
  if(next.step==='grow'&&!plot.watered)return {...next,step:'water'};
 }
 return next;
}
