import {
  Box3,
  Color,
  DoubleSide,
  Group,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const loader = new GLTFLoader()

function prepareMaterial(material) {
  material.side = DoubleSide

  if (material.map) {
    material.map.colorSpace = SRGBColorSpace
    material.map.needsUpdate = true
  }

  if (material.emissive) {
    material.emissive = material.emissive.clone ? material.emissive.clone() : new Color(material.emissive)
  }

  material.needsUpdate = true
}

export function prepareLoadedModel(root) {
  root.traverse((object) => {
    if (!object.isMesh) {
      return
    }

    object.castShadow = true
    object.receiveShadow = true

    if (Array.isArray(object.material)) {
      for (const material of object.material) {
        prepareMaterial(material)
      }
      return
    }

    if (object.material) {
      prepareMaterial(object.material)
    }
  })

  return root
}

export function groundAndCenterModel(model) {
  const bounds = new Box3().setFromObject(model)
  const center = new Vector3()
  bounds.getCenter(center)

  model.position.x -= center.x
  model.position.z -= center.z
  model.position.y -= bounds.min.y

  return model
}

export function placeModelOnSurface(model, surfaceY) {
  const bounds = new Box3().setFromObject(model)
  model.position.y += surfaceY - bounds.min.y
  return model
}

export function fitModelToLength(model, targetLength) {
  const bounds = new Box3().setFromObject(model)
  const size = new Vector3()
  bounds.getSize(size)

  const longestAxis = Math.max(size.x, size.z)
  if (longestAxis > 0) {
    model.scale.setScalar(targetLength / longestAxis)
  }

  return model
}

export function orientTrainAlongTracks(model) {
  const bounds = new Box3().setFromObject(model)
  const size = new Vector3()
  bounds.getSize(size)

  if (size.z > size.x) {
    model.rotation.y = Math.PI / 2
  }

  return model
}

async function loadGLB(url) {
  const gltf = await loader.loadAsync(url)
  const root = gltf.scene || gltf.scenes[0] || new Group()
  return prepareLoadedModel(root)
}

export async function loadTrainAndStationModels() {
  const [train, station] = await Promise.all([
    loadGLB('/models/train.glb'),
    loadGLB('/models/station.glb'),
  ])

  train.name = 'TrainModel'
  station.name = 'StationModel'

  return { train, station }
}