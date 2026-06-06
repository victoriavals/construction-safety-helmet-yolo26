"""Bangun 08_visual_insights.ipynb: banyak visualisasi yang menjelaskan
'mengapa' keputusan desain diambil, lalu eksekusi agar output tertanam.
Sekali pakai — hapus setelah dijalankan."""
from pathlib import Path
import nbformat
from nbformat.v4 import new_notebook, new_markdown_cell, new_code_cell

ROOT = Path(__file__).resolve().parent
NB = ROOT / "notebooks"

def md(s): return new_markdown_cell(s)
def code(s): return new_code_cell(s)

cells = []

cells.append(md(
"# 08 — Wawasan Visual: *Mengapa* keputusan desain ini?\n"
"## Construction Safety Helmet — YOLO26\n\n"
"Notebook ini **bukan sekadar plot**. Tiap bagian menjawab sebuah pertanyaan "
"desain proyek (mis. *kenapa `imgsz=640`?*, *kenapa No-Helmet sulit?*, "
"*kenapa split dianggap adil?*) dengan visualisasi langsung dari dataset.\n\n"
"Format tiap bagian: **❓ Pertanyaan → 📊 Visual → 💡 Mengapa ini penting**."))

cells.append(md("## Setup"))
cells.append(code('''\
import os, sys
from pathlib import Path

def find_project_root(start: Path) -> Path:
    for d in [start, *start.parents]:
        if (d / "src").is_dir() and (d / "dataset").exists():
            return d
    return start

PROJECT_ROOT = find_project_root(Path.cwd())
os.chdir(PROJECT_ROOT)
SRC = PROJECT_ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))
print("PROJECT_ROOT:", PROJECT_ROOT)'''))

# ---- Data prep ----
cells.append(md(
"## 0. Bangun satu tabel besar dari semua label\n"
"Semua analisis di bawah memakai `df` ini: satu baris = satu bounding box "
"(`split, stem, class_id, cx, cy, w, h, area, aspect`). Path & kelas dibaca "
"lewat `src/eda.py` agar konsisten dengan pipeline."))
cells.append(code('''\
import eda
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
%matplotlib inline
from PIL import Image

plt.rcParams["figure.dpi"] = 110
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}
CLASS_COLORS = {0: "#4c72b0", 1: "#c44e52", 2: "#55a868"}  # Helmet / No-Helmet / Person

DATA_YAML = "dataset/data.yaml"
data, class_names, nc, root = eda.load_dataset_config(DATA_YAML)
splits = eda.resolve_splits(root, data)
COLORS = [CLASS_COLORS[i] for i in range(nc)]

records, path_map, density = [], {}, []
no_anno = 0
for split, (images_dir, labels_dir) in splits.items():
    counts = {}
    for lbl in labels_dir.glob("*.txt"):
        n = 0
        try:
            text = lbl.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        for line in text.splitlines():
            p = line.split()
            if len(p) != 5:
                continue
            try:
                cid = int(p[0]); x, y, w, h = map(float, p[1:])
            except ValueError:
                continue
            if cid < 0 or cid >= nc or w <= 0 or h <= 0:
                continue
            records.append((split, lbl.stem, cid, x, y, w, h)); n += 1
        counts[lbl.stem] = n
    for img in images_dir.iterdir():
        if img.suffix.lower() in IMAGE_EXTS:
            path_map[(split, img.stem)] = img
            c = counts.get(img.stem, 0)
            density.append((split, c))
            if c == 0:
                no_anno += 1

df = pd.DataFrame(records, columns=["split", "stem", "class_id", "cx", "cy", "w", "h"])
df["area"] = df["w"] * df["h"]
df["aspect"] = df["w"] / df["h"]
df["class"] = df["class_id"].map({i: class_names[i] for i in range(nc)})
dens = pd.DataFrame(density, columns=["split", "n_boxes"])

print(f"kelas         : {class_names}")
print(f"total bbox    : {len(df):,}")
print(f"total gambar  : {len(density):,}  (tanpa anotasi: {no_anno:,})")
df.head()'''))

# ---- 1. Class imbalance ----
cells.append(md(
"## 1. Distribusi kelas — *kenapa* `No-Helmet` jadi tantangan utama\n"
"**❓** Apakah ketiga kelas seimbang?\n\n"
"**💡 Mengapa penting:** kelas minoritas membuat model *under-fit* pada kelas itu "
"(recall rendah). Untuk K3, justru **`No-Helmet` yang paling penting terdeteksi**, "
"jadi imbalance di sini berisiko langsung pada tujuan proyek."))
cells.append(code('''\
counts = df["class"].value_counts().reindex(class_names)
pct = 100 * counts / counts.sum()
ratio = counts.max() / counts.min() if counts.min() else float("inf")

fig, ax = plt.subplots(1, 2, figsize=(12, 4))
bars = ax[0].bar(class_names, counts.values, color=COLORS)
for b, v, p in zip(bars, counts.values, pct.values):
    ax[0].text(b.get_x() + b.get_width()/2, v, f"{v:,}\\n{p:.1f}%", ha="center", va="bottom", fontsize=9)
ax[0].set_title("Jumlah bounding box per kelas"); ax[0].set_ylabel("bbox")
ax[0].margins(y=0.18)

ax[1].pie(counts.values, labels=class_names, colors=COLORS, autopct="%1.1f%%",
          startangle=90, wedgeprops={"edgecolor": "white"})
ax[1].set_title("Proporsi kelas")
plt.tight_layout(); plt.show()

mino = counts.idxmin()
print(f"Kelas minoritas: '{mino}' ({counts.min():,} bbox, {pct.min():.1f}%) — "
      f"rasio maks/min = {ratio:.1f}x")
print("=> Pantau recall per-kelas untuk '%s'; pertimbangkan augmentasi terarah / class weights." % mino)'''))

# ---- 2. Per-split distribution ----
cells.append(md(
"## 2. Komposisi kelas per split — *kenapa* split dianggap adil\n"
"**❓** Apakah proporsi kelas di train / valid / test mirip?\n\n"
"**💡 Mengapa penting:** kalau distribusi train ≠ test, penurunan metrik di test "
"bisa karena **pergeseran distribusi**, bukan murni overfitting. Visual ini "
"memvalidasi asumsi 'val/test representatif' yang dipakai saat interpretasi metrik."))
cells.append(code('''\
ct = pd.crosstab(df["split"], df["class"]).reindex(index=["train", "valid", "test"], columns=class_names)
prop = ct.div(ct.sum(axis=1), axis=0)

fig, ax = plt.subplots(1, 2, figsize=(12, 4))
ct.plot.bar(ax=ax[0], color=COLORS, edgecolor="white")
ax[0].set_title("Jumlah bbox per kelas per split"); ax[0].set_ylabel("bbox"); ax[0].tick_params(axis="x", rotation=0)
prop.plot.bar(stacked=True, ax=ax[1], color=COLORS, edgecolor="white")
ax[1].set_title("Proporsi kelas (dinormalisasi per split)"); ax[1].set_ylabel("proporsi")
ax[1].tick_params(axis="x", rotation=0); ax[1].legend(loc="lower right", fontsize=8)
plt.tight_layout(); plt.show()
display(prop.round(3))
print("=> Bila baris proporsi train/valid/test mirip, split dianggap representatif.")'''))

# ---- 3. Object size / why 640 ----
cells.append(md(
"## 3. Ukuran objek — *kenapa* `imgsz=640` & penanganan objek kecil\n"
"**❓** Seberapa kecil objek-objeknya (gaya COCO: small <32², medium <96² piksel @640)?\n\n"
"**💡 Mengapa penting:** kalau banyak objek **kecil**, menurunkan `imgsz` akan "
"menghapus detail → objek hilang. Ini justifikasi langsung untuk **tetap di 640** "
"dan tidak menurunkannya demi menghemat VRAM."))
cells.append(code('''\
SMALL, MED = eda.SMALL_AREA_THR, eda.MEDIUM_AREA_THR
area = df["area"].values
frac_small = (area < SMALL).mean()
frac_med = ((area >= SMALL) & (area < MED)).mean()
frac_large = (area >= MED).mean()

fig, ax = plt.subplots(1, 2, figsize=(12, 4))
ax[0].hist(np.clip(area, 0, np.percentile(area, 99)), bins=60, color="#8172b3", edgecolor="white")
ax[0].axvline(SMALL, color="red", ls="--", label="small (~32x32 @640)")
ax[0].axvline(MED, color="orange", ls="--", label="medium (~96x96 @640)")
ax[0].set_title("Distribusi area bbox (normalized, dipotong p99)")
ax[0].set_xlabel("area relatif"); ax[0].set_ylabel("bbox"); ax[0].legend(fontsize=8)

ax[1].bar(["small", "medium", "large"], [frac_small*100, frac_med*100, frac_large*100],
          color=["#d62728", "#ff7f0e", "#2ca02c"])
for i, v in enumerate([frac_small, frac_med, frac_large]):
    ax[1].text(i, v*100, f"{v*100:.1f}%", ha="center", va="bottom")
ax[1].set_title("Komposisi ukuran objek"); ax[1].set_ylabel("% bbox"); ax[1].margins(y=0.15)
plt.tight_layout(); plt.show()
print(f"small={frac_small*100:.1f}%  medium={frac_med*100:.1f}%  large={frac_large*100:.1f}%")
print("=> Porsi objek kecil signifikan => imgsz=640 dipertahankan; hindari imgsz lebih kecil.")'''))

# ---- 4. Size per class ----
cells.append(md(
"## 4. Ukuran objek *per kelas* — *kenapa* sebagian kelas lebih sulit\n"
"**❓** Apakah ukuran objek berbeda antar kelas?\n\n"
"**💡 Mengapa penting:** kelas dengan objek rata-rata lebih kecil cenderung "
"**lebih sulit** (mAP & recall lebih rendah). Ini menjelaskan perbedaan performa "
"antar kelas pada laporan evaluasi nanti."))
cells.append(code('''\
fig, ax = plt.subplots(figsize=(9, 4.5))
data_by_class = [np.sqrt(df.loc[df.class_id == i, "area"].values) for i in range(nc)]  # ~ sisi relatif
parts = ax.violinplot(data_by_class, showmedians=True, widths=0.8)
for pc, c in zip(parts["bodies"], COLORS):
    pc.set_facecolor(c); pc.set_alpha(0.6)
ax.set_xticks(range(1, nc+1)); ax.set_xticklabels(class_names)
ax.axhline(np.sqrt(SMALL), color="red", ls="--", lw=1, label="ambang 'small'")
ax.set_ylabel("akar(area) ~ sisi relatif objek"); ax.set_title("Sebaran ukuran objek per kelas")
ax.legend(fontsize=8); plt.tight_layout(); plt.show()
med = df.groupby("class")["area"].median().reindex(class_names)
print("median area per kelas (kecil = lebih sulit):")
for k, v in med.items():
    print(f"  {k:<10}: {v:.5f}")'''))

# ---- 5. Aspect ratio / shape ----
cells.append(md(
"## 5. Bentuk & rasio aspek bbox — *kenapa* bentuk objek konsisten penting\n"
"**❓** Apakah tiap kelas punya bentuk (lebar:tinggi) yang khas?\n\n"
"**💡 Mengapa penting:** klaster bentuk yang rapi memudahkan detektor; bentuk "
"yang sangat bervariasi (mis. orang berdiri vs membungkuk) butuh lebih banyak data. "
"Membantu menebak augmentasi yang aman (mis. hindari distorsi aspek ekstrem)."))
cells.append(code('''\
s = df.sample(min(20000, len(df)), random_state=42)
fig, ax = plt.subplots(1, 2, figsize=(12, 4.5))
for i in range(nc):
    sub = s[s.class_id == i]
    ax[0].scatter(sub["w"], sub["h"], s=6, alpha=0.25, color=CLASS_COLORS[i], label=class_names[i])
ax[0].plot([0, 1], [0, 1], color="gray", ls=":", lw=1)
ax[0].set_xlim(0, 1); ax[0].set_ylim(0, 1)
ax[0].set_xlabel("width (norm)"); ax[0].set_ylabel("height (norm)")
ax[0].set_title("Sebaran ukuran bbox (w vs h)"); ax[0].legend(fontsize=8)

for i in range(nc):
    vals = np.clip(df.loc[df.class_id == i, "aspect"].values, 0, 4)
    ax[1].hist(vals, bins=50, alpha=0.5, color=CLASS_COLORS[i], label=class_names[i])
ax[1].axvline(1.0, color="black", ls=":", lw=1, label="kotak (w=h)")
ax[1].set_xlabel("rasio aspek (w/h)"); ax[1].set_ylabel("bbox")
ax[1].set_title("Distribusi rasio aspek per kelas"); ax[1].legend(fontsize=8)
plt.tight_layout(); plt.show()
print("=> 'Person' biasanya tinggi (aspek <1); 'Helmet' lebih mendekati kotak.")'''))

# ---- 6. Spatial heatmap ----
cells.append(md(
"## 6. Peta panas posisi objek — *kenapa* objek terkonsentrasi di area tertentu\n"
"**❓** Di bagian gambar mana tiap kelas biasanya muncul?\n\n"
"**💡 Mengapa penting:** bias posisi (mis. **helm di bagian atas**, orang di tengah) "
"adalah sinyal nyata yang dipelajari model. Kalau test punya pola posisi berbeda, "
"performa bisa turun. Juga memandu augmentasi (mis. crop yang tak membuang area padat)."))
cells.append(code('''\
fig, axes = plt.subplots(1, nc + 1, figsize=(4*(nc+1), 3.8))
def heat(ax, sub, title):
    H, xe, ye = np.histogram2d(sub["cx"], sub["cy"], bins=40, range=[[0, 1], [0, 1]])
    ax.imshow(H.T, origin="upper", extent=[0, 1, 1, 0], aspect="auto", cmap="magma")
    ax.set_title(title); ax.set_xlabel("cx"); ax.set_ylabel("cy")
heat(axes[0], df, "Semua kelas")
for i in range(nc):
    heat(axes[i+1], df[df.class_id == i], class_names[i])
plt.tight_layout(); plt.show()
print("Sumbu-y dibalik agar sesuai koordinat gambar (atas = 0). Area terang = sering ada objek.")'''))

# ---- 7. Annotation density ----
cells.append(md(
"## 7. Kepadatan objek per gambar — *kenapa* `iou`/NMS & gambar 'crowded' penting\n"
"**❓** Berapa banyak objek per gambar, dan berapa gambar tanpa objek?\n\n"
"**💡 Mengapa penting:** gambar sangat padat → banyak kotak bertumpuk → ambang "
"**NMS (`iou`)** memengaruhi hasil. Gambar **tanpa anotasi** berguna sebagai "
"contoh *background* (mengurangi false positive) — selama memang disengaja."))
cells.append(code('''\
fig, ax = plt.subplots(1, 2, figsize=(12, 4))
up = int(np.percentile(dens["n_boxes"], 99)) + 1
ax[0].hist(np.clip(dens["n_boxes"], 0, up), bins=range(0, max(up, 2)+1),
           color="#4c72b0", edgecolor="white")
ax[0].set_title("Jumlah objek per gambar (dipotong p99)")
ax[0].set_xlabel("objek/gambar"); ax[0].set_ylabel("jumlah gambar")

share_empty = 100 * (dens["n_boxes"] == 0).mean()
by_split = dens.groupby("split")["n_boxes"].mean().reindex(["train", "valid", "test"])
b = ax[1].bar(by_split.index, by_split.values, color=["#4c72b0", "#dd8452", "#55a868"])
for bb, v in zip(b, by_split.values):
    ax[1].text(bb.get_x()+bb.get_width()/2, v, f"{v:.2f}", ha="center", va="bottom")
ax[1].set_title("Rata-rata objek/gambar per split"); ax[1].set_ylabel("mean objek/gambar"); ax[1].margins(y=0.15)
plt.tight_layout(); plt.show()
print(f"Gambar tanpa anotasi: {share_empty:.1f}%  |  max objek dalam satu gambar: {dens['n_boxes'].max()}")
print("=> Ada gambar padat => ambang iou (NMS) berpengaruh; cek nilai default iou=0.5.")'''))

# ---- 8. Image resolution ----
cells.append(md(
"## 8. Resolusi & rasio aspek gambar — *kenapa* letterbox ke 640\n"
"**❓** Seberapa beragam ukuran gambar aslinya?\n\n"
"**💡 Mengapa penting:** input beragam → YOLO **letterbox** (resize + padding) ke "
"640×640. Memahami sebaran rasio aspek menjelaskan berapa banyak *padding* yang "
"terjadi dan kenapa objek kecil bisa makin kecil setelah penskalaan."))
cells.append(code('''\
rng = np.random.default_rng(42)
sizes = []
for split, (images_dir, _) in splits.items():
    imgs = [p for p in images_dir.iterdir() if p.suffix.lower() in IMAGE_EXTS]
    pick = rng.choice(len(imgs), size=min(1200, len(imgs)), replace=False)
    for k in pick:
        try:
            with Image.open(imgs[int(k)]) as im:
                sizes.append(im.size)
        except Exception:
            pass
W = np.array([s[0] for s in sizes]); H = np.array([s[1] for s in sizes])

fig, ax = plt.subplots(1, 2, figsize=(12, 4))
ax[0].scatter(W, H, s=10, alpha=0.3, color="#4c72b0")
ax[0].set_title(f"Resolusi gambar (sampel {len(sizes)})"); ax[0].set_xlabel("width (px)"); ax[0].set_ylabel("height (px)")
ax[1].hist(np.clip(W/H, 0, 3), bins=40, color="#dd8452", edgecolor="white")
ax[1].axvline(1.0, color="black", ls=":", label="persegi (1:1)")
ax[1].set_title("Rasio aspek gambar"); ax[1].set_xlabel("width/height"); ax[1].set_ylabel("gambar"); ax[1].legend(fontsize=8)
plt.tight_layout(); plt.show()
print(f"width  px: min={W.min()} max={W.max()} median={int(np.median(W))}")
print(f"height px: min={H.min()} max={H.max()} median={int(np.median(H))}")
print("=> Banyak rasio non-1:1 => letterbox ke 640 menambah padding; wajar untuk YOLO.")'''))

# ---- 9. Real annotated examples ----
cells.append(md(
"## 9. Contoh anotasi nyata — *melihat* kenapa kelas tampak seperti ini\n"
"**❓** Seperti apa wujud asli `Helmet` / `No-Helmet` / `Person` di gambar?\n\n"
"**💡 Mengapa penting:** angka saja tak cukup. Melihat kotak asli mengungkap "
"kualitas anotasi, oklusi, dan kemiripan antar kelas (mis. helm vs kepala) yang "
"menjelaskan **dari mana kesalahan model berasal**."))
cells.append(code('''\
def draw_examples(cid, k=3):
    rows = df[df.class_id == cid][["split", "stem"]].drop_duplicates()
    rows = rows.sample(min(k, len(rows)), random_state=7)
    fig, axes = plt.subplots(1, k, figsize=(4*k, 4))
    axes = np.atleast_1d(axes)
    for ax, (_, r) in zip(axes, rows.iterrows()):
        path = path_map.get((r["split"], r["stem"]))
        if path is None or not path.exists():
            ax.axis("off"); continue
        with Image.open(path) as im:
            im = im.convert("RGB"); W, H = im.size
            ax.imshow(im)
        for _, bb in df[(df["split"] == r["split"]) & (df["stem"] == r["stem"])].iterrows():
            x = (bb["cx"] - bb["w"]/2) * W; y = (bb["cy"] - bb["h"]/2) * H
            ax.add_patch(mpatches.Rectangle((x, y), bb["w"]*W, bb["h"]*H, fill=False,
                         edgecolor=CLASS_COLORS[int(bb["class_id"])], lw=2))
        ax.set_title(f"{r['split']}", fontsize=9); ax.axis("off")
    fig.suptitle(f"Contoh gambar yang memuat '{class_names[cid]}'", fontsize=12)
    plt.tight_layout(); plt.show()

legend = [mpatches.Patch(color=CLASS_COLORS[i], label=class_names[i]) for i in range(nc)]
fig = plt.figure(figsize=(8, 0.6)); plt.legend(handles=legend, ncol=nc, loc="center", frameon=False); plt.axis("off"); plt.show()
for cid in range(nc):
    draw_examples(cid, k=3)'''))

# ---- 10. Co-occurrence ----
cells.append(md(
"## 10. Ko-okurensi kelas — *kenapa* `Person` & `Helmet` sering bersama\n"
"**❓** Kelas apa yang cenderung muncul bersamaan dalam satu gambar?\n\n"
"**💡 Mengapa penting:** relasi kelas (orang **memakai** helm) berarti konteks "
"saling membantu — tapi juga sumber **kebingungan** (Helmet vs No-Helmet pada orang "
"yang sama). Menjelaskan kenapa precision/recall kedua kelas helm saling terkait."))
cells.append(code('''\
M = np.zeros((nc, nc), dtype=int)
for _, g in df.groupby(["split", "stem"]):
    cs = sorted(set(g["class_id"]))
    for i in cs:
        for j in cs:
            M[i, j] += 1
fig, ax = plt.subplots(figsize=(5.5, 4.8))
im = ax.imshow(M, cmap="Blues")
ax.set_xticks(range(nc)); ax.set_xticklabels(class_names, rotation=20)
ax.set_yticks(range(nc)); ax.set_yticklabels(class_names)
for i in range(nc):
    for j in range(nc):
        ax.text(j, i, f"{M[i, j]:,}", ha="center", va="center",
                color="white" if M[i, j] > M.max()*0.5 else "black", fontsize=9)
ax.set_title("Jumlah gambar yang memuat pasangan kelas\\n(diagonal = total gambar berisi kelas itu)")
fig.colorbar(im, fraction=0.046, pad=0.04); plt.tight_layout(); plt.show()
print("=> Off-diagonal tinggi = sering co-occur => konteks & potensi kebingungan antar kelas.")'''))

# ---- summary ----
cells.append(md(
"## 🧭 Ringkasan: visual mana mendukung keputusan apa\n\n"
"| Keputusan di proyek | Didukung oleh |\n"
"|---|---|\n"
"| **`imgsz=640` dipertahankan** | Bagian 3 & 8 (porsi objek kecil + letterbox) |\n"
"| **Pantau recall `No-Helmet`** | Bagian 1, 2, 4 (minoritas + ukuran) |\n"
"| **`iou`/NMS default penting** | Bagian 7 (gambar padat) |\n"
"| **Augmentasi hati-hati (aspek/crop)** | Bagian 5 & 6 (bentuk + posisi) |\n"
"| **Evaluasi val *dan* test terpisah** | Bagian 2 (representativitas split) |\n"
"| **Kebingungan Helmet↔No-Helmet** | Bagian 9 & 10 (visual + co-occurrence) |\n\n"
"Semua angka dihitung langsung dari `dataset/` yang ada, sehingga argumen "
"'mengapa' di atas dapat diverifikasi ulang kapan saja."))

nb = new_notebook()
nb.cells = cells
nb.metadata.update({
    "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
    "language_info": {"name": "python"},
})
out = NB / "08_visual_insights.ipynb"
nbformat.write(nb, out)
print("tulis:", out.name, "(akan dieksekusi)")

from nbconvert.preprocessors import ExecutePreprocessor
ep = ExecutePreprocessor(timeout=1200, kernel_name="python3")
ep.preprocess(nb, {"metadata": {"path": str(NB)}})
nbformat.write(nb, out)
print("OK: 08_visual_insights.ipynb dieksekusi & output tertanam")
