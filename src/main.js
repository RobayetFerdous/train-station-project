import './style.css'
import { createTrainStationScene } from './scene.js'

const app = document.querySelector('#app')

app.innerHTML = `
  <main class="page-shell">
    <section class="hero-panel">
      <div class="view-toolbar">
        <button id="view-toggle" class="view-toggle" type="button" data-mode="free" aria-pressed="false">
          <span class="view-toggle__option" data-view-option="free">Free cam</span>
          <span class="view-toggle__option" data-view-option="follow">Follow train</span>
        </button>
      </div>
      <p class="eyebrow">Three.js train station</p>
      <h1>Responsive station scene</h1>
      <p class="intro">
        A lightweight Three.js setup with perspective camera, renderer,
        lighting, orbit controls, sky background, and resize handling.
      </p>
    </section>
    <section class="viewport-panel">
      <div id="scene-container" class="scene-container" aria-label="3D train station scene"></div>
    </section>
  </main>
`

const stationScene = createTrainStationScene(document.querySelector('#scene-container'))
const viewToggle = document.querySelector('#view-toggle')

function updateViewToggle(mode) {
  const isFollowMode = mode === 'follow'
  viewToggle.dataset.mode = mode
  viewToggle.setAttribute('aria-pressed', String(isFollowMode))
  viewToggle.setAttribute(
    'aria-label',
    isFollowMode ? 'Camera is following the train. Switch to free cam.' : 'Camera is in free cam. Switch to follow train.',
  )
}

viewToggle.addEventListener('click', () => {
  updateViewToggle(stationScene.toggleCameraMode())
})

updateViewToggle(stationScene.getCameraMode())
