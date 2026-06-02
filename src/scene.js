import {
	AmbientLight,
	BoxGeometry,
	Box3,
	Color,
	CylinderGeometry,
	DirectionalLight,
	DoubleSide,
	Fog,
	Group,
	Mesh,
	Clock,
	PerspectiveCamera,
	SpotLight,
	PlaneGeometry,
	Scene,
	MeshStandardMaterial,
	PCFSoftShadowMap,
	SRGBColorSpace,
	Vector3,
	WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
	fitModelToLength,
	groundAndCenterModel,
	loadTrainAndStationModels,
	placeModelOnSurface,
	orientTrainAlongTracks,
} from './modelLoader.js'

const CAMERA_MODE = {
	FREE: 'free',
	FOLLOW: 'follow',
}

const ENVIRONMENT_MODE = {
	DAY: 'day',
	NIGHT: 'night',
}

const ENVIRONMENT_PRESETS = {
	[ENVIRONMENT_MODE.DAY]: {
		skyColor: 0xaed8ff,
		fogColor: 0xaed8ff,
		fogNear: 32,
		fogFar: 95,
		ambientColor: 0xffffff,
		ambientIntensity: 1.8,
		directionalColor: 0xfff1d8,
		directionalIntensity: 3,
		directionalPosition: [18, 32, 12],
		headlightIntensity: 5.2,
		headlightLensIntensity: 2.2,
	},
	[ENVIRONMENT_MODE.NIGHT]: {
		skyColor: 0x050b18,
		fogColor: 0x071120,
		fogNear: 26,
		fogFar: 78,
		ambientColor: 0x8ea8df,
		ambientIntensity: 0.62,
		directionalColor: 0xb7c9ff,
		directionalIntensity: 0.78,
		directionalPosition: [-18, 26, -22],
		headlightIntensity: 8.4,
		headlightLensIntensity: 3.4,
	},
}

function getEnvironmentPreset(mode) {
	return ENVIRONMENT_PRESETS[mode] ?? ENVIRONMENT_PRESETS[ENVIRONMENT_MODE.DAY]
}

function applySceneAtmosphere(scene, mode) {
	const preset = getEnvironmentPreset(mode)
	scene.background = new Color(preset.skyColor)
	scene.fog = new Fog(preset.fogColor, preset.fogNear, preset.fogFar)
}

function createSky(scene, mode = ENVIRONMENT_MODE.DAY) {
	applySceneAtmosphere(scene, mode)
}

function createGround(scene) {
	const ground = new Mesh(
		new PlaneGeometry(220, 220),
		new MeshStandardMaterial({ color: 0x7f766b, roughness: 1, metalness: 0, side: DoubleSide }),
	)
	ground.rotation.x = -Math.PI / 2
	ground.position.y = -0.01
	ground.receiveShadow = true
	scene.add(ground)
}

function createRailwayTracks(scene) {
	const tracks = new Group()
	tracks.name = 'RailwayTracks'

	const ballast = new Mesh(
		new BoxGeometry(96, 0.28, 6.6),
		new MeshStandardMaterial({ color: 0x6c6257, roughness: 1, metalness: 0 }),
	)
	ballast.position.y = 0.11
	ballast.receiveShadow = true
	tracks.add(ballast)

	const sleeperMaterial = new MeshStandardMaterial({
		color: 0x594132,
		roughness: 1,
		metalness: 0,
	})

	for (let index = -22; index <= 22; index += 1) {
		const sleeper = new Mesh(
			new BoxGeometry(2.8, 0.12, 0.22),
			sleeperMaterial,
		)
		sleeper.position.set(index * 2.05, 0.19, 0)
		sleeper.castShadow = true
		sleeper.receiveShadow = true
		tracks.add(sleeper)
	}

	const railMaterial = new MeshStandardMaterial({
		color: 0xaeb7be,
		metalness: 0.9,
		roughness: 0.22,
	})

	for (const z of [-1.25, 1.25]) {
		const rail = new Mesh(new BoxGeometry(96, 0.08, 0.12), railMaterial)
		rail.position.set(0, 0.46, z)
		rail.castShadow = true
		rail.receiveShadow = true
		tracks.add(rail)
	}

	tracks.position.set(-18, 0, -8)
	tracks.rotation.y = -0.32
	scene.add(tracks)
	return tracks
}

function createRenderer(container) {
	const renderer = new WebGLRenderer({ antialias: true, alpha: true })
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
	renderer.setSize(container.clientWidth, container.clientHeight)
	renderer.outputColorSpace = SRGBColorSpace
	renderer.shadowMap.enabled = true
	renderer.shadowMap.type = PCFSoftShadowMap
	container.appendChild(renderer.domElement)
	return renderer
}

export function createTrainStationScene(container) {
	const scene = new Scene()
	const environmentMode = {
		current: ENVIRONMENT_MODE.DAY,
	}
	createSky(scene, environmentMode.current)
	createGround(scene)
	const tracks = createRailwayTracks(scene)

	const assetGroup = new Group()
	scene.add(assetGroup)

	const camera = new PerspectiveCamera(
		45,
		container.clientWidth / container.clientHeight,
		0.1,
		500,
	)
	camera.position.set(32, 20, 34)

	const renderer = createRenderer(container)

	const ambientLight = new AmbientLight(0xffffff, 1.8)
	scene.add(ambientLight)

	const directionalLight = new DirectionalLight(0xfff1d8, 3)
	directionalLight.position.set(18, 32, 12)
	directionalLight.castShadow = true
	directionalLight.shadow.mapSize.set(2048, 2048)
	directionalLight.shadow.camera.near = 1
	directionalLight.shadow.camera.far = 120
	directionalLight.shadow.camera.left = -50
	directionalLight.shadow.camera.right = 50
	directionalLight.shadow.camera.top = 50
	directionalLight.shadow.camera.bottom = -50
	scene.add(directionalLight)

	function updateTrainHeadlightLighting() {
		if (!trainMotion.headlight) {
			return
		}

		const preset = getEnvironmentPreset(environmentMode.current)
		const { beam, lensMaterial } = trainMotion.headlight.userData
		const isOn = beam ? beam.visible : trainMotion.headlight.visible

		if (beam) {
			beam.intensity = preset.headlightIntensity
		}

		if (lensMaterial) {
			lensMaterial.emissiveIntensity = isOn ? preset.headlightLensIntensity : 0.1
		}
	}

	function setEnvironmentMode(mode) {
		const nextMode = mode === ENVIRONMENT_MODE.NIGHT ? ENVIRONMENT_MODE.NIGHT : ENVIRONMENT_MODE.DAY
		const preset = getEnvironmentPreset(nextMode)

		environmentMode.current = nextMode
		applySceneAtmosphere(scene, nextMode)
		ambientLight.color.set(preset.ambientColor)
		ambientLight.intensity = preset.ambientIntensity
		directionalLight.color.set(preset.directionalColor)
		directionalLight.intensity = preset.directionalIntensity
		directionalLight.position.set(...preset.directionalPosition)
		updateTrainHeadlightLighting()

		return environmentMode.current
	}

	function toggleEnvironmentMode() {
		return setEnvironmentMode(environmentMode.current === ENVIRONMENT_MODE.DAY ? ENVIRONMENT_MODE.NIGHT : ENVIRONMENT_MODE.DAY)
	}

	const controls = new OrbitControls(camera, renderer.domElement)
	controls.target.set(0, 4, 6)
	controls.enableDamping = true
	controls.minDistance = 12
	controls.maxDistance = 110
	controls.maxPolarAngle = Math.PI * 0.48
	controls.update()

	const cameraMode = {
		current: CAMERA_MODE.FREE,
	}

	const followCamera = {
		position: new Vector3(),
		target: new Vector3(),
	}

	const cinematicCamera = {
		station: null,
		angle: 0,
		radius: 42,
		height: 18,
		lookOffset: new Vector3(0, 1.8, 0),
		cameraPosition: new Vector3(),
		trainLookTarget: new Vector3(),
		stationCenter: new Vector3(),
		isUserControlling: false,
		mouseControlling: false,
		keyboardControlling: false,
	}

	const keyboardState = {
		forward: false,
		backward: false,
		left: false,
		right: false,
		angleDown: false,
		angleUp: false,
	}

	let trainAnimationPaused = false

	const trainMotion = {
		train: null,
		headlight: null,
		state: 'outside',
		elapsed: 0,
		outsidePosition: -78,
		insidePosition: -8,
		exitPosition: 78,
		approachDuration: 9,
		departDuration: 9,
		stopDuration: 3,
	}

	function resetTrainMotion() {
		if (!trainMotion.train) {
			return
		}

		trainMotion.state = 'entering'
		trainMotion.elapsed = 0
		trainMotion.train.position.x = trainMotion.outsidePosition
		trainMotion.train.position.y = 0
		trainMotion.train.position.z = 0
	}

	function getTrainRailPoint(xOffset, yOffset, zOffset, target) {
		if (!trainMotion.train) {
			return null
		}

		target.set(
			trainMotion.train.position.x + xOffset,
			trainMotion.train.position.y + yOffset,
			trainMotion.train.position.z + zOffset,
		)

		if (trainMotion.train.parent) {
			trainMotion.train.parent.localToWorld(target)
		} else {
			trainMotion.train.localToWorld(target)
		}

		return target
	}

	function syncFollowCamera({ immediate = false, deltaTime = 0 } = {}) {
		if (!trainMotion.train) {
			return
		}

		getTrainRailPoint(-15, 7.2, 6.8, followCamera.position)
		getTrainRailPoint(10, 2.8, 0, followCamera.target)

		if (immediate) {
			camera.position.copy(followCamera.position)
			controls.target.copy(followCamera.target)
		} else {
			const positionAlpha = Math.min(1, deltaTime * 3.4)
			const targetAlpha = Math.min(1, deltaTime * 4.6)
			camera.position.lerp(followCamera.position, positionAlpha)
			controls.target.lerp(followCamera.target, targetAlpha)
		}

		camera.lookAt(controls.target)
		controls.update()
	}

	function setCameraMode(mode) {
		const nextMode = mode === CAMERA_MODE.FOLLOW ? CAMERA_MODE.FOLLOW : CAMERA_MODE.FREE
		cameraMode.current = nextMode
		controls.enabled = nextMode === CAMERA_MODE.FREE

		if (nextMode === CAMERA_MODE.FOLLOW) {
			cinematicCamera.mouseControlling = false
			cinematicCamera.keyboardControlling = false
			cinematicCamera.isUserControlling = false
			syncFollowCamera({ immediate: true })
		}

		return cameraMode.current
	}

	function toggleCameraMode() {
		return setCameraMode(cameraMode.current === CAMERA_MODE.FREE ? CAMERA_MODE.FOLLOW : CAMERA_MODE.FREE)
	}

	function updateFollowCamera(deltaTime) {
		if (cameraMode.current !== CAMERA_MODE.FOLLOW) {
			return
		}

		syncFollowCamera({ deltaTime })
	}

	function moveCameraForward(distance) {
		const direction = new Vector3()
		camera.getWorldDirection(direction)
		direction.y = 0
		direction.normalize()

		const offset = direction.multiplyScalar(distance)
		camera.position.add(offset)
		controls.target.add(offset)
	}

	function moveCameraSideways(distance) {
		const direction = new Vector3()
		camera.getWorldDirection(direction)
		direction.y = 0
		direction.normalize()

		const offset = direction.cross(new Vector3(0, 1, 0)).multiplyScalar(distance)
		camera.position.add(offset)
		controls.target.add(offset)
	}

	function tiltCamera(angle) {
		const offset = camera.position.clone().sub(controls.target)
		const horizontalDistance = Math.hypot(offset.x, offset.z)
		const minPolarAngle = Math.max(controls.minPolarAngle, 0.1)
		let polarAngle = Math.atan2(horizontalDistance, offset.y)
		polarAngle = Math.min(controls.maxPolarAngle, Math.max(minPolarAngle, polarAngle + angle))

		const radius = offset.length()
		const azimuth = Math.atan2(offset.x, offset.z)
		offset.set(
			radius * Math.sin(polarAngle) * Math.sin(azimuth),
			radius * Math.cos(polarAngle),
			radius * Math.sin(polarAngle) * Math.cos(azimuth),
		)
		camera.position.copy(controls.target).add(offset)
		camera.lookAt(controls.target)
	}

	function updateKeyboardCamera(deltaTime) {
		if (cameraMode.current !== CAMERA_MODE.FREE) {
			cinematicCamera.keyboardControlling = false
			cinematicCamera.isUserControlling = cinematicCamera.mouseControlling
			return
		}

		const moveSpeed = 12 * deltaTime
		const angleSpeed = 1.4 * deltaTime
		let keyboardActive = false

		if (keyboardState.forward) {
			moveCameraForward(moveSpeed)
			keyboardActive = true
		}

		if (keyboardState.backward) {
			moveCameraForward(-moveSpeed)
			keyboardActive = true
		}

		if (keyboardState.left) {
			moveCameraSideways(-moveSpeed)
			keyboardActive = true
		}

		if (keyboardState.right) {
			moveCameraSideways(moveSpeed)
			keyboardActive = true
		}

		if (keyboardState.angleDown) {
			tiltCamera(angleSpeed)
			keyboardActive = true
		}

		if (keyboardState.angleUp) {
			tiltCamera(-angleSpeed)
			keyboardActive = true
		}

		cinematicCamera.keyboardControlling = keyboardActive
		cinematicCamera.isUserControlling = cinematicCamera.mouseControlling || cinematicCamera.keyboardControlling
	}

	function createTrainHeadlight(train) {
		train.updateWorldMatrix(true, true)

		const railOrigin = new Vector3()
		const railForwardPoint = new Vector3(1, 0, 0)
		if (train.parent) {
			train.parent.localToWorld(railOrigin)
			train.parent.localToWorld(railForwardPoint)
		} else {
			train.localToWorld(railOrigin)
			train.localToWorld(railForwardPoint)
		}

		const railForward = railForwardPoint.sub(railOrigin).normalize()
		const headlightReferences = []
		train.traverse((object) => {
			if (!object.isMesh || !/external_lights/i.test(object.name)) {
				return
			}

			const referenceBox = new Box3().setFromObject(object)
			const worldCenter = new Vector3()
			referenceBox.getCenter(worldCenter)
			headlightReferences.push({
				localCenter: train.worldToLocal(worldCenter.clone()),
				score: worldCenter.dot(railForward),
			})
		})

		headlightReferences.sort((a, b) => b.score - a.score)
		const anchorPosition = headlightReferences[0]?.localCenter.clone() ?? new Vector3(0, 5, -40)
		const forwardSign = anchorPosition.z < 0 ? -1 : 1
		anchorPosition.y += 1.25
		anchorPosition.z += forwardSign * 0.55

		const headlightAssembly = new Group()
		headlightAssembly.name = 'EngineHeadlight'
		headlightAssembly.position.copy(anchorPosition)

		const rim = new Mesh(
			new CylinderGeometry(0.42, 0.48, 0.18, 40),
			new MeshStandardMaterial({
				color: 0x2c3237,
				metalness: 0.9,
				roughness: 0.22,
			}),
		)
		rim.rotation.x = Math.PI / 2
		rim.castShadow = true
		headlightAssembly.add(rim)

		const lensMaterial = new MeshStandardMaterial({
			color: 0xffefbf,
			emissive: 0xffd36c,
			emissiveIntensity: 2.2,
			metalness: 0.08,
			roughness: 0.12,
		})
		const lens = new Mesh(new CylinderGeometry(0.31, 0.31, 0.2, 40), lensMaterial)
		lens.rotation.x = Math.PI / 2
		lens.position.z = forwardSign * 0.04
		headlightAssembly.add(lens)

		const headlightBeam = new SpotLight(
			0xfff3c4,
			getEnvironmentPreset(environmentMode.current).headlightIntensity,
			62,
			Math.PI / 7,
			0.5,
			1.35,
		)
		headlightBeam.name = 'EngineHeadlightBeam'
		headlightBeam.position.copy(anchorPosition)
		headlightBeam.position.z += forwardSign * 0.12
		headlightBeam.target.position.copy(anchorPosition)
		headlightBeam.target.position.y -= 0.5
		headlightBeam.target.position.z += forwardSign * 70
		headlightBeam.castShadow = true
		headlightBeam.shadow.mapSize.set(1024, 1024)

		headlightAssembly.userData.beam = headlightBeam
		headlightAssembly.userData.lensMaterial = lensMaterial
		train.add(headlightAssembly)
		train.add(headlightBeam)
		train.add(headlightBeam.target)
		return headlightAssembly
	}

	function updateCinematicCamera(deltaTime) {
		if (!cinematicCamera.station || !trainMotion.train || cinematicCamera.isUserControlling) {
			return
		}

		cinematicCamera.angle += deltaTime * 0.22

		cinematicCamera.station.getWorldPosition(cinematicCamera.stationCenter)
		trainMotion.train.getWorldPosition(cinematicCamera.trainLookTarget)

		cinematicCamera.cameraPosition.set(
			cinematicCamera.stationCenter.x + Math.cos(cinematicCamera.angle) * cinematicCamera.radius,
			cinematicCamera.height,
			cinematicCamera.stationCenter.z + Math.sin(cinematicCamera.angle) * cinematicCamera.radius,
		)

		camera.position.lerp(cinematicCamera.cameraPosition, 0.06)
		controls.target.lerp(cinematicCamera.trainLookTarget, 0.12)
		camera.lookAt(controls.target)
		controls.update()
	}

	function toggleTrainHeadlight() {
		if (!trainMotion.headlight) {
			return
		}

		const { beam, lensMaterial } = trainMotion.headlight.userData
		const isOn = beam ? beam.visible : trainMotion.headlight.visible
		const nextIsOn = !isOn

		if (beam) {
			beam.visible = nextIsOn
		} else {
			trainMotion.headlight.visible = nextIsOn
		}

		if (lensMaterial) {
			lensMaterial.emissiveIntensity = nextIsOn
				? getEnvironmentPreset(environmentMode.current).headlightLensIntensity
				: 0.1
		}
	}

	function updateTrainMotion(deltaTime) {
		if (!trainMotion.train || trainAnimationPaused) {
			return
		}

		trainMotion.elapsed += deltaTime

		if (trainMotion.state === 'entering') {
			const progress = Math.min(trainMotion.elapsed / trainMotion.approachDuration, 1)
			trainMotion.train.position.x = trainMotion.outsidePosition + (trainMotion.insidePosition - trainMotion.outsidePosition) * progress

			if (progress >= 1) {
				trainMotion.state = 'stopped'
				trainMotion.elapsed = 0
				trainMotion.train.position.x = trainMotion.insidePosition
			}
			return
		}

		if (trainMotion.state === 'stopped') {
			trainMotion.train.position.x = trainMotion.insidePosition

			if (trainMotion.elapsed >= trainMotion.stopDuration) {
				trainMotion.state = 'leaving'
				trainMotion.elapsed = 0
			}
			return
		}

		if (trainMotion.state === 'leaving') {
			const progress = Math.min(trainMotion.elapsed / trainMotion.departDuration, 1)
			trainMotion.train.position.x = trainMotion.insidePosition + (trainMotion.exitPosition - trainMotion.insidePosition) * progress

			if (progress >= 1) {
				trainMotion.state = 'outside'
				trainMotion.elapsed = 0
				trainMotion.train.position.x = trainMotion.exitPosition
			}
			return
		}

		if (trainMotion.state === 'outside') {
			trainMotion.train.position.x = trainMotion.exitPosition
			trainMotion.state = 'entering'
			trainMotion.elapsed = 0
			trainMotion.train.position.x = trainMotion.outsidePosition
		}
	}

	let disposed = false
	loadTrainAndStationModels().then(({ train, station }) => {
		if (disposed) {
			return
		}

		orientTrainAlongTracks(train)
		fitModelToLength(train, 34)
		groundAndCenterModel(train)
		placeModelOnSurface(train, 0.46)
		train.rotation.y += Math.PI
		tracks.add(train)
		trainMotion.train = train
		trainMotion.headlight = createTrainHeadlight(train)
		updateTrainHeadlightLighting()
		resetTrainMotion()

		fitModelToLength(station, 24)
		groundAndCenterModel(station)
		placeModelOnSurface(station, 0.14)
		station.position.x = -25
		station.position.z = -10
		station.rotation.y = -Math.PI / 3.4
		assetGroup.add(station)
		cinematicCamera.station = station

		if (cameraMode.current === CAMERA_MODE.FOLLOW) {
			syncFollowCamera({ immediate: true })
		}
	})

	function resize() {
		const { clientWidth, clientHeight } = container
		if (clientWidth === 0 || clientHeight === 0) {
			return
		}

		camera.aspect = clientWidth / clientHeight
		camera.updateProjectionMatrix()
		renderer.setSize(clientWidth, clientHeight)
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
	}

	let frameId = 0
	const clock = new Clock()

	function animate() {
		const deltaTime = clock.getDelta()
		updateKeyboardCamera(deltaTime)
		updateTrainMotion(deltaTime)
		updateFollowCamera(deltaTime)

		if (cameraMode.current === CAMERA_MODE.FREE) {
			controls.update()
		}

		renderer.render(scene, camera)
		frameId = window.requestAnimationFrame(animate)
	}

	const resizeObserver = new ResizeObserver(resize)
	resizeObserver.observe(container)
	const handleKeyDown = (event) => {
		if (event.code === 'Space') {
			event.preventDefault()
			trainAnimationPaused = !trainAnimationPaused
			return
		}

		if (event.code === 'KeyL') {
			toggleTrainHeadlight()
			return
		}

		if (event.code === 'KeyW') {
			keyboardState.forward = true
			return
		}

		if (event.code === 'KeyS') {
			keyboardState.backward = true
			return
		}

		if (event.code === 'KeyA') {
			keyboardState.left = true
			return
		}

		if (event.code === 'KeyD') {
			keyboardState.right = true
			return
		}

		if (event.code === 'KeyQ') {
			keyboardState.angleDown = true
			return
		}

		if (event.code === 'KeyE') {
			keyboardState.angleUp = true
		}
	}
	const handleKeyUp = (event) => {
		if (event.code === 'KeyW') {
			keyboardState.forward = false
		}

		if (event.code === 'KeyS') {
			keyboardState.backward = false
		}

		if (event.code === 'KeyA') {
			keyboardState.left = false
		}

		if (event.code === 'KeyD') {
			keyboardState.right = false
		}

		if (event.code === 'KeyQ') {
			keyboardState.angleDown = false
		}

		if (event.code === 'KeyE') {
			keyboardState.angleUp = false
		}

		cinematicCamera.keyboardControlling =
			keyboardState.forward ||
			keyboardState.backward ||
			keyboardState.left ||
			keyboardState.right ||
			keyboardState.angleDown ||
			keyboardState.angleUp
		cinematicCamera.isUserControlling = cinematicCamera.mouseControlling || cinematicCamera.keyboardControlling
	}
	const handleControlsStart = () => {
		cinematicCamera.mouseControlling = true
		cinematicCamera.isUserControlling = true
	}
	const handleControlsEnd = () => {
		cinematicCamera.mouseControlling = false
		cinematicCamera.isUserControlling = cinematicCamera.keyboardControlling
	}
	window.addEventListener('resize', resize)
	window.addEventListener('keydown', handleKeyDown)
	window.addEventListener('keyup', handleKeyUp)
	controls.addEventListener('start', handleControlsStart)
	controls.addEventListener('end', handleControlsEnd)

	resize()
	animate()

	return {
		scene,
		camera,
		renderer,
		controls,
		getCameraMode() {
			return cameraMode.current
		},
		getEnvironmentMode() {
			return environmentMode.current
		},
		setCameraMode,
		toggleCameraMode,
		setEnvironmentMode,
		toggleEnvironmentMode,
		dispose() {
			disposed = true
			window.cancelAnimationFrame(frameId)
			resizeObserver.disconnect()
			window.removeEventListener('resize', resize)
			window.removeEventListener('keydown', handleKeyDown)
			window.removeEventListener('keyup', handleKeyUp)
			controls.removeEventListener('start', handleControlsStart)
			controls.removeEventListener('end', handleControlsEnd)
			controls.dispose()
			assetGroup.clear()
			renderer.dispose()
		},
	}
}
