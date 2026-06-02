import {
	AmbientLight,
	BoxGeometry,
	Box3,
	CanvasTexture,
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
	RepeatWrapping,
	SRGBColorSpace,
	Vector3,
	WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
	fitModelToLength,
	groundAndCenterModel,
	loadTrainStationEnvironmentModels,
	placeModelOnSurface,
	orientTrainAlongTracks,
} from './modelLoader.js'

const CAMERA_MODE = {
	FREE: 'free',
	ORBIT: 'orbit',
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

const STREET_LIGHT_HEIGHT = 7.2
const STREET_LIGHT_TRACK_PLACEMENTS = [
	{ along: -78, side: -1, offset: 6.6, rotation: 0.08 },
	{ along: -54, side: -1, offset: 6.4, rotation: -0.05 },
	{ along: -30, side: -1, offset: 6.5, rotation: 0.04 },
	{ along: -6, side: -1, offset: 6.35, rotation: -0.03 },
	{ along: 18, side: -1, offset: 6.45, rotation: 0.06 },
	{ along: 42, side: -1, offset: 6.35, rotation: -0.04 },
	{ along: 66, side: -1, offset: 6.55, rotation: 0.02 },
]
const STREET_LIGHT_STATION_PLACEMENTS = [
	{ localX: -9.8, localZ: 5.15, rotation: Math.PI },
	{ localX: -3.4, localZ: 5.2, rotation: Math.PI + 0.04 },
	{ localX: 3.4, localZ: 5.2, rotation: Math.PI - 0.04 },
	{ localX: 9.8, localZ: 5.15, rotation: Math.PI },
]
const STREET_LIGHTING_PRESETS = {
	[ENVIRONMENT_MODE.DAY]: {
		spotIntensity: 0,
	},
	[ENVIRONMENT_MODE.NIGHT]: {
		spotIntensity: 4.8,
	},
}

const STREET_LIGHT_HEADS = [
	{
		position: new Vector3(-0.72, STREET_LIGHT_HEIGHT * 0.82, 0),
		target: new Vector3(-2.25, 0, 1.05),
	},
	{
		position: new Vector3(0.72, STREET_LIGHT_HEIGHT * 0.82, 0),
		target: new Vector3(2.25, 0, 1.05),
	},
]

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

function createGroundTexture() {
	const canvas = document.createElement('canvas')
	canvas.width = 1024
	canvas.height = 1024

	const context = canvas.getContext('2d')
	context.fillStyle = '#7f846b'
	context.fillRect(0, 0, canvas.width, canvas.height)

	for (let row = 0; row < 64; row += 1) {
		for (let column = 0; column < 64; column += 1) {
			const shade = 92 + ((row * 11 + column * 17) % 50)
			const warmth = 74 + ((row * 19 + column * 7) % 38)
			context.fillStyle = `rgba(${shade}, ${warmth + 35}, ${warmth}, 0.18)`
			context.fillRect(column * 16, row * 16, 16, 16)
		}
	}

	for (let blade = 0; blade < 900; blade += 1) {
		const x = (blade * 47) % canvas.width
		const y = (blade * 89) % canvas.height
		const length = 3 + (blade % 7)
		context.strokeStyle = blade % 4 === 0 ? 'rgba(53, 86, 46, 0.26)' : 'rgba(127, 139, 91, 0.28)'
		context.beginPath()
		context.moveTo(x, y)
		context.lineTo(x + ((blade % 5) - 2), y - length)
		context.stroke()
	}

	const texture = new CanvasTexture(canvas)
	texture.colorSpace = SRGBColorSpace
	texture.wrapS = texture.wrapT = RepeatWrapping
	texture.repeat.set(18, 18)
	return texture
}

function createGround(scene) {
	const ground = new Mesh(
		new PlaneGeometry(260, 260),
		new MeshStandardMaterial({
			color: 0x8b9073,
			map: createGroundTexture(),
			roughness: 1,
			metalness: 0,
			side: DoubleSide,
		}),
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

const RAIL_CLEARANCE = {
	halfLength: 96,
	halfWidth: 4.8,
}

const STATION_CLEARANCE_MARGIN = 2.6

const TRACK_LAYER_LIMITS = {
	stones: [5.25, 7.1],
	grassBushes: [7.4, 14],
	smallTrees: [15.5, 27],
	bigTrees: [32, 48],
}

const TRACK_LAYER_ALONG_RANGE = [-92, 92]

const GRASS_BLADE_GEOMETRY = new BoxGeometry(0.055, 1, 0.035)
const GRASS_MATERIALS = [
	new MeshStandardMaterial({ color: 0x426f35, roughness: 1, metalness: 0 }),
	new MeshStandardMaterial({ color: 0x5f853f, roughness: 1, metalness: 0 }),
	new MeshStandardMaterial({ color: 0x8d9a55, roughness: 1, metalness: 0 }),
]

const TREE_GROUND_SINK_RATIO = 0.07
const BILLBOARD_TREE_GROUND_SINK_RATIO = 0.22

function fitModelToHeight(model, targetHeight) {
	const bounds = new Box3().setFromObject(model)
	const size = new Vector3()
	bounds.getSize(size)

	if (size.y > 0) {
		model.scale.multiplyScalar(targetHeight / size.y)
	}

	return model
}

function stableRandom(seed) {
	const value = Math.sin(seed * 12.9898) * 43758.5453
	return value - Math.floor(value)
}

function rangeValue([min, max], t) {
	return min + (max - min) * t
}

function createLayerPlacements({
	countPerSide,
	offsetRange,
	alongRange = TRACK_LAYER_ALONG_RANGE,
	heightRange = [1, 1],
	lengthRange = [1, 1],
	seedBase,
}) {
	const placements = []

	for (const side of [-1, 1]) {
		for (let index = 0; index < countPerSide; index += 1) {
			const seed = seedBase + (side > 0 ? 1000 : 0) + index
			const laneJitter = (stableRandom(seed + 0.3) - 0.5) * ((alongRange[1] - alongRange[0]) / countPerSide) * 0.7
			const alongProgress = countPerSide === 1 ? 0.5 : index / (countPerSide - 1)

			placements.push({
				along: rangeValue(alongRange, alongProgress) + laneJitter,
				side,
				offset: rangeValue(offsetRange, stableRandom(seed + 1.1)),
				height: rangeValue(heightRange, stableRandom(seed + 2.2)),
				length: rangeValue(lengthRange, stableRandom(seed + 3.3)),
				rotation: stableRandom(seed + 4.4) * Math.PI * 2,
				seed,
			})
		}
	}

	return placements
}

function createRailwayLayerPlacements() {
	return {
		firstLayerStones: createLayerPlacements({
			countPerSide: 34,
			offsetRange: TRACK_LAYER_LIMITS.stones,
			lengthRange: [0.55, 1.35],
			seedBase: 10,
		}),
		firstLayerGrass: createLayerPlacements({
			countPerSide: 22,
			offsetRange: [5.65, 7],
			heightRange: [0.45, 0.9],
			seedBase: 80,
		}),
		middleGrass: createLayerPlacements({
			countPerSide: 38,
			offsetRange: TRACK_LAYER_LIMITS.grassBushes,
			heightRange: [0.65, 1.25],
			seedBase: 140,
		}),
		treeLayerGrass: createLayerPlacements({
			countPerSide: 38,
			offsetRange: TRACK_LAYER_LIMITS.smallTrees,
			heightRange: [0.65, 1.25],
			seedBase: 220,
		}),
		bushes: createLayerPlacements({
			countPerSide: 12,
			offsetRange: [8.5, 13.6],
			heightRange: [1.4, 3],
			seedBase: 300,
		}),
		smallMediumTrees: createLayerPlacements({
			countPerSide: 9,
			offsetRange: TRACK_LAYER_LIMITS.smallTrees,
			heightRange: [5.5, 10.5],
			seedBase: 420,
		}),
		bigTrees: createLayerPlacements({
			countPerSide: 8,
			offsetRange: TRACK_LAYER_LIMITS.bigTrees,
			heightRange: [13, 22],
			seedBase: 540,
		}),
	}
}

function getBoundsFootprintCorners(bounds) {
	return [
		new Vector3(bounds.min.x, 0, bounds.min.z),
		new Vector3(bounds.min.x, 0, bounds.max.z),
		new Vector3(bounds.max.x, 0, bounds.min.z),
		new Vector3(bounds.max.x, 0, bounds.max.z),
	]
}

function isClearOfRailFootprint(bounds, tracks) {
	const railLocalBounds = new Box3()

	getBoundsFootprintCorners(bounds).forEach((corner) => {
		tracks.worldToLocal(corner)
		railLocalBounds.expandByPoint(corner)
	})

	return (
		railLocalBounds.max.x < -RAIL_CLEARANCE.halfLength ||
		railLocalBounds.min.x > RAIL_CLEARANCE.halfLength ||
		railLocalBounds.max.z < -RAIL_CLEARANCE.halfWidth ||
		railLocalBounds.min.z > RAIL_CLEARANCE.halfWidth
	)
}

function isClearOfStationFootprint(bounds, stationBounds) {
	if (!stationBounds) {
		return true
	}

	return (
		bounds.max.x < stationBounds.min.x - STATION_CLEARANCE_MARGIN ||
		bounds.min.x > stationBounds.max.x + STATION_CLEARANCE_MARGIN ||
		bounds.max.z < stationBounds.min.z - STATION_CLEARANCE_MARGIN ||
		bounds.min.z > stationBounds.max.z + STATION_CLEARANCE_MARGIN
	)
}

function isSafeTracksideObject(object, tracks, stationBounds) {
	const bounds = new Box3().setFromObject(object)
	return isClearOfRailFootprint(bounds, tracks) && isClearOfStationFootprint(bounds, stationBounds)
}

function getTracksidePosition(tracks, placement) {
	const position = new Vector3(placement.along, 0, placement.side * placement.offset)
	return tracks.localToWorld(position)
}

function collectForestSources(forestTreePack, pattern) {
	const sources = []

	forestTreePack.traverse((object) => {
		if (object.children.length > 0 && pattern.test(object.name)) {
			sources.push(object)
		}
	})

	return sources
}

function getTreePartSuffix(name) {
	const suffixMatch = name.match(/\.\d+$/)
	return suffixMatch ? suffixMatch[0] : ''
}

function createTreePartPairs(forestTreePack) {
	const branchSources = collectForestSources(forestTreePack, /^Tree_Branches_(?:01|02)(?:\.\d+)?$/)
	const trunkSources = collectForestSources(forestTreePack, /^Tree_Trunk_(?:01|02)(?:\.\d+)?$/)

	return branchSources.map((branchSource, index) => {
		const branchType = branchSource.name.includes('02') ? '02' : '01'
		const suffix = getTreePartSuffix(branchSource.name)
		const trunkSource =
			trunkSources.find((source) => source.name === `Tree_Trunk_${branchType}${suffix}`) ??
			trunkSources[index % Math.max(trunkSources.length, 1)]

		return trunkSource ? [trunkSource, branchSource] : [branchSource]
	})
}

function createForestAssetLibrary(forestTreePack) {
	forestTreePack.updateWorldMatrix(true, true)

	const backgroundTreeSources = collectForestSources(forestTreePack, /^Background_Tree_Atlas(?:\.\d+)?$/)
	const rockSources = collectForestSources(forestTreePack, /^Rocks(?:\.\d+)?$/)
	const branchSources = collectForestSources(forestTreePack, /^Tree_Branches_(?:01|02)(?:\.\d+)?$/)
	const realTreeSources = createTreePartPairs(forestTreePack)
	const billboardTreeSources = backgroundTreeSources.map((source) => [source])
	const trees = realTreeSources.length > 0 ? realTreeSources : billboardTreeSources

	return {
		trees: trees.length > 0 ? trees : [[forestTreePack]],
		backgroundTrees: billboardTreeSources.length > 0 ? billboardTreeSources : trees,
		shrubs: branchSources.length > 0 ? branchSources.map((source) => [source]) : trees,
		rocks: rockSources.length > 0 ? rockSources.map((source) => [source]) : trees,
		treeGroundSinkRatio: realTreeSources.length > 0 ? TREE_GROUND_SINK_RATIO : BILLBOARD_TREE_GROUND_SINK_RATIO,
	}
}

function cloneForestSource(source) {
	source.updateWorldMatrix(true, false)

	const clone = source.clone(true)
	clone.matrix.copy(source.matrixWorld)
	clone.matrix.decompose(clone.position, clone.quaternion, clone.scale)
	clone.matrixAutoUpdate = true

	return clone
}

function createPlacedForestAsset({ sources, placement, tracks, name, fitMode = 'height', groundSinkRatio = 0 }) {
	const asset = new Group()
	asset.name = name

	sources.forEach((source) => {
		asset.add(cloneForestSource(source))
	})

	if (fitMode === 'length') {
		fitModelToLength(asset, placement.length)
	} else {
		fitModelToHeight(asset, placement.height)
	}

	groundAndCenterModel(asset)
	placeModelOnSurface(asset, 0)
	asset.position.y -= (placement.height ?? placement.length ?? 1) * groundSinkRatio
	asset.rotation.y += placement.rotation ?? 0

	const tracksidePosition = getTracksidePosition(tracks, placement)
	asset.position.x += tracksidePosition.x
	asset.position.z += tracksidePosition.z
	asset.updateWorldMatrix(true, true)

	return asset
}

function createGrassClump({ placement, tracks, name }) {
	const grassClump = new Group()
	grassClump.name = name

	const bladeCount = 3 + Math.floor(stableRandom(placement.seed + 5.5) * 4)

	for (let index = 0; index < bladeCount; index += 1) {
		const bladeSeed = placement.seed + index * 7
		const bladeHeight = placement.height * (0.65 + stableRandom(bladeSeed + 0.2) * 0.55)
		const blade = new Mesh(
			GRASS_BLADE_GEOMETRY,
			GRASS_MATERIALS[index % GRASS_MATERIALS.length],
		)

		blade.scale.setScalar(0.85 + stableRandom(bladeSeed + 0.4) * 0.5)
		blade.scale.y = bladeHeight
		blade.position.set(
			(stableRandom(bladeSeed + 0.8) - 0.5) * 0.45,
			bladeHeight * 0.5,
			(stableRandom(bladeSeed + 1.2) - 0.5) * 0.45,
		)
		blade.rotation.y = stableRandom(bladeSeed + 1.8) * Math.PI
		blade.rotation.z = (stableRandom(bladeSeed + 2.4) - 0.5) * 0.35
		blade.castShadow = true
		blade.receiveShadow = true
		grassClump.add(blade)
	}

	const tracksidePosition = getTracksidePosition(tracks, placement)
	grassClump.position.set(tracksidePosition.x, 0, tracksidePosition.z)
	grassClump.rotation.y = placement.rotation ?? 0
	grassClump.updateWorldMatrix(true, true)

	return grassClump
}

function addPlacedForestAssets({ group, librarySources, placements, tracks, stationBounds, namePrefix, fitMode, groundSinkRatio = 0 }) {
	placements.forEach((placement, index) => {
		const asset = createPlacedForestAsset({
			sources: librarySources[index % librarySources.length],
			placement,
			tracks,
			name: `${namePrefix}_${index + 1}`,
			fitMode,
			groundSinkRatio,
		})

		if (isSafeTracksideObject(asset, tracks, stationBounds)) {
			group.add(asset)
		}
	})
}

function addGrassClumps({ group, placements, tracks, stationBounds, namePrefix }) {
	placements.forEach((placement, index) => {
		const grassClump = createGrassClump({
			placement,
			tracks,
			name: `${namePrefix}_${index + 1}`,
		})

		if (isSafeTracksideObject(grassClump, tracks, stationBounds)) {
			group.add(grassClump)
		}
	})
}

function createForestEnvironment(forestTreePack, tracks, station) {
	const forestEnvironment = new Group()
	forestEnvironment.name = 'ForestEnvironment'

	tracks.updateWorldMatrix(true, false)
	station.updateWorldMatrix(true, true)

	const stationBounds = new Box3().setFromObject(station)
	const forestAssets = createForestAssetLibrary(forestTreePack)
	const railwayLayerPlacements = createRailwayLayerPlacements()

	addPlacedForestAssets({
		group: forestEnvironment,
		librarySources: forestAssets.rocks,
		placements: railwayLayerPlacements.firstLayerStones,
		tracks,
		stationBounds,
		namePrefix: 'FirstLayerStone',
		fitMode: 'length',
	})

	addGrassClumps({
		group: forestEnvironment,
		placements: railwayLayerPlacements.firstLayerGrass,
		tracks,
		stationBounds,
		namePrefix: 'FirstLayerGrass',
	})

	addGrassClumps({
		group: forestEnvironment,
		placements: railwayLayerPlacements.middleGrass,
		tracks,
		stationBounds,
		namePrefix: 'MiddleLayerGrass',
	})

	addPlacedForestAssets({
		group: forestEnvironment,
		librarySources: forestAssets.shrubs,
		placements: railwayLayerPlacements.bushes,
		tracks,
		stationBounds,
		namePrefix: 'MiddleLayerBush',
		fitMode: 'height',
	})

	addGrassClumps({
		group: forestEnvironment,
		placements: railwayLayerPlacements.treeLayerGrass,
		tracks,
		stationBounds,
		namePrefix: 'TreeLayerGrass',
	})

	addPlacedForestAssets({
		group: forestEnvironment,
		librarySources: forestAssets.trees,
		placements: railwayLayerPlacements.smallMediumTrees,
		tracks,
		stationBounds,
		namePrefix: 'SmallMediumTree',
		fitMode: 'height',
		groundSinkRatio: forestAssets.treeGroundSinkRatio,
	})

	addPlacedForestAssets({
		group: forestEnvironment,
		librarySources: forestAssets.trees,
		placements: railwayLayerPlacements.bigTrees,
		tracks,
		stationBounds,
		namePrefix: 'BigTracksideTree',
		fitMode: 'height',
		groundSinkRatio: forestAssets.treeGroundSinkRatio,
	})

	return forestEnvironment
}

function getStreetLightLightingPreset(mode) {
	return STREET_LIGHTING_PRESETS[mode] ?? STREET_LIGHTING_PRESETS[ENVIRONMENT_MODE.DAY]
}

function createStreetLightBeam(name, mode, index) {
	const lighting = getStreetLightLightingPreset(mode)
	const head = STREET_LIGHT_HEADS[index]
	const beam = new SpotLight(
		0xffd28a,
		lighting.spotIntensity,
		18,
		Math.PI / 5.8,
		0.72,
		1.55,
	)
	beam.name = `${name}_StreetLightBeam_${index + 1}`
	beam.position.copy(head.position)
	beam.target.name = `${name}_StreetLightTarget_${index + 1}`
	beam.target.position.copy(head.target)
	beam.visible = lighting.spotIntensity > 0
	beam.target.visible = false
	beam.castShadow = false

	return beam
}

function createStreetLightInstance(streetLightLamp, name, mode) {
	const lamp = streetLightLamp.clone(true)
	lamp.name = name

	fitModelToHeight(lamp, STREET_LIGHT_HEIGHT)
	groundAndCenterModel(lamp)
	placeModelOnSurface(lamp, 0)

	const beams = STREET_LIGHT_HEADS.map((_, index) => createStreetLightBeam(name, mode, index))
	beams.forEach((beam) => {
		lamp.add(beam)
		lamp.add(beam.target)
	})
	lamp.userData.streetLightLighting = {
		beams,
	}

	return lamp
}

function isClearOfTracks(object, tracks) {
	const bounds = new Box3().setFromObject(object)
	return isClearOfRailFootprint(bounds, tracks)
}

function addTracksideStreetLights({ group, streetLightLamp, tracks, mode }) {
	STREET_LIGHT_TRACK_PLACEMENTS.forEach((placement, index) => {
		const lamp = createStreetLightInstance(streetLightLamp, `TracksideStreetLight_${index + 1}`, mode)
		const tracksidePosition = getTracksidePosition(tracks, placement)

		lamp.position.x += tracksidePosition.x
		lamp.position.z += tracksidePosition.z
		lamp.rotation.y = tracks.rotation.y + (placement.side > 0 ? Math.PI : 0) + (placement.rotation ?? 0)
		lamp.updateWorldMatrix(true, true)

		if (isClearOfTracks(lamp, tracks)) {
			group.add(lamp)
		}
	})
}

function addStationAreaStreetLights({ group, streetLightLamp, station, tracks, mode }) {
	STREET_LIGHT_STATION_PLACEMENTS.forEach((placement, index) => {
		const lamp = createStreetLightInstance(streetLightLamp, `StationStreetLight_${index + 1}`, mode)
		const stationPosition = new Vector3(placement.localX, 0, placement.localZ)
			.applyAxisAngle(new Vector3(0, 1, 0), station.rotation.y)
			.add(station.position)

		lamp.position.x += stationPosition.x
		lamp.position.z += stationPosition.z
		lamp.rotation.y = station.rotation.y + (placement.rotation ?? 0)
		lamp.updateWorldMatrix(true, true)

		if (isClearOfTracks(lamp, tracks)) {
			group.add(lamp)
		}
	})
}

function createStreetLightEnvironment(streetLightLamp, tracks, station, mode) {
	const streetLightEnvironment = new Group()
	streetLightEnvironment.name = 'StreetLightEnvironment'

	tracks.updateWorldMatrix(true, false)
	station.updateWorldMatrix(true, true)

	addTracksideStreetLights({
		group: streetLightEnvironment,
		streetLightLamp,
		tracks,
		mode,
	})
	addStationAreaStreetLights({
		group: streetLightEnvironment,
		streetLightLamp,
		station,
		tracks,
		mode,
	})

	return streetLightEnvironment
}

function setStreetLightLighting(streetLightEnvironment, mode) {
	const lighting = getStreetLightLightingPreset(mode)

	streetLightEnvironment.traverse((object) => {
		const streetLightLighting = object.userData.streetLightLighting
		if (!streetLightLighting) {
			return
		}

		streetLightLighting.beams.forEach((beam) => {
			beam.intensity = lighting.spotIntensity
			beam.visible = lighting.spotIntensity > 0
		})
	})
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

	let streetLightEnvironment = null

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

	function updateStreetLightLighting() {
		if (!streetLightEnvironment) {
			return
		}

		setStreetLightLighting(streetLightEnvironment, environmentMode.current)
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
		updateStreetLightLighting()

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
		outsidePosition: -86,
		insidePosition: -8,
		exitPosition: 86,
		currentSpeed: 0,
		cruiseSpeed: 12,
		acceleration: 2.35,
		braking: 3.15,
		stopDuration: 4.5,
		outsideDelay: 1.6,
		stopBuffer: 0.18,
		stopSpeed: 0.18,
		ridePhase: 0,
	}

	function resetTrainMotion() {
		if (!trainMotion.train) {
			return
		}

		trainMotion.state = 'entering'
		trainMotion.elapsed = 0
		trainMotion.currentSpeed = trainMotion.cruiseSpeed * 0.72
		trainMotion.ridePhase = 0
		trainMotion.train.position.x = trainMotion.outsidePosition
		trainMotion.train.position.y = 0
		trainMotion.train.position.z = 0
	}

	function moveValueToward(current, target, maxStep) {
		if (current < target) {
			return Math.min(current + maxStep, target)
		}

		return Math.max(current - maxStep, target)
	}

	function getArrivalTargetSpeed(remainingDistance) {
		if (remainingDistance <= trainMotion.stopBuffer) {
			return 0
		}

		const brakeDistance = Math.max(remainingDistance - trainMotion.stopBuffer, 0)
		return Math.min(trainMotion.cruiseSpeed, Math.sqrt(2 * trainMotion.braking * brakeDistance))
	}

	function applyTrainRideMotion(deltaTime) {
		if (!trainMotion.train) {
			return
		}

		const motionAmount = Math.min(trainMotion.currentSpeed / trainMotion.cruiseSpeed, 1)
		trainMotion.ridePhase += deltaTime * (1.6 + trainMotion.currentSpeed * 0.45)
		trainMotion.train.position.y = (
			Math.sin(trainMotion.ridePhase) * 0.018 +
			Math.sin(trainMotion.ridePhase * 2.7) * 0.006
		) * motionAmount
	}

	function setCameraMode(mode) {
		const nextMode = mode === CAMERA_MODE.ORBIT ? CAMERA_MODE.ORBIT : CAMERA_MODE.FREE
		cameraMode.current = nextMode
		controls.enabled = nextMode === CAMERA_MODE.FREE

		if (nextMode === CAMERA_MODE.ORBIT) {
			cinematicCamera.mouseControlling = false
			cinematicCamera.keyboardControlling = false
			cinematicCamera.isUserControlling = false
		}

		return cameraMode.current
	}

	function toggleCameraMode() {
		return setCameraMode(cameraMode.current === CAMERA_MODE.FREE ? CAMERA_MODE.ORBIT : CAMERA_MODE.FREE)
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
		if (cameraMode.current !== CAMERA_MODE.ORBIT || !cinematicCamera.station) {
			return
		}

		cinematicCamera.angle += deltaTime * 0.22

		cinematicCamera.station.getWorldPosition(cinematicCamera.stationCenter)
		cinematicCamera.trainLookTarget.copy(cinematicCamera.stationCenter).add(cinematicCamera.lookOffset)

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

		const frameTime = Math.min(deltaTime, 0.12)
		trainMotion.elapsed += frameTime

		if (trainMotion.state === 'entering') {
			const remainingDistance = trainMotion.insidePosition - trainMotion.train.position.x
			const targetSpeed = getArrivalTargetSpeed(remainingDistance)
			const speedChangeRate = trainMotion.currentSpeed > targetSpeed
				? trainMotion.braking
				: trainMotion.acceleration

			trainMotion.currentSpeed = moveValueToward(
				trainMotion.currentSpeed,
				targetSpeed,
				speedChangeRate * frameTime,
			)
			trainMotion.train.position.x += trainMotion.currentSpeed * frameTime
			applyTrainRideMotion(frameTime)

			if (
				trainMotion.train.position.x >= trainMotion.insidePosition ||
				(remainingDistance <= trainMotion.stopBuffer && trainMotion.currentSpeed <= trainMotion.stopSpeed)
			) {
				trainMotion.state = 'stopped'
				trainMotion.elapsed = 0
				trainMotion.currentSpeed = 0
				trainMotion.train.position.x = trainMotion.insidePosition
				trainMotion.train.position.y = 0
			}
			return
		}

		if (trainMotion.state === 'stopped') {
			trainMotion.train.position.x = trainMotion.insidePosition
			trainMotion.train.position.y = 0

			if (trainMotion.elapsed >= trainMotion.stopDuration) {
				trainMotion.state = 'leaving'
				trainMotion.elapsed = 0
			}
			return
		}

		if (trainMotion.state === 'leaving') {
			trainMotion.currentSpeed = moveValueToward(
				trainMotion.currentSpeed,
				trainMotion.cruiseSpeed,
				trainMotion.acceleration * frameTime,
			)
			trainMotion.train.position.x += trainMotion.currentSpeed * frameTime
			applyTrainRideMotion(frameTime)

			if (trainMotion.train.position.x >= trainMotion.exitPosition) {
				trainMotion.state = 'outside'
				trainMotion.elapsed = 0
				trainMotion.currentSpeed = trainMotion.cruiseSpeed
				trainMotion.train.position.x = trainMotion.exitPosition
				trainMotion.train.position.y = 0
			}
			return
		}

		if (trainMotion.state === 'outside') {
			trainMotion.train.position.x = trainMotion.exitPosition
			trainMotion.train.position.y = 0

			if (trainMotion.elapsed >= trainMotion.outsideDelay) {
				resetTrainMotion()
			}
		}
	}

	let disposed = false
	loadTrainStationEnvironmentModels().then(({ train, station, forestTreePack, streetLightLamp }) => {
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

		streetLightEnvironment = createStreetLightEnvironment(streetLightLamp, tracks, station, environmentMode.current)
		assetGroup.add(streetLightEnvironment)
		updateStreetLightLighting()

		assetGroup.add(createForestEnvironment(forestTreePack, tracks, station))

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
		updateCinematicCamera(deltaTime)

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
