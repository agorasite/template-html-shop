import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
const BASE_URL  = "http://127.0.0.1:5501";
const ZOOM      = 1;
const VIEWPORT  = { width: 1440, height: 900 };
const WAIT_MS   = 1500;                     // ms to wait after each navigation

// "multipage"  → screenshot each entry in PAGES (separate HTML files)
// "singlepage" → auto-discover anchor sections from SINGLE_PAGE_FILE
const MODE = "multipage";

const PAGES = [
  "/home.html",
  "/shop.html",
  "/product1.html",
  "/product2.html",
  "/product3.html",
  "/cart.html",
  "/checkout.html",
  "/contact.html",
  "/profile.html",
  "/terms.html",
  "/thankyou.html",
  "/paymenterror.html",
];

const SINGLE_PAGE_FILE = "/home.html";

// ─── PER-PAGE EXTRA SHOTS ─────────────────────────────────────────────────────
// For pages that have hidden states (multi-step forms, tabs, modals) we define
// extra variants.  Each entry: { suffix, setup(page) }
//   suffix  → appended to the filename, e.g. "checkout--step2.png"
//   setup   → async fn that manipulates the page before the screenshot is taken
// The base screenshot (no suffix) is always taken first automatically.
const PAGE_EXTRAS = {
  "/checkout.html": [
    {
      suffix: "--step2-shipping",
      setup: async (page) => {
        // Fill required Step-1 fields so validation passes, then advance
        await page.evaluate(() => {
          const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) { el.value = val; el.classList.remove("is-invalid"); }
          };
          set("inp-fname",  "Γιώργος");
          set("inp-lname",  "Αλεξανδρόπουλος");
          set("inp-email",  "g.alex@email.com");
          set("inp-phone",  "+30 697 123 4567");
          set("inp-street", "Λεωφ. Κηφισίας 24");
          set("inp-postal", "115 26");
          set("inp-city",   "Αθήνα");
          window.goStep(2);
        });
        await page.waitForTimeout(400);
      },
    },
    {
      suffix: "--step3-payment",
      setup: async (page) => {
        await page.evaluate(() => {
          const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) { el.value = val; el.classList.remove("is-invalid"); }
          };
          set("inp-fname",  "Γιώργος");
          set("inp-lname",  "Αλεξανδρόπουλος");
          set("inp-email",  "g.alex@email.com");
          set("inp-phone",  "+30 697 123 4567");
          set("inp-street", "Λεωφ. Κηφισίας 24");
          set("inp-postal", "115 26");
          set("inp-city",   "Αθήνα");
          window.goStep(2);   // step 1 → 2 (needs validation pass)
          window.goStep(3);   // step 2 → 3 (no validation)
        });
        await page.waitForTimeout(400);
      },
    },
    {
      suffix: "--step4-confirm",
      setup: async (page) => {
        // Directly show confirmation screen — bypasses the 2s placeOrder spinner
        await page.evaluate(() => {
          ["step-1", "step-2", "step-3"].forEach(
            (id) => (document.getElementById(id).style.display = "none")
          );
          document.getElementById("step-confirm").style.display = "block";
          document.getElementById("confirm-order-num").textContent = "#TS-1042";
          // Mark all stepper dots as done/active
          for (let i = 1; i <= 4; i++) {
            const dot  = document.getElementById("dot-"  + i);
            const circ = document.getElementById("circ-" + i);
            const conn = document.getElementById("conn-" + i);
            if (!dot) continue;
            dot.classList.remove("active", "done");
            if (i < 4) dot.classList.add("done");
            if (i === 4) dot.classList.add("active");
            if (i < 4) circ.innerHTML = '<i class="fas fa-check" style="font-size:.7rem"></i>';
            else        circ.textContent = String(i);
            if (conn) conn.classList.toggle("done", i < 4);
          }
        });
        await page.waitForTimeout(400);
      },
    },
  ],

  // Example: profile.html — capture the Wishlist and Settings tabs
  "/profile.html": [
    {
      suffix: "--wishlist",
      setup: async (page) => {
        await page.evaluate(() => {
          const btn = document.querySelector('.side-nav-item:nth-child(2)');
          if (btn) btn.click();
        });
        await page.waitForTimeout(300);
      },
    },
    {
      suffix: "--settings",
      setup: async (page) => {
        await page.evaluate(() => {
          const btn = document.querySelector('.side-nav-item:nth-child(3)');
          if (btn) btn.click();
        });
        await page.waitForTimeout(300);
      },
    },
  ],
};
// ──────────────────────────────────────────────────────────────────────────────

function pageToFilename(pagePath, suffix = "") {
  const base = pagePath
    .replace(/^\//, "")
    .replace(/\.html$/, "")
    .replace(/\//g, "__");
  return base + suffix + ".png";
}

(async () => {
  const outputDir = path.join(__dirname, "../screenshots");
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch();

  const applyZoom = (p) =>
    p.addStyleTag({ content: `html { zoom: ${ZOOM}; }` });

  // ── Helper: pause videos so they don't block networkidle ──────────────────
  const pauseVideos = (p) =>
    p.evaluate(() =>
      document.querySelectorAll("video").forEach((v) => v.pause())
    ).catch(() => {});

  if (MODE === "multipage") {
    for (const pagePath of PAGES) {
      const url = BASE_URL + pagePath;

      // ── Base screenshot ──────────────────────────────────────────────────
      const page = await browser.newPage({ viewport: VIEWPORT });

      console.log(`\n▶ ${pagePath}`);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await pauseVideos(page);
      await applyZoom(page);
      await page.waitForTimeout(WAIT_MS);

      const basePath = path.join(outputDir, pageToFilename(pagePath));
      console.log(`  ✓ ${pageToFilename(pagePath)}`);
      await page.screenshot({ path: basePath, fullPage: true });

      // ── Extra variants (multi-step, tabs, etc.) ──────────────────────────
      const extras = PAGE_EXTRAS[pagePath] ?? [];
      for (const { suffix, setup } of extras) {
        // Reload into a fresh page so state is clean for every variant
        const epage = await browser.newPage({ viewport: VIEWPORT });
        await epage.goto(url, { waitUntil: "domcontentloaded" });
        await pauseVideos(epage);
        await applyZoom(epage);
        await page.waitForTimeout(500);

        await setup(epage);
        await page.waitForTimeout(400);

        const ePath = path.join(outputDir, pageToFilename(pagePath, suffix));
        console.log(`  ✓ ${pageToFilename(pagePath, suffix)}`);
        await epage.screenshot({ path: ePath, fullPage: true });
        await epage.close();
      }

      await page.close();
    }
  } else {
    // ── Single-page mode (unchanged) ────────────────────────────────────────
    const page = await browser.newPage({ viewport: VIEWPORT });
    const url = BASE_URL + SINGLE_PAGE_FILE;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await pauseVideos(page);
    await applyZoom(page);

    const anchors = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href^="#"]'));
      const hashes = links
        .map((a) => a.getAttribute("href"))
        .filter((h) => h && h.length > 1);
      return [...new Set(hashes)];
    });

    console.log(`Found ${anchors.length} sections: ${anchors.join(", ")}`);

    const fullPagePath = path.join(outputDir, "full-page.png");
    console.log(`Full page -> ${fullPagePath}`);
    await page.screenshot({ path: fullPagePath, fullPage: true });

    for (const hash of anchors) {
      const sectionId = hash.replace(/^#/, "");
      const filePath = path.join(outputDir, `${sectionId}.png`);

      const exists = await page.locator(hash).count();
      if (!exists) {
        console.log(`  ✗ ${hash} not found, skipping`);
        continue;
      }

      console.log(`  ✓ ${hash} -> ${sectionId}.png`);
      await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
      }, sectionId);
      await page.waitForTimeout(WAIT_MS);
      await page.screenshot({ path: filePath });
    }

    await page.close();
  }

  await browser.close();
  console.log("\n✅ Done. Screenshots saved to /screenshots/");
})();
