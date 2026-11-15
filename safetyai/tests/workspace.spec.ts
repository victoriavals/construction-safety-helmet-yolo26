import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";
import { readFile } from "node:fs/promises";

const pixel =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA1sAAAAASUVORK5CYII=";
const result = {
  annotated: `data:image/png;base64,${pixel}`,
  detections: [],
  counts: { Helmet: 2, "No-Helmet": 1, Person: 3 },
  no_helmet: 1,
  total: 6,
  time_ms: 87,
};
const api = "https://naufalfirdaus-deteksi-helm-api.hf.space";
const sample = path.resolve("public/examples/example1.jpg");
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "*",
};
async function backend(
  page: Page,
  options: { code?: number; payload?: unknown } = {},
) {
  const calls: string[] = [];
  await page.route(`${api}/**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers: cors });
    if (request.method() === "GET")
      return route.fulfill({
        status: 200,
        headers: cors,
        json: { status: "ok" },
      });
    calls.push(request.url());
    if (request.url().includes("/predict/video"))
      return route.fulfill({
        status: 200,
        headers: cors,
        contentType: "video/mp4",
        body: Buffer.from("mock-video-response"),
      });
    return route.fulfill({
      status: options.code ?? 200,
      headers: cors,
      json: options.payload ?? result,
    });
  });
  return calls;
}
async function visit(page: Page, route: string) {
  const response = await page.goto(route);
  await expect(page.getByRole("main")).toHaveAttribute("aria-busy", "false");
  return response;
}
test("data nyata kosong; demo terpisah, filter dan CSV konsisten", async ({
  page,
}) => {
  await backend(page);
  await visit(page, "/");
  await expect(
    page.getByText("Pemeriksaan pertama dimulai di sini", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ekspor CSV", exact: true }),
  ).toBeDisabled();
  await page.getByRole("radio", { name: "Lihat demo", exact: true }).click();
  await expect(
    page.getByText("Mode demo aktif.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Lihat detail/ })).toHaveCount(
    4,
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page
    .getByLabel("Filter status", { exact: true })
    .selectOption("review");
  await expect(page.getByRole("button", { name: /^Lihat detail/ })).toHaveCount(
    3,
  );
  await page
    .getByRole("textbox", { name: "Cari nama file atau ID", exact: true })
    .fill("area-konstruksi");
  await expect(page.getByRole("button", { name: /^Lihat detail/ })).toHaveCount(
    1,
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ekspor CSV", exact: true }).click();
  const download = await downloadPromise;
  const content = await readFile((await download.path())!, "utf8");
  expect(content).toContain("DEMO-004");
  expect(content).not.toContain("DEMO-003");
  await page.getByRole("radio", { name: /^Data saya/ }).click();
  await expect(
    page.getByText("Pemeriksaan pertama dimulai di sini", { exact: true }),
  ).toBeVisible();
});
test("unggah, atur ambang, analisis, simpan, reload dan detail", async ({
  page,
}) => {
  const calls = await backend(page);
  await visit(page, "/detect");
  await expect(
    page
      .getByText("Menunggu analisis", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Jalankan analisis", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("tabpanel")
    .getByLabel("File pemeriksaan", { exact: true })
    .setInputFiles(sample);
  await page
    .getByRole("slider", { name: "Ambang keyakinan", exact: true })
    .fill("0.4");
  await expect(
    page.getByRole("button", { name: "Simpan ke riwayat", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Jalankan analisis", exact: true })
    .click();
  await expect(page.getByText("Perlu ditinjau", { exact: true })).toBeVisible();
  expect(calls[0]).toContain("conf=0.4&iou=0.45");
  await page
    .getByRole("button", { name: "Simpan ke riwayat", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ringkasan tersimpan", exact: true }),
  ).toBeDisabled();
  const stored = await page.evaluate(() =>
    localStorage.getItem("safetyai.scans.v2"),
  );
  expect(JSON.parse(stored!)).toHaveLength(1);
  expect(stored).not.toContain("data:image");
  await visit(page, "/");
  await page.reload();
  await expect(page.getByText("example1.jpg", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Lihat detail example1.jpg", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("40%");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Lihat detail example1.jpg",
      exact: true,
    }),
  ).toBeFocused();
});
test("batas ukuran dan format ditolak sebelum mengirim ke server", async ({
  page,
}) => {
  const calls = await backend(page);
  await visit(page, "/detect");
  await page
    .getByRole("tabpanel")
    .getByLabel("File pemeriksaan", { exact: true })
    .setInputFiles({
      name: "too-large.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
    });
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Batas 10 MB",
  );
  await page
    .getByRole("tabpanel")
    .getByLabel("File pemeriksaan", { exact: true })
    .setInputFiles({
      name: "report.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("test"),
    });
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Format belum didukung",
  );
  expect(calls).toHaveLength(0);
});
test("error server dapat dipulihkan tanpa hasil lama", async ({ page }) => {
  await backend(page, { code: 503 });
  await visit(page, "/detect");
  await page
    .getByRole("button", { name: "Pilih contoh 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Jalankan analisis", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Analisis gagal",
  );
  await expect(
    page
      .getByText("Menunggu analisis", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Jalankan analisis", exact: true }),
  ).toBeEnabled();
});
test("hasil tanpa objek berstatus netral", async ({ page }) => {
  await backend(page, {
    payload: {
      ...result,
      counts: { Helmet: 0, "No-Helmet": 0, Person: 0 },
      no_helmet: 0,
      total: 0,
    },
  });
  await visit(page, "/detect");
  await page
    .getByRole("tabpanel")
    .getByLabel("File pemeriksaan", { exact: true })
    .setInputFiles(sample);
  await page
    .getByRole("button", { name: "Jalankan analisis", exact: true })
    .click();
  await expect(page.getByText("Tanpa objek", { exact: true })).toBeVisible();
  await expect(page.getByText("Tanpa temuan", { exact: true })).toHaveCount(0);
});
test("ganti file menghapus hasil sebelumnya dan respons rusak ditolak", async ({
  page,
}) => {
  await backend(page);
  await visit(page, "/detect");
  await page
    .getByRole("tabpanel")
    .getByLabel("File pemeriksaan", { exact: true })
    .setInputFiles(sample);
  await page
    .getByRole("button", { name: "Jalankan analisis", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Simpan ke riwayat", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("tabpanel")
    .getByLabel("File pemeriksaan", { exact: true })
    .setInputFiles({
      name: "second.png",
      mimeType: "image/png",
      buffer: Buffer.from(pixel, "base64"),
    });
  await expect(
    page
      .getByText("Menunggu analisis", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Simpan ke riwayat", exact: true }),
  ).toHaveCount(0);
  await page.unroute(`${api}/**`);
  await backend(page, { payload: { ...result, annotated: "unexpected" } });
  await page
    .getByRole("button", { name: "Jalankan analisis", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Respons server tidak sesuai",
  );
});
test("bahasa, navigasi browser, dan menu mobile", async ({
  page,
}, testInfo) => {
  await backend(page);
  await visit(page, "/");
  await page.getByRole("radio", { name: "English", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Safety overview.", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  if (testInfo.project.name === "mobile") {
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "Guide & model", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } else
    await page
      .getByRole("link", { name: "Guide & model", exact: true })
      .click();
  await expect(
    page.getByRole("heading", { name: "Know your tools.", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Safety overview.", exact: true }),
  ).toBeVisible();
});
test("pembatalan tidak mengizinkan respons terlambat mengubah hasil", async ({
  page,
}) => {
  await backend(page);
  let release!: () => void;
  let started!: () => void;
  let settled = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requestStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route(`${api}/predict/image**`, async (route) => {
    started();
    await gate;
    try {
      await route.fulfill({ status: 200, headers: cors, json: result });
    } catch {
      /* Permintaan memang dapat sudah dibatalkan oleh browser. */
    }
    settled = true;
  });
  await visit(page, "/detect");
  await page
    .getByRole("tabpanel")
    .getByLabel("File pemeriksaan", { exact: true })
    .setInputFiles(sample);
  await page
    .getByRole("button", { name: "Jalankan analisis", exact: true })
    .click();
  await requestStarted;
  await page
    .getByRole("button", { name: "Batalkan proses", exact: true })
    .click();
  release();
  await expect.poll(() => settled).toBe(true);
  await expect(
    page.getByRole("button", { name: "Jalankan analisis", exact: true }),
  ).toBeEnabled();
  await expect(
    page
      .getByText("Menunggu analisis", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Simpan ke riwayat", exact: true }),
  ).toHaveCount(0);
});
test("kegagalan penyimpanan tidak menampilkan sukses palsu", async ({
  page,
}) => {
  await backend(page);
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === "safetyai.scans.v2")
        throw new DOMException("Storage unavailable", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await visit(page, "/detect");
  await page
    .getByRole("tabpanel")
    .getByLabel("File pemeriksaan", { exact: true })
    .setInputFiles(sample);
  await page
    .getByRole("button", { name: "Jalankan analisis", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simpan ke riwayat", exact: true })
    .click();
  await expect(
    page.getByText(
      "Penyimpanan browser tidak tersedia. Ekspor hasil sebelum menutup halaman.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Simpan ke riwayat", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(() => localStorage.getItem("safetyai.scans.v2")),
  ).toBeNull();
});
test("video memiliki hasil unduhan tanpa statistik gambar palsu", async ({
  page,
}) => {
  await backend(page);
  await visit(page, "/detect");
  await page.getByRole("tab", { name: "Video", exact: true }).click();
  await page
    .getByRole("tabpanel")
    .getByLabel("File pemeriksaan", { exact: true })
    .setInputFiles({
      name: "test.webm",
      mimeType: "video/webm",
      buffer: Buffer.from("video-fixture"),
    });
  await page
    .getByRole("button", { name: "Jalankan analisis", exact: true })
    .click();
  await expect(
    page.getByText("Video selesai diproses", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Unduh hasil", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Simpan ke riwayat", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Tanpa temuan", { exact: true })).toHaveCount(0);
});
test("aksesibilitas otomatis, CSP produksi dan lebar layar", async ({
  page,
}) => {
  await backend(page);
  for (const route of ["/", "/detect", "/about"]) {
    const response = await visit(page, route);
    await expect(page.getByRole("main")).toBeVisible();
    const csp = response!.headers()["content-security-policy"];
    expect(csp).toContain("'nonce-");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (route === "/") {
      for (const card of await page.getByRole("article").all())
        await expect(card).toHaveCSS("opacity", "1");
    }
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => {})),
      );
    });
    const analysis = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      analysis.violations.map((v) => ({
        id: v.id,
        help: v.help,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});
