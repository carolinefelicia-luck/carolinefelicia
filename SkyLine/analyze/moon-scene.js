import * as THREE from 'three';
import { OrbitControls } from './assets/three/OrbitControls.js';

const toRadians = degrees => degrees*Math.PI/180;
function positionFor({ lat, lon }, radius = 1.67) {
  const latitude = toRadians(lat), longitude = toRadians(lon);
  return new THREE.Vector3(Math.cos(latitude)*Math.cos(longitude), Math.sin(latitude), -Math.cos(latitude)*Math.sin(longitude)).multiplyScalar(radius);
}

export async function createMoonScene(host, { interactive = false, onPick = () => {}, onActivate = () => {} } = {}) {
  const message = host.querySelector('.scene-message');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(interactive ? 46 : 37, 1, .1, 80);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', interactive ? 'Interactive lunar globe. Drag to orbit. Use zoom buttons and coordinate fields to select with a keyboard.' : 'Decorative lunar globe');
  if (interactive) canvas.tabIndex = 0;
  host.append(canvas);
  let texture, relief;
  try {
    [texture, relief] = await Promise.all(['moon-color-4k.webp','moon-relief.webp'].map(file => new THREE.TextureLoader().loadAsync(new URL(`./assets/${file}`, import.meta.url).href)));
  } catch (error) {
    renderer.dispose(); canvas.remove(); throw error;
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  relief.anisotropy = texture.anisotropy;
  const terrainTexture=texture.clone(), terrainRelief=relief.clone();
  for(const map of [terrainTexture,terrainRelief]){map.wrapS=THREE.RepeatWrapping;map.wrapT=THREE.RepeatWrapping;map.repeat.set(8,8);map.needsUpdate=true;}
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.65, 80, 48), new THREE.MeshStandardMaterial({ map: texture, bumpMap: relief, bumpScale: .18, roughness: 1, metalness: 0 }));
  scene.add(moon);
  const key = new THREE.DirectionalLight(0xdde7ee, interactive ? 2.2 : 2.8);
  key.position.set(-4, 2, 2); scene.add(key);
  scene.add(new THREE.AmbientLight(0xc9d7e6, interactive ? .8 : .13));
  // Illustrative placement only; these objects do not use ephemeris positions.
  const sunCanvas=document.createElement('canvas'); sunCanvas.width=256; sunCanvas.height=128; const sunContext=sunCanvas.getContext('2d');
  const sunSurface=sunContext.createLinearGradient(0,0,0,128); sunSurface.addColorStop(0,'#ffbf5a'); sunSurface.addColorStop(.5,'#f58a31'); sunSurface.addColorStop(1,'#c95620');
  sunContext.fillStyle=sunSurface; sunContext.fillRect(0,0,256,128);
  for(let i=0;i<220;i++){const x=(Math.sin(i*71.3)*.5+.5)*256,y=(Math.cos(i*19.7)*.5+.5)*128,r=1+(Math.sin(i*9.1)*.5+.5)*3;sunContext.fillStyle=i%3?'rgba(255,220,125,.32)':'rgba(168,54,20,.3)';sunContext.beginPath();sunContext.ellipse(x,y,r*1.8,r,Math.sin(i)*.8,0,Math.PI*2);sunContext.fill();}
  const sunTexture=new THREE.CanvasTexture(sunCanvas); sunTexture.colorSpace=THREE.SRGBColorSpace;
  const sun = new THREE.Mesh(new THREE.SphereGeometry(.48,32,24), new THREE.MeshStandardMaterial({map:sunTexture,color:0xffdf9a,emissive:0xb95512,emissiveIntensity:.8,roughness:.85}));
  scene.add(sun);
  const sunGlowTextureCanvas=document.createElement('canvas'); sunGlowTextureCanvas.width=sunGlowTextureCanvas.height=128;
  const sunGlowContext=sunGlowTextureCanvas.getContext('2d'); const sunGradient=sunGlowContext.createRadialGradient(64,64,4,64,64,64);
  sunGradient.addColorStop(0,'rgba(255,221,152,.8)'); sunGradient.addColorStop(.28,'rgba(255,179,78,.35)'); sunGradient.addColorStop(1,'rgba(255,135,35,0)');
  sunGlowContext.fillStyle=sunGradient; sunGlowContext.fillRect(0,0,128,128);
  const sunGlowTexture=new THREE.CanvasTexture(sunGlowTextureCanvas); const sunHalo=new THREE.Sprite(new THREE.SpriteMaterial({map:sunGlowTexture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  sunHalo.scale.set(2.4,2.4,1); sun.add(sunHalo);
  const sunGlow = new THREE.PointLight(0xffd998, 95, 30, 2); scene.add(sunGlow);
  const earthCanvas=document.createElement('canvas'); earthCanvas.width=512; earthCanvas.height=256;
  const earthContext=earthCanvas.getContext('2d'); const ocean=earthContext.createLinearGradient(0,0,0,256); ocean.addColorStop(0,'#4f9dca'); ocean.addColorStop(.5,'#126298'); ocean.addColorStop(1,'#0a345b');
  earthContext.fillStyle=ocean; earthContext.fillRect(0,0,512,256); earthContext.fillStyle='#64a77c';
  for(const path of ['M48 70 Q90 30 142 54 L161 82 135 103 122 146 98 178 84 136 61 115Z','M177 34 Q218 24 239 55 L230 82 211 99 222 129 203 177 184 156 178 113 161 88Z','M260 57 Q304 30 348 51 L377 76 357 95 320 88 301 111 271 96Z','M301 114 Q343 103 368 127 L355 170 329 203 310 181 295 145Z','M390 76 Q431 56 462 79 L451 101 418 108Z']) { earthContext.beginPath(); earthContext.moveTo(...path.match(/[\d.]+/g).slice(0,2).map(Number)); const values=path.match(/[\d.]+/g).slice(2).map(Number); for(let i=0;i<values.length;i+=2)earthContext.lineTo(values[i],values[i+1]); earthContext.closePath(); earthContext.fill(); }
  earthContext.strokeStyle='rgba(230,246,250,.4)'; earthContext.lineWidth=5;
  for(let i=0;i<7;i++){earthContext.beginPath();earthContext.moveTo(-20,38+i*34);earthContext.bezierCurveTo(100,18+i*34,330,65+i*25,540,30+i*34);earthContext.stroke();}
  const earthTexture=new THREE.CanvasTexture(earthCanvas); earthTexture.colorSpace=THREE.SRGBColorSpace;
  const earth = new THREE.Mesh(new THREE.SphereGeometry(.34,32,24), new THREE.MeshStandardMaterial({map:earthTexture,roughness:.78,emissive:0x09233b})); scene.add(earth);
  const clouds=new THREE.Mesh(new THREE.SphereGeometry(.347,32,24),new THREE.MeshBasicMaterial({map:earthTexture,transparent:true,opacity:.13,depthWrite:false})); earth.add(clouds);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.35,.006,4,100),new THREE.MeshBasicMaterial({color:0x9bc8bb,transparent:true,opacity:.2}));
  orbit.rotation.x=Math.PI/2.8; scene.add(orbit);
  if(!interactive){sun.visible=false;sunGlow.visible=false;earth.visible=false;orbit.visible=false;}
  scene.add(key.target);
  const starPositions = [];
  for (let i=0; i<190; i++) {
    const x = Math.sin(i*127.1)*10, y = Math.cos(i*311.7)*7;
    starPositions.push(x,y,-9-Math.abs(Math.sin(i*53))*4);
  }
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions,3));
  scene.add(new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0x8c919d, size: .018, transparent: true, opacity: .5, sizeAttenuation: true })));
  let controls;
  const home = new THREE.Vector3(0,0,9.5);
  let currentMode='globe';
  if (interactive) {
    camera.position.copy(home); camera.lookAt(0,0,0);
    controls = new OrbitControls(camera, canvas);
    controls.enablePan = false; controls.enableZoom = false; controls.minDistance = 6.5; controls.maxDistance = 14;
    controls.enableDamping = true; controls.dampingFactor = .08; controls.rotateSpeed = .55;
    controls.listenToKeyEvents(canvas);
    controls.addEventListener('start',()=>{manualCamera=true;cameraFlight=null;});
  } else {
    camera.position.set(0,0,6.6); moon.rotation.set(.1,-.35,-.16);
  }
  const markers = {};
  const stationGroup = new THREE.Group();
  scene.add(stationGroup);
  let roverMarker=null, manualCamera=false, cameraFlight=null;
  const chapterCameras=[home.clone(),new THREE.Vector3(.1,.1,9.5),new THREE.Vector3(-.1,.1,9.5),new THREE.Vector3(.1,-.1,9.5),home.clone()];
  const celestialLabels={};
  if(interactive) for(const [id,title] of [['sun','SUN · ILLUSTRATIVE'],['earth','EARTH · ILLUSTRATIVE'],['moon','MOON · ENHANCED RELIEF']]) { const label=document.createElement('span'); label.className='celestial-label'; label.textContent=title; host.append(label); celestialLabels[id]=label; }
  const terrain = new THREE.Group(); terrain.visible=false; scene.add(terrain);
  let surfacePoint=null;
  function placeOrbitalBodies() {
    if(currentMode!=='globe') return;
    const distance=interactive?9.5:6.6, spread=Math.max(1.7,Math.min(2.0,camera.aspect*distance*Math.tan(camera.fov*Math.PI/360)-.62));
    sun.position.set(-spread,interactive?1.95:1.25,0); earth.position.set(spread,interactive?1.55:.9,-.25); sunGlow.position.copy(sun.position); key.position.copy(sun.position);
  }
  if (interactive) {
    for (const [id, color] of [['a',0x94d7c7],['b',0x83bbdf]]) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(.024,12,12), new THREE.MeshBasicMaterial({ color, depthTest: true }));
      mesh.userData.candidate = id;
      scene.add(mesh);
      const label = document.createElement('span'); label.className = 'marker-label'; label.dataset.marker = id; label.textContent = id.toUpperCase(); label.hidden = true; host.append(label);
      markers[id] = { mesh, label };
    }
  }
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const activePointers = new Set();
  let down = null;
  if (interactive) {
    canvas.addEventListener('pointerdown', event => {
      activePointers.add(event.pointerId);
      if (activePointers.size === 1 && event.button === 0) down = { x:event.clientX, y:event.clientY, id:event.pointerId, time:performance.now(), moved:false };
      else down = null;
    });
    canvas.addEventListener('pointermove', event => {
      if (down && Math.hypot(event.clientX-down.x,event.clientY-down.y)>6) down.moved = true;
    });
    canvas.addEventListener('pointercancel', () => { down=null; activePointers.clear(); });
    canvas.addEventListener('pointerup', event => {
      activePointers.delete(event.pointerId);
      if (!down || down.id !== event.pointerId || down.moved || performance.now()-down.time>600) { down=null; return; }
      down = null;
      const rect = canvas.getBoundingClientRect();
      pointer.set((event.clientX-rect.left)/rect.width*2-1, -(event.clientY-rect.top)/rect.height*2+1);
      raycaster.setFromCamera(pointer,camera);
      const hit = raycaster.intersectObjects([moon,...Object.values(markers).map(marker => marker.mesh)])[0];
      if (!hit || currentMode==='surface') return;
      if (hit.object.userData.candidate) { onActivate(hit.object.userData.candidate); return; }
      const unit = moon.worldToLocal(hit.point.clone()).normalize();
      const lat = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(unit.y,-1,1)));
      const lon = THREE.MathUtils.radToDeg(Math.atan2(-unit.z,unit.x));
      onPick({ lat:Number(lat.toFixed(4)), lon:Number(lon.toFixed(4)) });
    });
  }
  let width=1, height=1, running=false, enabled=true, visible=true, frame=0, lastTime=0;
  const parallax = { x:0, y:0 };
  function resize() {
    width=host.clientWidth; height=host.clientHeight;
    if (!width || !height) return;
    camera.aspect=width/height; camera.updateProjectionMatrix(); renderer.setSize(width,height,false);
    placeOrbitalBodies();
    if (!interactive) {
      moon.position.set(width<600 ? .25 : .9, .3, 0);
      moon.scale.setScalar(width<600 ? 1.15 : 1.45);
    }
    draw();
  }
  function draw() {
    if (!width || !height) return;
    controls?.update();
    camera.updateMatrixWorld();
    for (const [id, {mesh,label}] of Object.entries(markers)) {
      const front = camera.position.clone().sub(mesh.position).dot(mesh.position)>0;
      const projected = mesh.position.clone().project(camera);
      const x=(projected.x*.5+.5)*width, y=(-projected.y*.5+.5)*height;
      label.hidden=!mesh.visible || !front || projected.z>1 || x<10 || x>width-35 || y<10 || y>height-10;
      label.style.left=`${Math.max(6,Math.min(x+(id==='a'?-34:12),width-29))}px`; label.style.top=`${Math.min(y+26,height-27)}px`;
    }
    for(const [id,object] of [['sun',sun],['earth',earth],['moon',moon]]) if(celestialLabels[id]) {
      const projected=object.getWorldPosition(new THREE.Vector3()).project(camera), x=(projected.x*.5+.5)*width, y=(-projected.y*.5+.5)*height;
      const shown=interactive && currentMode==='globe' && projected.z<1 && x>35 && x<width-35 && y>20 && y<height-20;
      celestialLabels[id].hidden=!shown; celestialLabels[id].style.left=`${Math.max(76,Math.min(x,width-76))}px`; celestialLabels[id].style.top=`${y+20}px`;
    }
    renderer.render(scene,camera);
  }
  function tick(time) {
    if (!running) return;
    if(cameraFlight){const p=Math.min(1,(time-cameraFlight.started)/420);camera.position.lerpVectors(cameraFlight.from,cameraFlight.to,1-Math.pow(1-p,3));if(p>=1)cameraFlight=null;}
    const delta=lastTime ? Math.min((time-lastTime)/1000,.05) : 0; lastTime=time;
    if (!interactive && !reducedMotion.matches) {
      moon.rotation.y+=delta*.012;
      camera.position.x+=(parallax.x-camera.position.x)*.025;
      camera.position.y+=(parallax.y-camera.position.y)*.025;
      camera.lookAt(0,0,0);
    }
    draw();
    frame=requestAnimationFrame(tick);
  }
  function updateRunning() {
    const shouldRun=enabled && visible && !document.hidden && (interactive || !reducedMotion.matches);
    if (shouldRun===running) { if (!running && enabled) draw(); return; }
    running=shouldRun; lastTime=0;
    if (running) frame=requestAnimationFrame(tick); else { cancelAnimationFrame(frame); if (enabled && visible) draw(); }
  }
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries => { visible=entries[0].isIntersecting; updateRunning(); },{threshold:.01}).observe(host);
  document.addEventListener('visibilitychange',updateRunning);
  reducedMotion.addEventListener('change',updateRunning);
  if (!interactive) host.parentElement.addEventListener('pointermove',event => {
    if (reducedMotion.matches) return;
    const box=host.getBoundingClientRect(); parallax.x=((event.clientX-box.left)/box.width-.5)*.1;parallax.y=-((event.clientY-box.top)/box.height-.5)*.07;
  });
  message?.remove(); resize(); updateRunning();
  return {
    setMode(mode, point) {
      currentMode=mode==='surface'?'surface':'globe'; manualCamera=false; cameraFlight=null;
      if (currentMode==='surface') {
        surfacePoint=point||surfacePoint||{lat:-89,lon:0};
        const normal=positionFor(surfacePoint,1).normalize();
        terrain.clear();
        const geometry=new THREE.BufferGeometry(), positions=[], colors=[], uvs=[], indices=[]; const nx=88,nz=96;
        for(let j=0;j<=nz;j++) for(let i=0;i<=nx;i++) {
          const x=(i/nx-.5)*20, z=.25+j/nz*23;
          const ridge=.95*Math.exp(-((x+3.1)**2/3.2+(z-7.2)**2/8))+.8*Math.exp(-((x-3.8)**2/4+(z-10.5)**2/12))+.56*Math.exp(-((x-.1)**2/7+(z-14.8)**2/5));
          const hills=.92*Math.exp(-((x+1.2)**2/1.2+(z-5.1)**2/3.5))+.68*Math.exp(-((x-1.8)**2/1.7+(z-4.1)**2/2.4));
          const noise=(Math.sin(x*2.4+z*1.3)*Math.sin(z*2.8-x*.7))*.11;
          const rough=(Math.sin(x*7.1+z*4.3)*Math.sin(z*8.3-x*5.2))*.075;
          const y=-.48+ridge+hills+noise+rough; positions.push(x,y,-z); uvs.push(i/nx*8,j/nz*8);
          const shade=.34+Math.max(0,ridge+hills)*.2+noise*.1+rough*.25; colors.push(shade*.91,shade*.96,shade);
          if(i<nx&&j<nz){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;indices.push(a,c,b,b,c,d);}
        }
        geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3)); geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2)); geometry.setIndex(indices); geometry.computeVertexNormals();
        terrain.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:terrainTexture,bumpMap:terrainRelief,bumpScale:.08,vertexColors:true,roughness:1,metalness:0,side:THREE.DoubleSide})));
        terrain.visible=true; moon.visible=false; orbit.visible=false;
        for(const marker of Object.values(markers))marker.mesh.visible=false; stationGroup.visible=false; if(roverMarker)roverMarker.visible=false;
        controls.minDistance=.3; controls.maxDistance=16;
        camera.up.set(0,1,0); camera.position.set(0,.15,1); controls.target.set(0,-.2,-8); camera.lookAt(controls.target); controls.update(); controls.enabled=false;
        sun.position.set(-1.2,2,-8); sunGlow.position.copy(sun.position); key.position.copy(sun.position); key.target.position.set(0,0,-9);
        earth.position.set(1.3,1.5,-10);
      } else {
        terrain.visible=false; camera.up.set(0,1,0); moon.visible=true; orbit.visible=true; stationGroup.visible=true; if(roverMarker)roverMarker.visible=true;
        for(const marker of Object.values(markers))marker.mesh.visible=Boolean(marker.point);
        controls.enabled=true; controls.minDistance=6.5; controls.maxDistance=14;
        camera.position.copy(home); controls.target.set(0,0,0); controls.update(); key.target.position.set(0,0,0);
        placeOrbitalBodies();
      }
      draw();
    },
    setEnabled(value) { enabled=value; if(value) resize(); updateRunning(); },
    setCandidates(a,b) { for (const [id,candidate] of [['a',a],['b',b]]) if(markers[id]) { markers[id].point=candidate; markers[id].mesh.visible=currentMode==='globe'&&Boolean(candidate); if(candidate) markers[id].mesh.position.copy(positionFor(candidate)); } draw(); },
    focusSite(point) { if (controls && point) { if(currentMode==='surface')this.setMode('surface',point);else{manualCamera=true;controls.minDistance=2.1;cameraFlight={from:camera.position.clone(),to:positionFor(point,5.5),started:performance.now()};controls.target.set(0,0,0);draw();} } },
    reset() { if(controls)this.setMode(currentMode,surfacePoint); },
    setChapter(index) { if(controls&&currentMode==='globe'&&!manualCamera){const target=chapterCameras[index]||home;if(reducedMotion.matches){camera.position.copy(target);controls.update();draw();}else cameraFlight={from:camera.position.clone(),to:target,started:performance.now()};} },
    setActiveCandidate(id) { for(const [key,marker] of Object.entries(markers)){marker.mesh.material.color.setHex(key===id?0x94d7c7:0x71837b);marker.mesh.scale.setScalar(key===id?1.45:1);}draw(); },
    setStations(stations=[]) { stationGroup.clear();let previous=null;for(const station of stations){const position=positionFor({lat:station.lat,lon:station.lon},1.676);const marker=new THREE.Mesh(new THREE.SphereGeometry(.018,10,10),new THREE.MeshBasicMaterial({color:0x94d7c7}));marker.position.copy(position);stationGroup.add(marker);if(previous){const geometry=new THREE.BufferGeometry().setFromPoints([previous,position]);stationGroup.add(new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0x94d7c7,transparent:true,opacity:.55})));}previous=position;}if(!roverMarker){roverMarker=new THREE.Mesh(new THREE.OctahedronGeometry(.024,0),new THREE.MeshBasicMaterial({color:0xe2b96f}));scene.add(roverMarker);}if(previous)roverMarker.position.copy(previous);draw(); },
    setTrainingPosition(value) { const points=stationGroup.children.filter(item=>item.isMesh);if(!roverMarker||!points.length)return;const start=markers.a?.mesh.position||points[0].position,end=points[Math.min(1,points.length-1)].position;roverMarker.position.copy(start).lerp(end,Math.max(0,Math.min(1,value)));draw(); },
    zoom(factor) { if(controls) { if(currentMode==='surface')camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);else camera.position.multiplyScalar(factor); controls.update();draw(); } }
  };
}
