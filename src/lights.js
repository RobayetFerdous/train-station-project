import { AmbientLight, DirectionalLight } from 'three'

export function createLights() {
  // Ambient light fills the scene, while directional light acts like the sun.
  const ambientLight = new AmbientLight(0xffffff, 1.8)

  const directionalLight = new DirectionalLight(0xfff1d8, 3)
  directionalLight.position.set(18, 32, 12)

  return { ambientLight, directionalLight }
}
