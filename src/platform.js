import {
  BoxGeometry,
  CanvasTexture,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'

function createConcreteTexture() {
  // Draws a repeatable concrete tile texture directly on a canvas.
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024

  const context = canvas.getContext('2d')
  context.fillStyle = '#b9b3ab'
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (let row = 0; row < 16; row += 1) {
    for (let column = 0; column < 16; column += 1) {
      const size = 64
      const x = column * size
      const y = row * size
      const tint = 172 + ((row * 17 + column * 11) % 18)
      context.fillStyle = `rgb(${tint}, ${tint - 3}, ${tint - 8})`
      context.fillRect(x, y, size, size)

      context.fillStyle = 'rgba(255, 255, 255, 0.04)'
      context.fillRect(x + 3, y + 3, size - 6, size - 6)

      context.fillStyle = 'rgba(80, 78, 74, 0.12)'
      context.fillRect(x + 27, y, 2, size)
      context.fillRect(x, y + 27, size, 2)

      context.fillStyle = 'rgba(50, 48, 45, 0.1)'
      context.beginPath()
      context.arc(x + 18, y + 20, 2 + (row + column) % 2, 0, Math.PI * 2)
      context.fill()
      context.beginPath()
      context.arc(x + 44, y + 39, 1.5 + ((row + column) % 3) * 0.5, 0, Math.PI * 2)
      context.fill()
    }
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(5, 1)
  return texture
}

function createSignboard(text) {
  // Groups simple meshes into one station sign object.
  const board = new Group()

  const backPlate = new Mesh(
    new BoxGeometry(4.2, 1.2, 0.16),
    new MeshStandardMaterial({ color: 0x1c2530, roughness: 0.65, metalness: 0.2 }),
  )
  board.add(backPlate)

  const face = new Mesh(
    new BoxGeometry(4.05, 1.05, 0.08),
    new MeshBasicMaterial({ color: 0xece6d8 }),
  )
  face.position.z = 0.12
  board.add(face)

  const label = new Mesh(
    new BoxGeometry(3.3, 0.28, 0.06),
    new MeshBasicMaterial({ color: 0x1b1b1b }),
  )
  label.position.set(0, 0.02, 0.18)
  board.add(label)

  const post = new Mesh(
    new BoxGeometry(0.14, 1.4, 0.14),
    new MeshStandardMaterial({ color: 0x4f5b66, roughness: 0.7, metalness: 0.15 }),
  )
  post.position.y = -1.0
  board.add(post)

  board.userData.text = text
  return board
}

export function createStationPlatform() {
  // Builds a station platform from basic Three.js shapes.
  const station = new Group()

  const concreteTexture = createConcreteTexture()

  const mainPlatform = new Mesh(
    new BoxGeometry(24, 0.75, 6.5),
    new MeshStandardMaterial({
      color: 0xd7d2cb,
      map: concreteTexture,
      roughness: 1,
      metalness: 0,
      side: DoubleSide,
    }),
  )
  mainPlatform.position.set(0, 0.375, 0)
  station.add(mainPlatform)

  const edgeStrip = new Mesh(
    new BoxGeometry(24.25, 0.12, 0.24),
    new MeshStandardMaterial({ color: 0xf0c94f, roughness: 0.7, metalness: 0.05 }),
  )
  edgeStrip.position.set(0, 0.76, 3.3)
  station.add(edgeStrip)

  const safetyLine = new Mesh(
    new BoxGeometry(24, 0.04, 0.08),
    new MeshStandardMaterial({ color: 0xe8e6dd, roughness: 0.8 }),
  )
  safetyLine.position.set(0, 0.79, 2.95)
  station.add(safetyLine)

  const canopyRoof = new Mesh(
    new BoxGeometry(16, 0.32, 4.8),
    new MeshStandardMaterial({ color: 0x69727c, roughness: 0.8, metalness: 0.12 }),
  )
  canopyRoof.position.set(-2, 4.35, -0.8)
  station.add(canopyRoof)

  const canopySupports = [-6.2, -1.7, 2.8]
  for (const x of canopySupports) {
    const pillar = new Mesh(
      new BoxGeometry(0.26, 4.0, 0.26),
      new MeshStandardMaterial({ color: 0x58626b, roughness: 0.75, metalness: 0.08 }),
    )
    pillar.position.set(x, 2.2, -0.8)
    station.add(pillar)
  }

  const rearWall = new Mesh(
    new BoxGeometry(15.5, 3.8, 0.18),
    new MeshStandardMaterial({ color: 0xc7bfb3, roughness: 0.92, map: concreteTexture }),
  )
  rearWall.position.set(-2, 2.2, -3.25)
  station.add(rearWall)

  const signboard = createSignboard('CENTRAL STATION')
  signboard.position.set(3.8, 3.8, -3.15)
  station.add(signboard)

  const benchBase = new Mesh(
    new BoxGeometry(2.4, 0.18, 0.6),
    new MeshStandardMaterial({ color: 0x6e4c2d, roughness: 0.85 }),
  )
  benchBase.position.set(-7.2, 0.52, -1.4)
  station.add(benchBase)

  const benchBack = new Mesh(
    new BoxGeometry(2.4, 0.7, 0.12),
    new MeshStandardMaterial({ color: 0x7c5532, roughness: 0.82 }),
  )
  benchBack.position.set(-7.2, 0.96, -1.72)
  station.add(benchBack)

  return station
}
