// Motion is authored from instruction arrows and numbered detail panels.
// Offsets are in assembly coordinates, never part-local coordinates.
export function motionProgress(start,now,duration=550){
 const t=Math.max(0,Math.min(1,(now-start)/duration));
 return 1-Math.pow(1-t,3);
}
export function stagedOffset(motion,partId,count,starts,now){
 if(!motion)return [0,0,0];
 // Nested placements contribute independent assembly-space offsets. Removing the
 // inner offset snaps that group onto the still-staged parent, preserving both
 // groups' relative poses until the parent's later placement action.
 return motion.actions.reduce((offset,action,placement)=>{
  if(action.type!=='place'||!action.parts.includes(partId))return offset;
  const remaining=count<=placement?1:1-motionProgress(starts[placement],now);
  const stage=action.stagingOffset??motion.stagingOffset??[0,0,0];
  return offset.map((v,i)=>v+stage[i]*remaining);
 },[0,0,0]);
}
export function stagingEndpoints(motion,partId){
 if(!motion)return [[0,0,0]];
 const settledStarts=motion.actions.map(()=>-550);
 return Array.from({length:motion.actions.length+1},(_,count)=>stagedOffset(motion,partId,count,settledStarts,0));
}
