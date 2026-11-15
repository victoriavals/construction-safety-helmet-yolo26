# Tooling UI/UX global pada akun Windows dev

Diverifikasi 15 November 2026. “Global” di sini berarti semua direktori yang dijalankan oleh akun Windows `dev`. Dependency aplikasi tetap perlu diinstal di masing-masing project agar bundler, versi React, CI, dan deployment dapat mereproduksi build.

## Yang telah dipasang/diperbarui

| Kebutuhan | Instalasi global yang diverifikasi | Versi |
| --- | --- | --- |
| Motion | `motion`, `motion-ai`; installer `npx motion-ai` dijalankan dengan scope Global dan agent Codex | 14.14.0 / 14.2.0 |
| GSAP | `gsap`, `@gsap/react` | 3.15.1 / 2.1.2 |
| LottieFiles React SDK | `@lottiefiles/dotlottie-react` | 0.22.2 |
| Rive React runtime | `@rive-app/react-webgl2` | 4.39.0 |
| shadcn CLI dan skill | `shadcn`, `skills`; skill shadcn pada `~/.agents/skills/shadcn` | 4.23.0 / 1.8.1 |
| UI UX Pro Max | `ui-ux-pro-max-cli`; skill diperbarui dari repository resmi pada `~/.agents/skills/ui-ux-pro-max` | 2.15.0 |
| React Bits tooling | `jsrepo`; source TypeScript + Tailwind dalam cache global; registry terdaftar pada project | 3.8.3 |

Lokasi npm global: `C:\Users\dev\AppData\Roaming\npm`. Source React Bits: `C:\Users\dev\.agents\libraries\react-bits\src\ts-tailwind`. Clone dibuat shallow/sparse untuk menyimpan source komponen yang relevan tanpa seluruh aset situs demo. Lisensi dan README source tetap tersedia di root clone.

LottieFiles dan Rive adalah layanan/editor di web. Instalasi di atas memasang **SDK runtime React**, bukan akun, akses berbayar, editor desktop, atau semua aset animasi mereka. React Bits dikonsumsi sebagai source komponen/registry, bukan satu paket runtime npm global. Tidak ada langganan dibeli.

Motion, shadcn, dan UI UX Pro Max adalah skill global yang sudah tersedia/diperbarui. Skill yang baru diinstal dapat dimuat pada turn berikutnya. Buka ulang terminal/aplikasi Codex untuk memuat lingkungan PATH dan konfigurasi MCP yang terbaru.

## MCP

Konfigurasi user `C:\Users\dev\.codex\config.toml` memiliki server `motion`, `motion-plus`, `shadcn`, `playwright`, dan `context7`. Installer Motion mengonfigurasi Motion/Motion+ pada scope user. Path executable shadcn dan Playwright yang tercatat diperiksa dan ada pada mesin ini.

- Motion MCP, shadcn CLI/registry, dan Playwright digunakan dalam pekerjaan ini.
- Motion+ membutuhkan akun/otorisasi yang sesuai untuk fitur berbayar. Tidak ada login atau pembelian dilakukan.
- Context7 terdaftar sebagai hosted MCP dengan OAuth; autentikasi dan tool Context7 tidak diverifikasi pada sesi ini.
- Figma tersedia melalui plugin pada sesi ini; ia bukan paket npm yang membuat akun Figma otomatis terhubung.

## Pakai dari direktori mana pun

Terminal baru seharusnya membaca npm global bin dari User PATH. Proses terminal/Codex yang sudah berjalan dapat memiliki PATH lama. Muat ulang pada PowerShell saat ini jika diperlukan:

```powershell
$npmGlobalPath = (npm prefix -g).Trim()
$env:Path = "$npmGlobalPath;$env:Path"
motion-ai --version
shadcn --version
jsrepo --version
uipro --version
npm list --global --depth=0
```

Untuk project React/Next lain, pilih hanya runtime yang benar-benar dipakai:

```powershell
npm install motion
# Pilihan terpisah sesuai kebutuhan:
npm install gsap @gsap/react
npm install @lottiefiles/dotlottie-react
npm install @rive-app/react-webgl2
```

Jangan memakai symlink dependency global atau NODE_PATH sebagai pengganti package.json/lockfile. Di `safetyai`, Motion dipertahankan sebagai dependency project; GSAP/Lottie/Rive tidak dimasukkan ke bundle karena belum mempunyai fungsi pengguna yang memerlukannya.

Skill global untuk Codex:

```powershell
npx skills add shadcn/ui --global --agent codex --skill shadcn --yes
npx skills add nextlevelbuilder/ui-ux-pro-max-skill --global --agent codex --skill ui-ux-pro-max --yes
npx motion-ai
# Pilih Global lalu Codex.
```

React Bits pada project baru memerlukan registry di `components.json`:

```json
{
  "registries": {
    "@react-bits": "https://reactbits.dev/r/{name}.json"
  }
}
```

```powershell
npx shadcn@latest search @react-bits -q SpotlightCard
npx shadcn@latest add @react-bits/SpotlightCard-TS-TW
```

Pencarian registry tersebut sudah diverifikasi dari `safetyai`; tidak semua komponen React Bits diimpor ke aplikasi. Jalankan CLI penambahan komponen dari direktori project yang memiliki `components.json`.

## Rekomendasi tambahan, berdasarkan kebutuhan

| Prioritas | Skill/MCP | Manfaat | Kondisi saat ini |
| --- | --- | --- | --- |
| 1 | `frontend-design`, `design-system`, `react-best-practices` | Identitas visual yang konsisten, token, serta implementasi React/Next yang terawat. | Sudah ada pada `C:\Users\dev\.agents\skills`; tidak perlu instal duplikat. |
| 1 | Playwright MCP + axe-core | Memeriksa tampilan, keyboard, responsivitas, dan sebagian masalah aksesibilitas. | MCP sudah dikonfigurasi; `@axe-core/playwright` dan test project sudah ditambahkan. |
| 2 | Figma plugin/MCP | Eksplorasi layout, library komponen, dan handoff desain ke code. | Plugin tersedia; hubungkan file dan akses Figma yang diperlukan saat dipakai. |
| 2 | Context7 MCP | Dokumentasi library yang sesuai versi saat mengembangkan komponen baru. | Sudah dikonfigurasi; mungkin perlu menyelesaikan OAuth pada Codex. |
| 3 | Image generation | Aset hero/ilustrasi orisinal jika aset proyek belum mencukupi. | Tool image generation tersedia pada sesi ini; tidak perlu npm global. |
| 3 | Storybook | Katalog keadaan komponen dan visual regression ketika UI berkembang bersama tim. | Rekomendasi untuk setup **per project**, belum diinstal. |

Untuk aplikasi inspeksi ini, prioritaskan token, state, aksesibilitas, dan kejelasan hasil. Animasi kompleks atau banyak runtime sekaligus dapat mengalihkan perhatian dari temuan.

## Sumber resmi

- [Motion AI Kit](https://motion.dev/docs/ai-kit).
- [React Bits: source dan cara instalasi](https://github.com/DavidHDev/react-bits).
- [GSAP](https://gsap.com/).
- [LottieFiles developer documentation](https://docs.lottiefiles.com/en).
- [Rive React runtime](https://rive.app/docs/runtimes/react/react).
- [shadcn skills](https://ui.shadcn.com/docs/skills).
- [UI UX Pro Max repository](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill).
- [Storybook untuk Next.js](https://storybook.js.org/docs/get-started/frameworks/nextjs-vite).
- [Context7](https://github.com/upstash/context7).
