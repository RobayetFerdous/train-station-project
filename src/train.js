import {
	BoxGeometry,
	CanvasTexture,
	Color,
	CylinderGeometry,
	DoubleSide,
	Group,
	Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	RepeatWrapping,
	SRGBColorSpace,
} from 'three'

function createMetalTexture() {
	const canvas = document.createElement('canvas')
	canvas.width = 512
	canvas.height = 512

	const context = canvas.getContext('2d')
	const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
	gradient.addColorStop(0, '#cfd5db')
	gradient.addColorStop(0.25, '#7f8a93')
	gradient.addColorStop(0.5, '#eef2f4')
	gradient.addColorStop(0.75, '#8d969d')
	gradient.addColorStop(1, '#bcc3c9')
	context.fillStyle = gradient
	context.fillRect(0, 0, canvas.width, canvas.height)

	for (let row = 0; row < 32; row += 1) {
		const y = row * 16
		const alpha = 0.04 + (row % 5) * 0.01
		context.fillStyle = `rgba(255, 255, 255, ${alpha})`
		context.fillRect(0, y, canvas.width, 4)

		context.fillStyle = 'rgba(35, 40, 46, 0.08)'
		context.fillRect(0, y + 6, canvas.width, 1)
	}

	for (let column = 0; column < 24; column += 1) {
		const x = column * 21
		context.fillStyle = 'rgba(18, 22, 26, 0.08)'
		context.fillRect(x, 0, 1, canvas.height)
	}

	const texture = new CanvasTexture(canvas)
	texture.colorSpace = SRGBColorSpace
	texture.wrapS = texture.wrapT = RepeatWrapping
	texture.repeat.set(2, 1)
	return texture
}

function createWheel() {
	const wheel = new Mesh(
		new CylinderGeometry(0.35, 0.35, 0.22, 8),
		new MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.4, metalness: 0.85 }),
	)
	wheel.rotation.z = Math.PI / 2
	return wheel
}

function createPassengerCar({ length, height, width, bodyColor, accentColor, windowCount, doorOffset, roofHeight }) {
	const car = new Group()
	const metalTexture = createMetalTexture()

	const bodyMaterial = new MeshStandardMaterial({
		color: new Color(bodyColor),
		map: metalTexture,
		metalness: 0.8,
		roughness: 0.32,
	})

	const trimMaterial = new MeshStandardMaterial({
		color: new Color(accentColor),
		metalness: 0.65,
		roughness: 0.28,
	})

	const windowMaterial = new MeshStandardMaterial({
		color: 0x90b8d8,
		metalness: 0.15,
		roughness: 0.08,
		transparent: true,
		opacity: 0.9,
	})

	const undercarriage = new Mesh(
		new BoxGeometry(length * 0.94, 0.45, width * 0.88),
		new MeshStandardMaterial({ color: 0x30343a, metalness: 0.55, roughness: 0.7 }),
	)
	undercarriage.position.y = 0.3
	car.add(undercarriage)

	const body = new Mesh(new BoxGeometry(length, height, width), bodyMaterial)
	body.position.y = 1.8
	car.add(body)

	const roof = new Mesh(
		new BoxGeometry(length * 0.97, roofHeight, width * 0.92),
		new MeshStandardMaterial({ color: 0xd5dbe1, map: metalTexture, metalness: 0.82, roughness: 0.26 }),
	)
	roof.position.y = 1.8 + height * 0.52 + roofHeight * 0.5
	car.add(roof)

	const lowerStripe = new Mesh(
		new BoxGeometry(length * 1.01, 0.2, width * 1.02),
		trimMaterial,
	)
	lowerStripe.position.y = 1.1
	car.add(lowerStripe)

	const windowsStart = -length * 0.35
	const windowsSpacing = length * 0.7 / Math.max(windowCount - 1, 1)

	for (let index = 0; index < windowCount; index += 1) {
		const windowPanel = new Mesh(
			new BoxGeometry(length * 0.09, height * 0.3, width * 0.05),
			windowMaterial,
		)
		windowPanel.position.set(windowsStart + index * windowsSpacing, 2.1, width * 0.51)
		car.add(windowPanel)

		const sideWindow = windowPanel.clone()
		sideWindow.position.z = -width * 0.51
		car.add(sideWindow)
	}

	const door = new Mesh(
		new BoxGeometry(length * 0.1, height * 0.58, width * 0.06),
		new MeshStandardMaterial({ color: 0x7d8590, metalness: 0.7, roughness: 0.3 }),
	)
	door.position.set(doorOffset, 2.0, width * 0.52)
	car.add(door)

	const doorBack = door.clone()
	doorBack.position.z = -width * 0.52
	car.add(doorBack)

	const wheelPositions = [
		[-length * 0.38, 0.2, width * 0.48],
		[length * 0.38, 0.2, width * 0.48],
		[-length * 0.38, 0.2, -width * 0.48],
		[length * 0.38, 0.2, -width * 0.48],
	]

	for (const [x, y, z] of wheelPositions) {
		const wheel = createWheel()
		wheel.position.set(x, y, z)
		car.add(wheel)
	}

	const coupler = new Mesh(
		new BoxGeometry(0.3, 0.18, 0.25),
		new MeshStandardMaterial({ color: 0x31353b, metalness: 0.7, roughness: 0.5 }),
	)
	coupler.position.set(length * 0.5 + 0.14, 0.75, 0)
	car.add(coupler)

	return car
}

function createEngine() {
	const engine = new Group()
	const metalTexture = createMetalTexture()

	const bodyMaterial = new MeshStandardMaterial({
		color: 0x3f6e8d,
		map: metalTexture,
		metalness: 0.85,
		roughness: 0.28,
	})

	const accentMaterial = new MeshStandardMaterial({
		color: 0xe8c14d,
		metalness: 0.7,
		roughness: 0.35,
	})

	const darkMaterial = new MeshStandardMaterial({
		color: 0x25292e,
		metalness: 0.6,
		roughness: 0.5,
	})

	const chassis = new Mesh(new BoxGeometry(6.4, 0.45, 2.9), darkMaterial)
	chassis.position.y = 0.35
	engine.add(chassis)

	const mainBody = new Mesh(new BoxGeometry(5.3, 2.0, 2.8), bodyMaterial)
	mainBody.position.set(-0.2, 1.65, 0)
	engine.add(mainBody)

	const nose = new Mesh(new BoxGeometry(2.5, 1.8, 2.75), bodyMaterial)
	nose.position.set(3.1, 1.45, 0)
	nose.rotation.z = -0.08
	engine.add(nose)

	const cab = new Mesh(new BoxGeometry(1.7, 1.45, 2.7), accentMaterial)
	cab.position.set(1.55, 2.0, 0)
	engine.add(cab)

	const roof = new Mesh(new BoxGeometry(5.4, 0.28, 2.65), accentMaterial)
	roof.position.set(-0.15, 2.82, 0)
	engine.add(roof)

	const windshield = new Mesh(
		new BoxGeometry(0.08, 0.72, 2.1),
		new MeshStandardMaterial({ color: 0x8bc2e8, transparent: true, opacity: 0.82, roughness: 0.08, metalness: 0.1 }),
	)
	windshield.position.set(3.9, 2.0, 0)
	engine.add(windshield)

	const sideWindow = new Mesh(
		new BoxGeometry(0.7, 0.45, 0.06),
		new MeshStandardMaterial({ color: 0x94c2df, transparent: true, opacity: 0.82, roughness: 0.08, metalness: 0.08 }),
	)
	sideWindow.position.set(1.1, 2.22, 1.42)
	engine.add(sideWindow)

	const headlight = new Mesh(
		new BoxGeometry(0.16, 0.16, 0.16),
		new MeshBasicMaterial({ color: 0xfff2b3 }),
	)
	headlight.position.set(4.2, 1.3, 0)
	engine.add(headlight)

	const wheelPositions = [
		[-2.2, 0.12, 1.24],
		[2.2, 0.12, 1.24],
		[-2.2, 0.12, -1.24],
		[2.2, 0.12, -1.24],
		[3.6, 0.12, 1.24],
		[3.6, 0.12, -1.24],
	]

	for (const [x, y, z] of wheelPositions) {
		const wheel = createWheel()
		wheel.position.set(x, y, z)
		engine.add(wheel)
	}

	const frontCoupler = new Mesh(
		new BoxGeometry(0.35, 0.2, 0.22),
		darkMaterial,
	)
	frontCoupler.position.set(4.7, 0.75, 0)
	engine.add(frontCoupler)

	return engine
}

export function createPassengerTrain({ coachCount = 3 } = {}) {
	const train = new Group()
	train.name = 'PassengerTrain'

	const engine = createEngine()
	train.add(engine)

	const carriageSpacing = 7.4
	const coachLength = 6.6

	const coachConfigs = [
		{ bodyColor: 0xb84f3c, accentColor: 0xf0d16d, doorOffset: -2.2 },
		{ bodyColor: 0x4577a3, accentColor: 0xe6dcc9, doorOffset: 2.0 },
		{ bodyColor: 0x6e5a9f, accentColor: 0xf0c95b, doorOffset: -1.9 },
	]

	for (let index = 0; index < coachCount; index += 1) {
		const config = coachConfigs[index % coachConfigs.length]

		const coach = createPassengerCar({
			length: coachLength,
			height: 2.15,
			width: 2.8,
			bodyColor: config.bodyColor,
			accentColor: config.accentColor,
			windowCount: 4,
			doorOffset: config.doorOffset,
			roofHeight: 0.22,
		})

		coach.position.x = 7.2 + index * carriageSpacing
		train.add(coach)

		if (index < coachCount - 1) {
			const gangway = new Mesh(
				new BoxGeometry(0.38, 1.55, 2.1),
				new MeshStandardMaterial({
					color: 0x272b30,
					metalness: 0.45,
					roughness: 0.72,
				}),
			)

			gangway.position.set(
				7.2 + index * carriageSpacing + coachLength * 0.5 + 0.2,
				1.35,
				0,
			)

			train.add(gangway)
		}
	}

	// --------------------------------------------------
	// CENTER TRAIN PIVOT AUTOMATICALLY
	// --------------------------------------------------

	const minX = -3.2 // engine back
	const maxX = 7.2 + (coachCount - 1) * carriageSpacing + coachLength * 0.5

	const centerX = (minX + maxX) / 2

	train.children.forEach((child) => {
		child.position.x -= centerX
	})

	return train
}
