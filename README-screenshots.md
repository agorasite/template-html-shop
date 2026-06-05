# Screenshots Script — Οδηγίες χρήσης

Το script `scripts/screenshots.js` τραβάει αυτόματα screenshots για κάθε template.

---

## Εγκατάσταση (μία φορά ανά project)

```bash
npm install
npx playwright install chromium
```

---

## Εκτέλεση

```bash
node scripts/screenshots.js
```

Τα αρχεία αποθηκεύονται στον φάκελο `screenshots/`.

---

## Τι να αλλάξεις σε κάθε project

Άνοιξε το `scripts/screenshots.js` και τροποποίησε μόνο το **CONFIGURATION** block στην κορυφή:

### 1. `BASE_URL`
Το URL που τρέχει ο Live Server σου.
```js
const BASE_URL = "http://127.0.0.1:5500";
```
Αν ο Live Server τρέχει σε διαφορετική πόρτα, άλλαξέ το αντίστοιχα.

---

### 2. `MODE` — Επίλεξε τύπο site

#### Multi-page site (ξεχωριστά `.html` αρχεία)
```js
const MODE = "multipage";

const PAGES = [
  "/index.html",
  "/about.html",
  "/contact.html",
  // ... προσθέτεις / αφαιρείς σελίδες
];
```

#### Single-page site (anchor links `#section`)
```js
const MODE = "singlepage";
const SINGLE_PAGE_FILE = "/index.html";
```
Το script βρίσκει αυτόματα όλα τα `<a href="#...">` links και κάνει screenshot κάθε section.

---

### 3. `ZOOM`
Το επίπεδο zoom (π.χ. `0.75` = 75%, `1` = κανονικό).
```js
const ZOOM = 0.75;
```

### 4. `WAIT_MS`
Πόσα milliseconds να περιμένει μετά από κάθε navigation πριν το screenshot.
```js
const WAIT_MS = 2000; // 2 δευτερόλεπτα
```

---

## Checklist για νέο project

- [ ] Αντίγραψε τον φάκελο `scripts/` στη ρίζα του project
- [ ] Αντίγραψε το `package.json` (ή δημιούργησε νέο με `npm init -y` και βάλε `"type": "module"`)
- [ ] Τρέξε `npm install` και `npx playwright install chromium`
- [ ] Άνοιξε το `scripts/screenshots.js` και ρύθμισε το configuration block
- [ ] Ξεκίνα τον Live Server στο project
- [ ] Τρέξε `node scripts/screenshots.js`
- [ ] Ενημέρωσε τα `about.xml` και `about_gr.xml` με τα νέα screenshots
