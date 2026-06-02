import './style.css'
import { createTrainStationScene } from './scene.js'

const app = document.querySelector('#app')

app.innerHTML = `
  <main class="page-shell">
    <div class="sidebar-stack">
      <section class="hero-panel">
        <div class="view-toolbar">
          <button id="environment-toggle" class="mode-toggle environment-toggle" type="button" data-mode="day" aria-pressed="false">
            <span class="mode-toggle__option" data-environment-option="day">Day</span>
            <span class="mode-toggle__option" data-environment-option="night">Night</span>
          </button>
          <button id="view-toggle" class="mode-toggle view-toggle" type="button" data-mode="free" aria-pressed="false">
            <span class="mode-toggle__option" data-view-option="free">Free cam</span>
            <span class="mode-toggle__option" data-view-option="orbit">Station orbit</span>
          </button>
        </div>
        <p class="eyebrow">Three.js train station</p>
        <h1>Responsive station scene</h1>
        <p class="intro">
          A lightweight Three.js setup with perspective camera, renderer,
          lighting, orbit controls, sky background, and resize handling.
        </p>
      </section>

      <details class="guide-panel">
        <summary class="guide-summary">
          <span class="guide-summary__eyebrow">User guide</span>
          <span id="keyboard-guide-title" class="guide-summary__title">Keyboard controls</span>
        </summary>
        <dl class="key-guide" aria-label="Keyboard controls">
          <div class="key-guide__item">
            <dt><kbd>W</kbd></dt>
            <dd>Move camera forward</dd>
          </div>
          <div class="key-guide__item">
            <dt><kbd>S</kbd></dt>
            <dd>Move camera backward</dd>
          </div>
          <div class="key-guide__item">
            <dt><kbd>A</kbd></dt>
            <dd>Move camera left</dd>
          </div>
          <div class="key-guide__item">
            <dt><kbd>D</kbd></dt>
            <dd>Move camera right</dd>
          </div>
          <div class="key-guide__item">
            <dt><kbd>Q</kbd></dt>
            <dd>Tilt camera down</dd>
          </div>
          <div class="key-guide__item">
            <dt><kbd>E</kbd></dt>
            <dd>Tilt camera up</dd>
          </div>
          <div class="key-guide__item">
            <dt><kbd>Space</kbd></dt>
            <dd>Pause or resume train</dd>
          </div>
          <div class="key-guide__item">
            <dt><kbd>L</kbd></dt>
            <dd>Toggle train headlight</dd>
          </div>
        </dl>
      </details>
    </div>
    <section class="viewport-panel">
      <div id="scene-container" class="scene-container" aria-label="3D train station scene"></div>
    </section>
  </main>
`

const stationScene = createTrainStationScene(document.querySelector('#scene-container'))
const environmentToggle = document.querySelector('#environment-toggle')
const viewToggle = document.querySelector('#view-toggle')

function updateEnvironmentToggle(mode) {
  const isNightMode = mode === 'night'
  environmentToggle.dataset.mode = mode
  environmentToggle.setAttribute('aria-pressed', String(isNightMode))
  environmentToggle.setAttribute(
    'aria-label',
    isNightMode ? 'Scene is in night mode. Switch to day mode.' : 'Scene is in day mode. Switch to night mode.',
  )
}

function updateViewToggle(mode) {
  const isOrbitMode = mode === 'orbit'
  viewToggle.dataset.mode = mode
  viewToggle.setAttribute('aria-pressed', String(isOrbitMode))
  viewToggle.setAttribute(
    'aria-label',
    isOrbitMode ? 'Camera is orbiting the station. Switch to free cam.' : 'Camera is in free cam. Switch to station orbit.',
  )
}

environmentToggle.addEventListener('click', () => {
  updateEnvironmentToggle(stationScene.toggleEnvironmentMode())
})

viewToggle.addEventListener('click', () => {
  updateViewToggle(stationScene.toggleCameraMode())
})

updateEnvironmentToggle(stationScene.getEnvironmentMode())
updateViewToggle(stationScene.getCameraMode())
