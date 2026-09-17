// Photographic landscapes with local motion and the reference sky's soft film treatment.
// All masks use coordinates in the source photograph, measured from its top left.
export const LANDSCAPE_SCENES = {
  fuji: {
    crop: [.51, .48], mobileCrop: [.51, .49], kind: 1,
    water: [[.10,.61],[.72,.59],[.71,.88],[.51,.90],[.21,.73]],
    water2: [], waterTop: .57, waterBottom: .94, waterFeather: .025,
    waterStrength: .00105, waterBrightness: .005,
    mistCenter: [.54,.48], mistRadius: [.57,.095], mistStrength: .017,
    mistColor: [.72,.70,.77], shadowStrength: 0,
    exposure: .08, softness: 1.8, grain: .030,
  },
  forest: {
    crop: [.50,.43], mobileCrop: [.50,.48], kind: 2,
    water: [], water2: [], waterTop: 0, waterBottom: 1, waterFeather: .02,
    waterStrength: 0, waterBrightness: 0,
    mistCenter: [.52,.385], mistRadius: [.72,.19], mistStrength: .072,
    mistColor: [.68,.73,.71], shadowStrength: 0,
    exposure: .16, softness: 1.7, grain: .030,
  },
  coast: {
    crop: [.55,.54], mobileCrop: [.66,.54], kind: 3,
    water: [[.775,.42],[1,.42],[1,.71],[.79,.735],[.73,.61]],
    water2: [[.015,.755],[.22,.70],[.72,.665],[.75,.77],[.68,1],[0,1]],
    waterTop: .40, waterBottom: 1, waterFeather: .018,
    waterStrength: .00145, waterBrightness: .005,
    mistCenter: [.79,.40], mistRadius: [.42,.08], mistStrength: .007,
    mistColor: [.71,.73,.70], shadowStrength: 0,
    exposure: .13, softness: 1.9, grain: .030,
  },
  hills: {
    crop: [.51,.51], mobileCrop: [.56,.51], kind: 4,
    water: [], water2: [], waterTop: 0, waterBottom: 1, waterFeather: .02,
    waterStrength: 0, waterBrightness: 0,
    mistCenter: [.57,.465], mistRadius: [.64,.045], mistStrength: .008,
    mistColor: [.70,.76,.79], shadowStrength: .029,
    exposure: .10, softness: 1.8, grain: .030,
  },
  tides: {
    crop: [.50,.50], mobileCrop: [.66,.50], kind: 5,
    water: [[.735,0],[1,0],[1,1],[.755,1]], water2: [],
    waterTop: 0, waterBottom: 1, waterFeather: .018,
    waterStrength: .00095, waterBrightness: .006,
    mistCenter: [0,0], mistRadius: [1,1], mistStrength: 0,
    mistColor: [.70,.79,.78], shadowStrength: 0,
    exposure: .12, softness: 1.6, grain: .030,
  },
  lake: {
    // Mountain over a still lake at dawn. The shoreline runs level at .67; the
    // cloud band sits around the mountain's base between .48 and .63.
    crop: [.51,.50], mobileCrop: [.51,.50], kind: 6,
    water: [[0,.672],[1,.672],[1,1],[0,1]], water2: [],
    waterTop: .66, waterBottom: 1, waterFeather: .02,
    waterStrength: .0011, waterBrightness: .005,
    mistCenter: [.50,.56], mistRadius: [.60,.075], mistStrength: .022,
    mistColor: [.86,.84,.86], shadowStrength: 0,
    exposure: .10, softness: 1.8, grain: .030,
  },
};

const VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = vec2(aPosition.x * .5 + .5, .5 - aPosition.y * .5);
  gl_Position = vec4(aPosition, 0., 1.);
}`;

const FRAGMENT = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPhoto;
uniform vec2 uPhotoTexel;
uniform vec2 uScale, uCenter, uPointer;
uniform float uTime, uMotion, uKind;
uniform vec2 uWater[9], uWater2[9];
uniform int uWaterCount, uWaterCount2;
uniform vec4 uWaterSettings;
uniform float uWaterBrightness;
uniform vec2 uMistCenter, uMistRadius;
uniform vec3 uMistColor;
uniform float uMistStrength, uShadowStrength;
uniform float uExposure, uSoftness, uGrain;

vec3 photograph(vec2 uv) {
  vec2 tap = uPhotoTexel * uSoftness;
  vec3 color = texture2D(uPhoto,uv).rgb * .44;
  color += texture2D(uPhoto,uv + vec2(tap.x,tap.y)).rgb * .14;
  color += texture2D(uPhoto,uv + vec2(-tap.x,tap.y)).rgb * .14;
  color += texture2D(uPhoto,uv + vec2(tap.x,-tap.y)).rgb * .14;
  color += texture2D(uPhoto,uv - tap).rgb * .14;
  return color;
}

vec3 filmColor(vec3 source) {
  float luminance = dot(source,vec3(.2126,.7152,.0722));
  float value = pow(clamp(luminance * exp2(uExposure),0.,1.),.88);
  // Continuous lightness follows the photograph. The central blue comes
  // from the original scene, with softer light-blue and warm cloud highlights.
  vec3 blueShade = vec3(74.,104.,146.) / 255.;
  vec3 blue = vec3(115.,154.,208.) / 255.;
  vec3 blueLight = vec3(173.,195.,224.) / 255.;
  vec3 peachShade = vec3(205.,146.,120.) / 255.;
  vec3 peach = vec3(238.,188.,154.) / 255.;
  vec3 cream = vec3(246.,223.,193.) / 255.;
  vec3 cool = mix(blueShade,blue,smoothstep(.015,.55,value));
  cool = mix(cool,blueLight,smoothstep(.55,1.,value)*.76);
  vec3 warm = mix(peachShade,peach,smoothstep(.25,.82,value));
  warm = mix(warm,cream,smoothstep(.78,1.,value));

  // Fuji keeps its photographed sunset gradient and thin lit clouds.
  // Fog and reflected light get a gentle warm wash rather than a solid fill.
  float warmth = smoothstep(-.035,.19,source.r-source.b) * smoothstep(.30,.68,value);
  if (uKind > 1.5 && uKind < 2.5) {
    warmth = smoothstep(.48,.92,value)*.86;
  } else if (uKind > 2.5 && uKind < 3.5) {
    warmth = smoothstep(.55,.97,value)*.88;
  } else if (uKind > 3.5 && uKind < 4.5) {
    warmth = smoothstep(-.02,.16,source.r-source.b) * smoothstep(.20,.72,value)*.80;
  } else if (uKind > 4.5 && uKind < 5.5) {
    warmth = smoothstep(.58,.94,value)*.84;
  } else if (uKind > 5.5) {
    // The lake keeps its photographed dawn: pink cloud and lit peak stay warm,
    // the blue sky and the water stay cool.
    warmth = smoothstep(-.03,.17,source.r-source.b) * smoothstep(.26,.70,value)*.90;
  }
  vec3 color = mix(cool,warm,warmth);
  float transition = 4. * warmth * (1.-warmth);
  // A little warm light keeps the soft blue/peach boundary airy. The small
  // red bias leaves only a pale pink tint in the atmospheric shading.
  color += vec3(.060,.035,.025) * transition * transition;
  return color;
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 cell = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hash(cell), hash(cell + vec2(1.,0.)), f.x),
             mix(hash(cell + vec2(0.,1.)), hash(cell + vec2(1.,1.)), f.x), f.y);
}
float field(vec2 p) {
  return .65 * noise(p) + .25 * noise(p * 2.07 + 13.2) + .10 * noise(p * 4.13 + 28.8);
}
float cross2(vec2 a, vec2 b) { return a.x * b.y - a.y * b.x; }
float polygonMask(vec2 p, bool second) {
  int count = second ? uWaterCount2 : uWaterCount;
  if (count < 3) return 0.;
  float distanceToEdge = 10., inside = 1.;
  for (int i = 0; i < 8; i++) {
    if (i >= count) break;
    vec2 previous = second ? uWater2[i] : uWater[i];
    vec2 next = second ? uWater2[i+1] : uWater[i+1];
    vec2 edge = next - previous, relative = p - previous;
    inside *= step(0., cross2(edge, relative));
    float along = clamp(dot(relative, edge) / max(dot(edge, edge), .00001), 0., 1.);
    distanceToEdge = min(distanceToEdge, length(relative - edge * along));
  }
  return smoothstep(-uWaterSettings.z, uWaterSettings.z, distanceToEdge * (inside * 2. - 1.));
}

void main() {
  vec2 uv = (vUv - .5) * uScale + uCenter + uPointer * uScale * .006 * uMotion;
  vec3 original = photograph(uv);
  float luminance = dot(original, vec3(.2126,.7152,.0722));
  float water = max(polygonMask(uv, false), polygonMask(uv, true));
  // Dark foreground branches and rocks remain steady inside a broad water mask.
  water *= smoothstep(.12, .30, luminance);
  if (uKind > 4.5 && uKind < 5.5) {
    // Water in the aerial photograph has a stronger blue/green component than sand.
    water *= smoothstep(-.04, .045, original.b - original.r);
  }
  float depth = clamp((uv.y - uWaterSettings.x) / max(.05, uWaterSettings.y - uWaterSettings.x), 0., 1.);
  if (uKind > 4.5 && uKind < 5.5) depth = .75;
  float t = uTime;
  float waveA = sin(dot(uv,vec2(111.,182.)) - t * 1.05 + .35 * sin(uv.x * 37. + t * .31));
  float waveB = sin(dot(uv,vec2(-78.,281.)) + t * .76 + .4 * sin(uv.y * 48.));
  float waveC = sin(dot(uv,vec2(41.,431.)) - t * .58);
  vec2 displacement = vec2(waveA * .62 + waveB * .38, waveB * .16 + waveC * .10);
  displacement *= uWaterSettings.w * water * (.12 + .88 * depth * depth) * uMotion;
  vec3 color = photograph(uv + displacement);
  color += vec3((waveA * .5 + waveB * .3 + waveC * .2) * water * depth * uWaterBrightness * uMotion);

  // Two slow layers sit inside the photograph's existing distant atmosphere.
  vec2 mistUv = (uv - uMistCenter) / max(uMistRadius,vec2(.001));
  float mistMask = exp(-dot(mistUv,mistUv) * 1.45);
  if (uKind > 1.5 && uKind < 2.5) {
    mistMask *= smoothstep(.19,.50,luminance);
  }
  float farMist = field(uv * vec2(5.4,14.) + vec2(t * .008, t * -.0013));
  float nearMist = field(uv * vec2(9.2,22.) + vec2(-t * .012, t * .0015) + 19.);
  float mist = (smoothstep(.30,.78,farMist) * .64 + smoothstep(.38,.75,nearMist) * .36);
  color = mix(color, uMistColor, mist * mistMask * uMistStrength * uMotion);

  // Broad moving illumination follows the existing hills, retaining their detail.
  float ground = smoothstep(.515,.57,uv.y) * (1. - smoothstep(.78,.97,uv.y));
  float shadow = smoothstep(.27,.78,field(uv * vec2(5.7,13.) + vec2(t * .013, -t * .004)));
  color *= 1. - shadow * ground * uShadowStrength * uMotion;
  color = filmColor(color);
  float grainFrame = floor(uTime * 24.);
  float grain = hash(floor(gl_FragCoord.xy) + vec2(grainFrame,grainFrame*1.317)) - .5;
  color += vec3(grain * uGrain);
  gl_FragColor = vec4(clamp(color,0.,1.),1.);
}`;

function paddedPolygon(points) {
  const values = new Float32Array(18);
  points.slice(0,8).forEach((point,index) => values.set(point,index*2));
  if (points.length) values.set(points[0],Math.min(8,points.length)*2);
  return values;
}

export function createLandscapeHero(host, options = {}) {
  const variant = Object.hasOwn(LANDSCAPE_SCENES, options.variant) ? options.variant : 'fuji';
  const config = {...LANDSCAPE_SCENES[variant], ...options.config};
  const classes = {host:'landscape-scene', canvas:'landscape-canvas', drawn:'drawn', unsupported:'unsupported', ...options.classes};
  const canvas = document.createElement('canvas');
  canvas.className = classes.canvas;
  canvas.setAttribute('aria-hidden','true');
  host.classList.add(classes.host);
  host.appendChild(canvas);
  const gl = canvas.getContext('webgl', {alpha:false, antialias:false, depth:false, stencil:false, powerPreference:'low-power'});
  if (!gl) {
    canvas.remove();
    host.classList.add(classes.unsupported);
    options.onUnsupported?.();
    return null;
  }

  let disposed = false, lost = false, loaded = false, ready = false;
  let visible = true, frame = 0, lastFrame = 0, elapsed = 0, draws = 0;
  let width = 1, height = 1, imageWidth = 1, imageHeight = 1;
  let program = null, buffer = null, texture = null, locations = {};
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = [0,0], target = [0,0];
  const listeners = [];
  const image = new Image();

  function listen(element,event,callback,settings) {
    element.addEventListener(event,callback,settings);
    listeners.push([element,event,callback,settings]);
  }
  function unsupported(error) {
    if (disposed) return;
    cancelAnimationFrame(frame);
    frame = 0;
    ready = false;
    canvas.classList.remove(classes.drawn);
    host.classList.add(classes.unsupported);
    options.onUnsupported?.(error);
  }
  function compile(type,source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader,source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message || 'Landscape shader failed to compile');
    }
    return shader;
  }
  function initialize() {
    const vertex = compile(gl.VERTEX_SHADER,VERTEX);
    const fragment = compile(gl.FRAGMENT_SHADER,FRAGMENT);
    program = gl.createProgram();
    gl.attachShader(program,vertex);
    gl.attachShader(program,fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program,'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    for (const name of ['uPhoto','uPhotoTexel','uScale','uCenter','uPointer','uTime','uMotion','uKind','uWater[0]','uWater2[0]','uWaterCount','uWaterCount2','uWaterSettings','uWaterBrightness','uMistCenter','uMistRadius','uMistColor','uMistStrength','uShadowStrength','uExposure','uSoftness','uGrain']) {
      locations[name] = gl.getUniformLocation(program,name);
    }
    texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.uniform1i(locations.uPhoto,0);
    gl.uniform1f(locations.uKind,config.kind);
    gl.uniform2fv(locations['uWater[0]'],paddedPolygon(config.water));
    gl.uniform2fv(locations['uWater2[0]'],paddedPolygon(config.water2));
    gl.uniform1i(locations.uWaterCount,config.water.length);
    gl.uniform1i(locations.uWaterCount2,config.water2.length);
    gl.uniform4f(locations.uWaterSettings,config.waterTop,config.waterBottom,config.waterFeather,config.waterStrength);
    gl.uniform1f(locations.uWaterBrightness,config.waterBrightness);
    gl.uniform2fv(locations.uMistCenter,config.mistCenter);
    gl.uniform2fv(locations.uMistRadius,config.mistRadius);
    gl.uniform3fv(locations.uMistColor,config.mistColor);
    gl.uniform1f(locations.uMistStrength,config.mistStrength);
    gl.uniform1f(locations.uShadowStrength,config.shadowStrength);
    gl.uniform1f(locations.uExposure,config.exposure);
    gl.uniform1f(locations.uSoftness,config.softness);
    gl.uniform1f(locations.uGrain,config.grain);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    if (loaded) upload();
  }
  function upload() {
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);
    imageWidth = image.naturalWidth;
    imageHeight = image.naturalHeight;
    gl.uniform2f(locations.uPhotoTexel,1/imageWidth,1/imageHeight);
    resize();
  }
  function draw() {
    if (disposed || lost || !loaded || !program) return;
    const viewAspect = width/height, photoAspect = imageWidth/imageHeight;
    const overscan = media.matches ? 1 : 1.018;
    const scale = [Math.min(1,viewAspect/photoAspect)/overscan,Math.min(1,photoAspect/viewAspect)/overscan];
    const crop = viewAspect < .9 ? config.mobileCrop : config.crop;
    const center = crop.map((value,index) => Math.max(scale[index]/2,Math.min(1-scale[index]/2,value)));
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.useProgram(program);
    gl.uniform2fv(locations.uScale,scale);
    gl.uniform2fv(locations.uCenter,center);
    gl.uniform2fv(locations.uPointer,pointer);
    gl.uniform1f(locations.uTime,elapsed);
    gl.uniform1f(locations.uMotion,media.matches ? 0 : 1);
    gl.drawArrays(gl.TRIANGLES,0,6);
    draws++;
    if (!ready) {
      ready = true;
      host.classList.remove(classes.unsupported);
      canvas.classList.add(classes.drawn);
    }
  }
  function running() { return !disposed && !lost && loaded && visible && !document.hidden && !media.matches; }
  function tick(now) {
    frame = 0;
    if (!running()) return;
    if (!lastFrame || now-lastFrame >= 1000/30) {
      const delta = lastFrame ? Math.min((now-lastFrame)/1000,.075) : 0;
      lastFrame = now;
      elapsed += delta;
      const smoothing = 1-Math.exp(-delta*3.3);
      pointer[0] += (target[0]-pointer[0])*smoothing;
      pointer[1] += (target[1]-pointer[1])*smoothing;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function schedule() {
    if (!running()) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
    } else if (!frame) frame = requestAnimationFrame(tick);
  }
  function resize() {
    if (disposed || lost) return;
    width = Math.max(1,host.clientWidth);
    height = Math.max(1,host.clientHeight);
    const ratio = Math.min(devicePixelRatio || 1,1.5);
    const nextWidth = Math.round(width*ratio), nextHeight = Math.round(height*ratio);
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }
    draw();
    schedule();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    frame = 0;
    image.onload = image.onerror = null;
    image.src = '';
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    listeners.forEach(([element,event,callback,settings]) => element.removeEventListener(event,callback,settings));
    if (!lost) {
      if (texture) gl.deleteTexture(texture);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
    }
    canvas.remove();
  }

  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  const intersectionObserver = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? true;
    schedule();
  },{threshold:0});
  resizeObserver?.observe(host);
  intersectionObserver?.observe(host);
  listen(window,'resize',resize,{passive:true});
  listen(document,'visibilitychange',schedule);
  listen(media,'change',() => {pointer.fill(0); target.fill(0); draw(); schedule();});
  listen(host,'pointermove',event => {
    if (media.matches || event.pointerType === 'touch') return;
    const rect = host.getBoundingClientRect();
    target[0] = Math.max(-1,Math.min(1,(event.clientX-rect.left)/Math.max(1,rect.width)*2-1));
    target[1] = Math.max(-1,Math.min(1,(event.clientY-rect.top)/Math.max(1,rect.height)*2-1));
  },{passive:true});
  listen(host,'pointerleave',() => target.fill(0),{passive:true});
  listen(canvas,'webglcontextlost',event => {
    event.preventDefault();
    lost = true;
    unsupported(new Error('Landscape graphics context was lost'));
  });
  listen(canvas,'webglcontextrestored',() => {
    if (disposed) return;
    lost = false;
    try {initialize(); schedule();} catch (error) {unsupported(error);}
  });
  image.onload = () => {
    if (disposed) return;
    loaded = true;
    if (lost) return;
    try {upload(); schedule();} catch (error) {unsupported(error);}
  };
  image.onerror = () => unsupported(new Error('Landscape photograph could not load: '+variant));
  try {
    initialize();
    image.src = new URL('./assets/'+variant+'.jpg',import.meta.url).href;
  } catch (error) {
    unsupported(error);
  }
  options.onLook?.('day');
  return {
    setLook() {options.onLook?.('day');},
    setShelters() {},
    dispose,
    get ready() {return ready;},
    get paused() {return !running();},
    get elapsed() {return elapsed;},
    get draws() {return draws;},
    get variant() {return variant;},
  };
}
