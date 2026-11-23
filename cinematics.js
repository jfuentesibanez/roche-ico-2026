/* Presentation controls remain in index.html; this module owns only its scenes. */
(() => {
  'use strict';
  // A real text layer lets the existing CRT accent animate each step marker.
  document.querySelectorAll('.slide.demo[data-mark]').forEach(slide => {
    const mark = document.createElement('div');
    mark.className = 'demo-mark';
    mark.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.className = 'crt-accent';
    text.dataset.text = slide.dataset.mark;
    text.textContent = slide.dataset.mark;
    mark.append(text);
    slide.append(mark);
    slide.classList.add('has-display-mark');
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motionOff = () => reduced.matches || document.documentElement.classList.contains('motion-off');
  // Each reveal reframes a different object in the same clinical scene.
  const tour = document.querySelector('.research-tour');
  if (tour) {
    const photo = tour.querySelector('.research-photo');
    const intro = tour.querySelector('.research-intro');
    const beats = [...tour.querySelectorAll('.research-beat')];
    const progress = [...tour.querySelectorAll('.research-progress span')];
    const portrait = matchMedia('(max-aspect-ratio:1/1)');
    let lastBeat = -2;
    function updateTour(force = false) {
      if (!tour.classList.contains('on')) { lastBeat = -2; return; }
      const index = beats.findLastIndex(beat => beat.classList.contains('on'));
      if (index === lastBeat && !force) return;
      lastBeat = index;
      const beat = beats[index];
      if (beat) tour.dataset.view = beat.dataset.view;
      else delete tour.dataset.view;
      intro.setAttribute('aria-hidden', String(Boolean(beat)));
      beats.forEach((item, n) => {
        item.classList.toggle('research-current', n === index);
        item.setAttribute('aria-hidden', String(n !== index));
      });
      progress.forEach((item, n) => {
        item.classList.toggle('visited', n <= index);
        item.classList.toggle('current', n === index);
      });
      const [x, y, zoom] = beat?.dataset.frame?.split(' ').map(Number) || [.5, .5, 1];
      const w = tour.clientWidth, h = tour.clientHeight;
      const ratio = photo.naturalWidth ? photo.naturalWidth / photo.naturalHeight : 1672 / 941;
      const imageWidth = Math.max(w, h * ratio), imageHeight = imageWidth / ratio;
      const focusX = (w - imageWidth) / 2 + x * imageWidth;
      const focusY = (h - imageHeight) / 2 + y * imageHeight;
      const scale = portrait.matches ? Math.min(zoom, 2.1) : zoom;
      const anchorX = portrait.matches ? .5 : beat?.dataset.view === 'left' ? .72 : .30;
      const anchorY = portrait.matches ? .35 : .51;
      const tx = Math.min(0, Math.max(w * (1 - scale), w * anchorX - focusX * scale));
      const ty = Math.min(0, Math.max(h * (1 - scale), h * anchorY - focusY * scale));
      tour.style.setProperty('--research-x', `${tx}px`);
      tour.style.setProperty('--research-y', `${ty}px`);
      tour.style.setProperty('--research-scale', scale);
    }
    const observer = new MutationObserver(() => updateTour());
    const options = { attributes:true, attributeFilter:['class'] };
    observer.observe(tour, options);
    beats.forEach(beat => observer.observe(beat, options));
    photo.addEventListener('load', () => updateTour(true));
    window.addEventListener('resize', () => updateTour(true));
    updateTour();
  }
  const closing = document.querySelector('.silicon-scene');
  let generation = 0, running = false;
  const animations = new Set();
  const imageReady = image => image.decode().catch(() => {});
  // Eager decoding prevents a blank frame during the cross-dissolve, including offline.
  const imagesReady = Promise.all([...document.querySelectorAll('.material-scene img')].map(imageReady));

  function finishClosing() {
    generation++;
    running = false;
    animations.forEach(animation => animation.cancel());
    animations.clear();
    closing.dataset.transitioning = 'false';
    closing.querySelector('.material-transition').hidden = true;
  }

  function animate(element, frames, options) {
    const animation = element.animate(frames, { fill:'both', ...options });
    animations.add(animation);
    return animation.finished.catch(() => {}).finally(() => animations.delete(animation));
  }

  async function playClosing() {
    finishClosing();
    if (motionOff()) return;
    const token = generation;
    running = true;
    await imagesReady;
    if (token !== generation || !closing.classList.contains('on') || motionOff()) return;
    const layer = closing.querySelector('.material-transition');
    const sand = layer.querySelector('.transition-sand');
    const macro = layer.querySelector('.transition-macro');
    const chip = layer.querySelector('.transition-chip');
    layer.hidden = false;
    closing.dataset.transitioning = 'true';
    // Warm grain -> full-frame circuitry -> a complete cold-blue accelerator.
    // Opacity overlaps prevent dark flashes. The camera never rotates.
    await Promise.all([
      animate(sand, [
        { transform:'scale(1)', opacity:1, offset:0 },
        { transform:'scale(2.75)', opacity:1, offset:.65 },
        { transform:'scale(3.4)', opacity:0, offset:1 }
      ], { duration:3600, easing:'cubic-bezier(.45,0,.2,1)' }),
      animate(macro, [
        { transform:'scale(1)', opacity:1, offset:0 },
        { transform:'scale(1.16)', opacity:1, offset:.55 },
        { transform:'scale(1.23)', opacity:0, offset:1 }
      ], { duration:3400, delay:2100, easing:'ease-in-out' }),
      animate(chip, [
        { transform:'scale(2.4)', opacity:1 },
        { transform:'scale(1)', opacity:1 }
      ], { duration:4100, delay:3700, easing:'cubic-bezier(.22,1,.36,1)' })
    ]);
    if (token === generation) finishClosing();
  }

  function workflowState(slide, state) {
    slide.dataset.sceneState = String(state);
    const title = slide.querySelector('.workflow-heading');
    title.children[0].setAttribute('aria-hidden', String(state > 0));
    title.children[1].setAttribute('aria-hidden', String(state === 0));
    slide.querySelector('.workflow-hub').setAttribute('aria-hidden', String(state === 0));
    slide.querySelector('.human-check').setAttribute('aria-hidden', String(state < 2));
    slide.querySelectorAll('.workflow-node').forEach(node => node.setAttribute('aria-hidden', String(state > 0)));
  }

  window.rocheCinematics = {
    leave(slide) { if (slide === closing) finishClosing(); },
    enter(slide, { previous, revealAll }) {
      if (slide.classList.contains('workflow-recap')) workflowState(slide, revealAll ? 2 : 0);
      if (slide === closing) {
        if (previous?.classList.contains('sand-scene') && !revealAll) playClosing();
        else finishClosing();
      }
    },
    next(slide) {
      if (slide === closing && running) { finishClosing(); return true; }
      if (!slide.classList.contains('workflow-recap')) return false;
      const state = Number(slide.dataset.sceneState);
      if (state >= 2) return false;
      workflowState(slide, state + 1);
      return true;
    },
    prev(slide) {
      if (!slide.classList.contains('workflow-recap')) return false;
      const state = Number(slide.dataset.sceneState);
      if (state <= 0) return false;
      workflowState(slide, state - 1);
      return true;
    },
    motionChanged() { if (motionOff()) finishClosing(); }
  };
  reduced.addEventListener('change', () => window.rocheCinematics.motionChanged());
})();
