// Keep transient GPU context loss separate from unsupported graphics.
export function watchGraphicsContext(canvas, {onLost, onRestored, onWaiting}, timers = globalThis) {
  const extension = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');
  let lost = false, timer;
  const clear = () => { if (timer !== undefined) timers.clearTimeout(timer); timer = undefined; };
  const retry = () => {
    if (!lost) return;
    clear();
    try { extension?.restoreContext(); }
    catch { /* The browser may restore it later when GPU resources are free. */ }
    timer = timers.setTimeout(() => { if (lost) onWaiting(); }, 6000);
  };
  const handleLost = event => {
    event.preventDefault();
    lost = true;
    clear();
    onLost();
    timer = timers.setTimeout(retry, 800);
  };
  const handleRestored = () => {
    if (!lost) return;
    lost = false;
    clear();
    onRestored();
  };
  canvas.addEventListener('webglcontextlost', handleLost);
  canvas.addEventListener('webglcontextrestored', handleRestored);
  return {retry, get lost() { return lost; }, dispose() {
    clear();
    canvas.removeEventListener('webglcontextlost', handleLost);
    canvas.removeEventListener('webglcontextrestored', handleRestored);
  }};
}
