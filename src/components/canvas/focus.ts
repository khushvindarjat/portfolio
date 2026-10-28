import * as THREE from "three";

/** World-space point the camera flies to when a project panel is opened. */
export const focus = {
  active: false,
  pos: new THREE.Vector3(),
  scale: 1,
};
