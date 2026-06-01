import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export function createOrbitControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement)
  controls.enableDamping = true
  controls.minDistance = 12
  controls.maxDistance = 110
  controls.maxPolarAngle = Math.PI * 0.48
  controls.target.set(0, 4, 6)
  return controls
}