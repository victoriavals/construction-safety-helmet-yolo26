/* ============================================================================
 * Demo deteksi helm konstruksi — inference YOLO26s di BROWSER (ONNX Runtime Web)
 * 100% client-side: tak ada server, tak ada upload ke mana pun.
 * ========================================================================== */

const MODEL_URL = "./model/best.onnx";   // export dari src/export_model.py, taruh di sini
const INPUT = 640;                         // ukuran input model (sesuai export)
const CLASSES = ["Helmet", "No-Helmet", "Person"];
const COLORS = ["#4c72b0", "#c44e52", "#55a868"];
const EXAMPLES = ["examples/example1.jpg", "examples/example2.jpg",
                  "examples/example3.jpg", "examples/example4.jpg"];

let session = null, backend = "—";
let conf = 0.25, iou = 0.45;
let rafId = null, busy = false;            // untuk loop video/webcam
let stream = null;

const $ = (id) => document.getElementById(id);
const view = $("view"), vctx = view.getContext("2d");
const videoEl = $("video");

/* ----------------------------- Muat model ------------------------------- */
async function initModel() {
  ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";
  const tryEP = async (eps) => ort.InferenceSession.create(MODEL_URL, { executionProviders: eps });
  try {
    try { session = await tryEP(["webgpu"]); backend = "WebGPU"; }
    catch { session = await tryEP(["wasm"]); backend = "WASM (CPU)"; }
    $("backend").textContent = backend;
    setStatus("ready", "✅ Model siap — " + backend);
  } catch (e) {
    console.error(e);
    setStatus("error",
      "❌ Gagal memuat model. Pastikan file ada di webdemo/model/best.onnx " +
      "(export dari: python src/export_model.py --weights ... --format onnx).");
  }
}
function setStatus(cls, text) {
  const el = $("modelStatus"); el.className = "status " + cls; el.textContent = text;
}

/* --------------------- Pre-processing: letterbox 640 -------------------- */
// Mengubah gambar apa pun -> kanvas 640x640 (resize jaga rasio + padding 114),
// sama persis dengan yang dilakukan Ultralytics saat training.
const lbCanvas = document.createElement("canvas");
lbCanvas.width = INPUT; lbCanvas.height = INPUT;
const lbCtx = lbCanvas.getContext("2d", { willReadFrequently: true });

function letterbox(src, w, h) {
  const r = Math.min(INPUT / w, INPUT / h);
  const nw = Math.round(w * r), nh = Math.round(h * r);
  const padX = Math.floor((INPUT - nw) / 2), padY = Math.floor((INPUT - nh) / 2);
  lbCtx.fillStyle = "rgb(114,114,114)";
  lbCtx.fillRect(0, 0, INPUT, INPUT);
  lbCtx.drawImage(src, 0, 0, w, h, padX, padY, nw, nh);
  return { r, padX, padY };
}

function toTensor() {
  const { data } = lbCtx.getImageData(0, 0, INPUT, INPUT);
  const plane = INPUT * INPUT;
  const arr = new Float32Array(plane * 3);
  for (let i = 0; i < plane; i++) {
    arr[i] = data[i * 4] / 255;             // R
    arr[i + plane] = data[i * 4 + 1] / 255; // G
    arr[i + 2 * plane] = data[i * 4 + 2] / 255; // B
  }
  return new ort.Tensor("float32", arr, [1, 3, INPUT, INPUT]);
}

/* ------------------ Post-processing: decode + NMS ----------------------- */
// Output Ultralytics ONNX (detect): [1, 4+nc, N] ATAU [1, N, 4+nc].
function decode(output, geo, origW, origH) {
  const dims = output.dims, d = output.data;
  const a = dims[1], b = dims[2];
  const ch = Math.min(a, b), N = Math.max(a, b);   // ch = 4+nc, N = jumlah anchor
  const chFirst = a < b;                            // true: [1,ch,N]
  const nc = ch - 4;
  const at = (k, i) => chFirst ? d[k * N + i] : d[i * ch + k];

  const dets = [];
  for (let i = 0; i < N; i++) {
    let best = -1, bestc = 0;
    for (let c = 0; c < nc; c++) {
      const s = at(4 + c, i);
      if (s > best) { best = s; bestc = c; }
    }
    if (best < conf) continue;
    const cx = at(0, i), cy = at(1, i), ww = at(2, i), hh = at(3, i);
    // letterbox-space -> koordinat gambar asli
    let x1 = (cx - ww / 2 - geo.padX) / geo.r;
    let y1 = (cy - hh / 2 - geo.padY) / geo.r;
    let x2 = (cx + ww / 2 - geo.padX) / geo.r;
    let y2 = (cy + hh / 2 - geo.padY) / geo.r;
    x1 = Math.max(0, Math.min(origW, x1)); y1 = Math.max(0, Math.min(origH, y1));
    x2 = Math.max(0, Math.min(origW, x2)); y2 = Math.max(0, Math.min(origH, y2));
    dets.push({ x1, y1, x2, y2, score: best, cls: bestc });
  }
  return nms(dets);
}

function iouBox(a, b) {
  const x1 = Math.max(a.x1, b.x1), y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2), y2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const ua = (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter;
  return ua > 0 ? inter / ua : 0;
}
function nms(dets) {
  dets.sort((p, q) => q.score - p.score);
  const keep = [];
  while (dets.length) {
    const m = dets.shift(); keep.push(m);
    dets = dets.filter(x => x.cls !== m.cls || iouBox(m, x) < iou);
  }
  return keep;
}

/* --------------------------- Inferensi + gambar ------------------------- */
async function detect(src, w, h) {
  if (!session) return;
  const geo = letterbox(src, w, h);
  const t0 = performance.now();
  const out = await session.run({ [session.inputNames[0]]: toTensor() });
  const dt = performance.now() - t0;
  const dets = decode(out[session.outputNames[0]], geo, w, h);
  draw(src, w, h, dets);
  updateStats(dets, dt);
}

function draw(src, w, h, dets) {
  view.width = w; view.height = h;
  vctx.drawImage(src, 0, 0, w, h);
  const lw = Math.max(2, Math.round(w / 400));
  vctx.lineWidth = lw; vctx.font = `${Math.max(14, Math.round(w / 55))}px sans-serif`;
  vctx.textBaseline = "bottom";
  for (const d of dets) {
    const col = COLORS[d.cls];
    vctx.strokeStyle = col;
    vctx.strokeRect(d.x1, d.y1, d.x2 - d.x1, d.y2 - d.y1);
    const label = `${CLASSES[d.cls]} ${(d.score * 100) | 0}%`;
    const tw = vctx.measureText(label).width + 8;
    const th = parseInt(vctx.font) + 6;
    vctx.fillStyle = col;
    vctx.fillRect(d.x1, Math.max(0, d.y1 - th), tw, th);
    vctx.fillStyle = "#fff";
    vctx.fillText(label, d.x1 + 4, Math.max(th - 2, d.y1 - 3));
  }
  $("viewHint").style.display = "none";
}

function updateStats(dets, dt) {
  const cnt = [0, 0, 0];
  dets.forEach(d => cnt[d.cls]++);
  $("counts").innerHTML = CLASSES.map((c, i) =>
    `<div class="crow"><span><i style="background:${COLORS[i]}"></i>${c}</span><b>${cnt[i]}</b></div>`).join("");
  $("total").textContent = dets.length;
  $("ms").textContent = `${dt.toFixed(0)} ms`;
  const noHelm = cnt[1];
  const warn = $("k3warn");
  warn.hidden = noHelm === 0;
  $("k3count").textContent = noHelm;
}

/* ------------------------------- Input handlers ------------------------- */
function loadImageFile(file) {
  const img = new Image();
  img.onload = () => detect(img, img.naturalWidth, img.naturalHeight);
  img.src = URL.createObjectURL(file);
}
$("imageInput").addEventListener("change", e => e.target.files[0] && loadImageFile(e.target.files[0]));

// --- Video & Webcam: loop deteksi per-frame (lewati frame bila masih sibuk) ---
function startLoop() {
  cancelAnimationFrame(rafId);
  const step = async () => {
    if (!videoEl.paused && !videoEl.ended && videoEl.videoWidth && !busy) {
      busy = true;
      await detect(videoEl, videoEl.videoWidth, videoEl.videoHeight);
      busy = false;
    }
    rafId = requestAnimationFrame(step);
  };
  step();
}
function stopLoop() { cancelAnimationFrame(rafId); rafId = null; }

$("videoInput").addEventListener("change", e => {
  const f = e.target.files[0]; if (!f) return;
  stopWebcam();
  videoEl.srcObject = null; videoEl.src = URL.createObjectURL(f);
  videoEl.loop = true; videoEl.play(); $("videoToggle").disabled = false;
  startLoop();
});
$("videoToggle").addEventListener("click", () => videoEl.paused ? videoEl.play() : videoEl.pause());

$("webcamStart").addEventListener("click", async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    videoEl.src = ""; videoEl.srcObject = stream; videoEl.loop = false;
    await videoEl.play();
    $("webcamStop").disabled = false;
    startLoop();
  } catch (e) { alert("Tidak bisa mengakses webcam: " + e.message); }
});
function stopWebcam() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  $("webcamStop").disabled = true;
}
$("webcamStop").addEventListener("click", () => { stopLoop(); stopWebcam(); });

// --- Contoh bawaan ---
const grid = $("exampleGrid");
EXAMPLES.forEach(src => {
  const im = document.createElement("img");
  im.src = src; im.loading = "lazy";
  im.onerror = () => im.remove();
  im.onclick = () => {
    const big = new Image();
    big.onload = () => detect(big, big.naturalWidth, big.naturalHeight);
    big.src = src;
  };
  grid.appendChild(im);
});

/* ------------------------------- Tabs & sliders ------------------------- */
document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  btn.classList.add("active");
  $("panel-" + btn.dataset.tab).classList.add("active");
  if (btn.dataset.tab !== "video" && btn.dataset.tab !== "webcam") { stopLoop(); stopWebcam(); videoEl.pause(); }
}));
$("conf").addEventListener("input", e => { conf = +e.target.value; $("confVal").textContent = conf.toFixed(2); });
$("iou").addEventListener("input", e => { iou = +e.target.value; $("iouVal").textContent = iou.toFixed(2); });

initModel();
