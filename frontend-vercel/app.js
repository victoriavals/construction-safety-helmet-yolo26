/* ============================================================================
 * Frontend — memanggil backend FastAPI (Hugging Face) untuk deteksi helm.
 * Upload gambar / video / contoh bawaan. Tanpa inference di browser.
 * ========================================================================== */
const API = (window.API_BASE || "").replace(/\/$/, "");
const CLASSES = ["Helmet", "No-Helmet", "Person"];
const COLORS = ["#4c72b0", "#c44e52", "#55a868"];
const EXAMPLES = ["examples/example1.jpg", "examples/example2.jpg",
                  "examples/example3.jpg", "examples/example4.jpg"];

let conf = 0.25, iou = 0.45;
const $ = (id) => document.getElementById(id);

/* ----------------------------- Health check ----------------------------- */
async function checkApi() {
  if (!API || API.includes("GANTI")) {
    return setStatus("error", "❌ Atur URL backend di config.js (window.API_BASE).");
  }
  try {
    const r = await fetch(API + "/", { method: "GET" });
    if (!r.ok) throw new Error(r.status);
    setStatus("ready", "✅ Server terhubung");
  } catch (e) {
    setStatus("error", "❌ Server tidak merespons (mungkin sedang 'bangun tidur' — coba lagi sebentar).");
  }
}
function setStatus(cls, text) {
  const el = $("apiStatus"); el.className = "status " + cls; el.textContent = text;
}

/* ----------------------------- UI helpers ------------------------------- */
function showSpinner(on) { $("spinner").hidden = !on; }
function showImage(src) {
  $("resultVideo").hidden = true; $("resultVideo").pause?.();
  const im = $("resultImg"); im.src = src; im.hidden = false; $("viewHint").style.display = "none";
}
function showVideo(url) {
  $("resultImg").hidden = true;
  const v = $("resultVideo"); v.src = url; v.hidden = false; $("viewHint").style.display = "none"; v.play().catch(() => {});
}
function renderStats(data) {
  const counts = data.counts || {};
  $("counts").innerHTML = CLASSES.map((c, i) =>
    `<div class="crow"><span><i style="background:${COLORS[i]}"></i>${c}</span><b>${counts[c] ?? 0}</b></div>`).join("");
  $("total").textContent = data.total ?? "—";
  $("ms").textContent = data.time_ms != null ? `${data.time_ms} ms` : "—";
  const nh = data.no_helmet ?? 0;
  $("k3warn").hidden = nh === 0; $("k3count").textContent = nh;
}
function clearStats() { $("counts").innerHTML = ""; $("total").textContent = "—"; $("ms").textContent = "—"; $("k3warn").hidden = true; }

/* ----------------------------- API calls -------------------------------- */
async function predictImage(blob) {
  showSpinner(true); clearStats();
  try {
    const fd = new FormData(); fd.append("file", blob, "image.jpg");
    const r = await fetch(`${API}/predict/image?conf=${conf}&iou=${iou}`, { method: "POST", body: fd });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();
    showImage(data.annotated);
    renderStats(data);
  } catch (e) {
    alert("Gagal memproses gambar: " + e.message + "\n(Backend mungkin cold-start, coba lagi.)");
  } finally { showSpinner(false); }
}

async function predictVideo(file) {
  showSpinner(true); clearStats();
  $("apiStatus").textContent = "⏳ Memproses video (bisa lama di CPU)…"; $("apiStatus").className = "status loading";
  try {
    const fd = new FormData(); fd.append("file", file, file.name || "video.mp4");
    const r = await fetch(`${API}/predict/video?conf=${conf}&iou=${iou}`, { method: "POST", body: fd });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const blob = await r.blob();
    showVideo(URL.createObjectURL(blob));
    setStatus("ready", "✅ Video selesai diproses");
  } catch (e) {
    alert("Gagal memproses video: " + e.message);
    setStatus("error", "❌ Gagal memproses video");
  } finally { showSpinner(false); }
}

/* ----------------------------- Handlers --------------------------------- */
$("imageInput").addEventListener("change", e => e.target.files[0] && predictImage(e.target.files[0]));
$("videoInput").addEventListener("change", e => e.target.files[0] && predictVideo(e.target.files[0]));

const grid = $("exampleGrid");
EXAMPLES.forEach(src => {
  const im = document.createElement("img");
  im.src = src; im.loading = "lazy"; im.onerror = () => im.remove();
  im.onclick = async () => {
    const blob = await (await fetch(src)).blob();
    predictImage(blob);
    document.querySelector('.tab[data-tab="image"]').click();
  };
  grid.appendChild(im);
});

document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  btn.classList.add("active"); $("panel-" + btn.dataset.tab).classList.add("active");
}));
$("conf").addEventListener("input", e => { conf = +e.target.value; $("confVal").textContent = conf.toFixed(2); });
$("iou").addEventListener("input", e => { iou = +e.target.value; $("iouVal").textContent = iou.toFixed(2); });

checkApi();
