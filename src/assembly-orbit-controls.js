import {Vector3} from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const orbitUp=new Vector3(0,1,0);

// Assembly views can turn over or stand upright. OrbitControls caches these
// transforms at construction, so refresh them before it interprets a drag or
// updates a camera whose up vector is changing during a view transition.
export class AssemblyOrbitControls extends OrbitControls {
 update(deltaTime=null){
  this._quat.setFromUnitVectors(this.object.up,orbitUp);
  this._quatInverse.copy(this._quat).invert();
  return super.update(deltaTime);
 }
}
