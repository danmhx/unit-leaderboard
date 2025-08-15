/***** 🔧 Supabase Setup — fill these in *****/
const SUPABASE_URL = "https://mnykgzhggvimcarqhthn.supabase.co"; // <-- set me
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ueWtnemhnZ3ZpbWNhcnFodGhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyODMzNDgsImV4cCI6MjA3MDg1OTM0OH0.TIEPE6qOWFKAmRPTF16yj3zR4DJ7iLHftGobaoapMgU"; // <-- set me

// If your SQL function uses a different parameter name than "items",
// change this to match (e.g., "payload" or "entries").
const RPC_PARAM_NAME = "items";

/***** 📦 Data: All Units (deduped by name at runtime) *****/
const units = [
  { name: "Black Dragon", class: "Warrior" }, { name: "Poseidon", class: "Warrior" },
  { name: "Zeus", class: "Wizard" }, { name: "Thalion", class: "Support" },
  { name: "Omela Tree", class: "Tank" }, { name: "Krampus", class: "Warrior" },
  { name: "Demon", class: "Warrior" }, { name: "Jack", class: "Warrior" },
  { name: "Medusa", class: "Ranger" }, { name: "Chaosflare", class: "Wizard" },
  { name: "Thanatos", class: "Assassin" }, 
  { name: "Ancient Vampire", class: "Assassin" }, { name: "Cureflare", class: "Healer" },
  { name: "Inferno Archer", class: "Ranger" }, { name: "Saint Nicholas", class: "Support" },
  { name: "Triton", class: "Support" }, { name: "Commander", class: "Support" },
  { name: "Triton", class: "Support" }, { name: "Ent", class: "Tank" },
  { name: "Sea Devil", class: "Tank" }, { name: "Living Armor", class: "Tank" },
  { name: "The Reaper", class: "Warrior" }, { name: "Yeti", class: "Warrior" },
  { name: "Goblin King", class: "Warrior" }, { name: "Dragon Slayer", class: "Warrior" },
  { name: "Viperfang", class: "Assassin" }, { name: "Yoki Onna", class: "Wizard" },
  { name: "Rhythmclaw", class: "Support" }, { name: "Vendigo", class: "Assassin" },
  { name: "The Ice Queen", class: "Wizard" }, { name: "Headless Knight", class: "Warrior" },
  { name: "Berserker", class: "Warrior" }, { name: "Torturer", class: "Wizard" },
  { name: "Cage Man", class: "Wizard" }, { name: "Gryla", class: "Summoner" },
  { name: "Oceanid", class: "Ranger" }, { name: "Trifang", class: "Ranger" },
  { name: "Necromancer", class: "Summoner" }, { name: "Nereid", class: "Healer" },
  { name: "Witch", class: "Healer" }, { name: "Angel", class: "Healer" },
  { name: "Succubus", class: "Ranger" }, { name: "Volt", class: "Wizard" },
  { name: "Candy Cane Shooter", class: "Ranger" }, { name: "Bard", class: "Support" },
  { name: "Dark Herald", class: "Support" }, { name: "Pool Party Blaster", class: "Ranger" },
  { name: "Cupid", class: "Ranger" }, { name: "Crimson Assassin", class: "Assassin" },
  { name: "Bandit", class: "Ranger" }, { name: "Marksman", class: "Ranger" },
  { name: "The Admiral of Death", class: "Ranger" }
];

/***** 🔢 Tier Points & Helpers *****/
const TIER_POINTS = { S: 6, A: 5, B: 4, C: 3, D: 2, F: 1 };
const POINTS_TO_TIER = (avg) => {
  if (avg === null || Number.isNaN(avg)) return "Unranked";
  if (avg >= 5.5) return "S";
  if (avg >= 4.5) return "A";
  if (avg >= 3.5) return "B";
  if (avg >= 2.5) return "C";
  if (avg >= 1.5) return "D";
  return "F";
};

const toFixedOrDash = (n) => (n == null ? "—" : Number(n).toFixed(2));

/***** 🔌 Supabase Client *****/
const supabase = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/***** 🧩 DOM Refs *****/
const leaderboardList = document.getElementById("leaderboardList");
const lbStatus = document.getElementById("lbStatus");

const tierModal = document.getElementById("tierModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const unrankedPool = document.getElementById("unrankedPool");
const submitBtn = document.getElementById("submitBtn");
const submitStatus = document.getElementById("submitStatus");

const tierContainers = ["S","A","B","C","D","F"].map(t => ({
  tier: t, el: document.getElementById(`tier-${t}`)
}));

/***** 🧹 Utils *****/
// Deduplicate units by name (keep the first occurrence)
function dedupeUnits(list) {
  const seen = new Set();
  const out = [];
  for (const u of list) {
    if (seen.has(u.name)) continue;
    seen.add(u.name);
    out.push(u);
  }
  return out;
}

// Create a draggable unit DOM node
function createUnitItem(unit) {
  const el = document.createElement("div");
  el.className = "unit-item";
  el.dataset.name = unit.name;

  const left = document.createElement("div");
  left.className = "unit-left";

  const chip = document.createElement("span");
  chip.className = "unit-chip";
  chip.textContent = unit.class;

  const title = document.createElement("span");
  title.className = "unit-name-compact";
  title.textContent = unit.name;

  left.append(chip, title);

  const hint = document.createElement("span");
  hint.className = "drag-hint";
  hint.textContent = "↕︎ drag";

  el.append(left, hint);
  return el;
}

function clearChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/***** 🖱️ Drag & Drop (SortableJS) *****/
function setupSortable(listEl) {
  // eslint-disable-next-line no-undef
  Sortable.create(listEl, {
    group: "tiers",
    animation: 160,
    ghostClass: "drag-ghost",
    chosenClass: "dragging",
    dragClass: "dragging",
    forceFallback: true,

    // 🔒 Disable text selection globally while dragging
    onStart: () => document.body.classList.add("dragging"),
    onEnd: () => document.body.classList.remove("dragging")
  });

  // Prevent accidental long-press text selection on touch devices
  listEl.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) e.preventDefault();
  }, { passive: false });
}

/***** 🧭 Modal Open/Close *****/
function openModal() {
  tierModal.classList.add("active");
  tierModal.setAttribute("aria-hidden", "false");
  submitStatus.textContent = "";
  populateUnranked();
}
function closeModal() {
  tierModal.classList.remove("active");
  tierModal.setAttribute("aria-hidden", "true");
}

// Close on backdrop or X
tierModal.addEventListener("click", (e) => {
  if (e.target.matches("[data-close]")) closeModal();
});
openModalBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);

/***** 🧺 Populate Unranked *****/
function populateUnranked() {
  const uniqueUnits = dedupeUnits(units);
  // clear all lists
  clearChildren(unrankedPool);
  for (const { el } of tierContainers) clearChildren(el);

  // add all units to unranked
  uniqueUnits.forEach((u) => unrankedPool.appendChild(createUnitItem(u)));
}

/***** 🧾 Collect Ranked Entries *****/
function collectRanked() {
  const ranked = [];
  for (const { tier, el } of tierContainers) {
    const children = Array.from(el.children);
    if (!children.length) continue;
    const score = TIER_POINTS[tier];
    for (const child of children) {
      const name = child.dataset.name;
      ranked.push({ name, score });
    }
  }
  return ranked;
}

/***** 🚀 Submit Rankings via RPC *****/
async function submitRankings() {
  if (!supabase) {
    submitStatus.textContent = "Supabase config missing. Please add your URL & anon key.";
    return;
  }
  const items = collectRanked();
  if (items.length === 0) {
    submitStatus.textContent = "You didn't rank any units yet. Drag some into tiers!";
    return;
  }
  submitBtn.disabled = true;
  submitStatus.textContent = "Submitting…";

  try {
    const payload = { [RPC_PARAM_NAME]: items };
    const { data, error } = await supabase.rpc("submit_tier_list", payload);
    if (error) throw error;

    submitStatus.textContent = "Thanks! Your rankings were recorded. Refreshing leaderboard…";
    await loadLeaderboard(); // refresh
    setTimeout(() => closeModal(), 650);
  } catch (err) {
    console.error(err);
    submitStatus.textContent = "Submission failed. Please try again.";
  } finally {
    submitBtn.disabled = false;
  }
}

/***** 🏆 Leaderboard Loading & Render *****/
function renderLeaderboard(rows) {
  clearChildren(leaderboardList);
  let rank = 1;
  for (const row of rows) {
    const li = document.createElement("li");
    li.className = "leaderboard-row";

    const rankNum = document.createElement("div");
    rankNum.className = "rank-num";
    rankNum.textContent = rank++;

    const nameBox = document.createElement("div");
    const nm = document.createElement("div");
    nm.className = "unit-name";
    nm.textContent = row.name;
    const cl = document.createElement("div");
    cl.className = "unit-class";
    cl.textContent = row.class ?? "—";
    nameBox.append(nm, cl);

    const avg = document.createElement("div");
    avg.className = "avg-score";
    avg.textContent = `Avg: ${toFixedOrDash(row.avg)}`;

    const tag = document.createElement("div");
    const tier = row.tier;
    tag.className = "tier-tag " + (tier ? `tier-${tier}-tag` : "");
    tag.textContent = tier ? `${tier} Tier` : "Unranked";

    li.append(rankNum, nameBox, tag, avg);
    leaderboardList.appendChild(li);
  }
}

async function loadLeaderboard() {
  lbStatus.textContent = "Loading…";
  try {
    const uniqueUnits = dedupeUnits(units);

    // Fetch existing scores from Supabase
    let dbMap = new Map();
    if (supabase) {
      const { data, error } = await supabase
        .from("units")
        .select("name,total_score,ranking_count");
      if (error) throw error;
      data?.forEach(row => dbMap.set(row.name, row));
    } else {
      lbStatus.textContent = "Supabase not configured — showing local units only.";
    }

    // Merge local list with DB data
    const merged = uniqueUnits.map(u => {
      const db = dbMap.get(u.name);
      const avg = db && db.ranking_count > 0
        ? db.total_score / db.ranking_count
        : null;
      const tier = POINTS_TO_TIER(avg);
      return {
        name: u.name,
        class: u.class,
        avg,
        tier,
        _sortAvg: avg ?? -1
      };
    });

    // Sort by avg desc, then name asc
    merged.sort((a, b) => {
      if (b._sortAvg !== a._sortAvg) return b._sortAvg - a._sortAvg;
      return a.name.localeCompare(b.name);
    });

    renderLeaderboard(merged);
    lbStatus.textContent = `Updated • ${new Date().toLocaleTimeString()}`;
  } catch (err) {
    console.error(err);
    lbStatus.textContent = "Failed to load leaderboard.";
  }
}

/***** ⛓️ Init Sortables *****/
document.addEventListener("DOMContentLoaded", () => {
  // Setup Sortable on all droplists
  setupSortable(unrankedPool);
  tierContainers.forEach(({ el }) => setupSortable(el));

  // Hook submit
  submitBtn.addEventListener("click", submitRankings);

  // First load
  loadLeaderboard();
});