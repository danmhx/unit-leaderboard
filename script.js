/* =========================================================================
   Units Battlegrounds — Community Leaderboard (Netlify + Supabase)
   -----------------------------------------------------------------
   1) Paste your Supabase project credentials below.
   2) Create a table called `units` with columns:
        - name: text (PK or unique)
        - class: text
        - votes: integer (default 0)
   3) Create an RPC (Postgres function) named `increment_vote(unit_name text)`
      that securely increments the vote for the matching row.
   ======================================================================== */

/** 🔧 Supabase credentials — REPLACE THESE WITH YOURS **/
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co"; // <-- paste your URL
const SUPABASE_ANON_KEY = "YOUR-ANON-KEY";                    // <-- paste your anon key

/** Supabase client */
const supabase = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* -------------------------------------------------------------------------
   Units list (provided)
   ------------------------------------------------------------------------- */
const units = [
  { name: "Black Dragon", class: "Warrior" },
  { name: "Poseidon", class: "Warrior" },
  { name: "Zeus", class: "Wizard" },
  { name: "Thalion", class: "Support" },
  { name: "Omela Tree", class: "Tank" },
  { name: "Krampus", class: "Warrior" },
  { name: "Demon", class: "Warrior" },
  { name: "Jack", class: "Warrior" },
  { name: "Medusa", class: "Ranger" },
  { name: "Chaosflare", class: "Wizard" },
  { name: "Thanatos", class: "Assassin" },
  { name: "Ancient Vampire", class: "Assassin" },
  { name: "Cureflare", class: "Healer" },
  { name: "Inferno Archer", class: "Ranger" },
  { name: "Saint Nicholas", class: "Support" },
  { name: "Triton", class: "Support" },
  { name: "Commander", class: "Support" },
  { name: "Triton", class: "Support" },
  { name: "Ent", class: "Tank" },
  { name: "Sea Devil", class: "Tank" },
  { name: "Living Armor", class: "Tank" },
  { name: "The Reaper", class: "Warrior" },
  { name: "Yeti", class: "Warrior" },
  { name: "Goblin King", class: "Warrior" },
  { name: "Dragon Slayer", class: "Warrior" },
  { name: "Viperfang", class: "Assassin" },
  { name: "Yoki Onna", class: "Wizard" },
  { name: "Rhythmclaw", class: "Support" },
  { name: "Vendigo", class: "Assassin" },
  { name: "The Ice Queen", class: "Wizard" },
  { name: "Headless Knight", class: "Warrior" },
  { name: "Berserker", class: "Warrior" },
  { name: "Torturer", class: "Wizard" },
  { name: "Cage Man", class: "Wizard" },
  { name: "Gryla", class: "Summoner" },
  { name: "Oceanid", class: "Ranger" },
  { name: "Trifang", class: "Ranger" },
  { name: "Necromancer", class: "Summoner" },
  { name: "Nereid", class: "Healer" },
  { name: "Witch", class: "Healer" },
  { name: "Angel", class: "Healer" },
  { name: "Succubus", class: "Ranger" },
  { name: "Volt", class: "Wizard" },
  { name: "Candy Cane Shooter", class: "Ranger" },
  { name: "Bard", class: "Support" },
  { name: "Dark Herald", class: "Support" },
  { name: "Pool Party Blaster", class: "Ranger" },
  { name: "Cupid", class: "Ranger" },
  { name: "Crimson Assassin", class: "Assassin" },
  { name: "Bandit", class: "Ranger" },
  { name: "Marksman", class: "Ranger" },
  { name: "The Admiral of Death", class: "Ranger" }
];

/* =========================================================================
   Helper utilities
   ========================================================================= */

/**
 * showToast(message: string)
 * Displays a transient notification at the bottom center of the screen.
 */
function showToast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
}

/**
 * uniqueUnitsByName(units: {name, class}[])
 * Deduplicates units by name (e.g., "Triton" appears twice).
 */
function uniqueUnitsByName(list) {
  const seen = new Set();
  return list.filter(u => {
    const key = u.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * mergeUnitsWithVotes(units[], rowsFromDB[])
 * Returns a unified array with votes for all known units (0 if missing).
 */
function mergeUnitsWithVotes(baseUnits, rows) {
  const map = new Map();
  (rows || []).forEach(r => map.set(r.name, { ...r }));

  return baseUnits.map(u => {
    const db = map.get(u.name);
    return {
      name: u.name,
      class: u.class,
      votes: db?.votes ?? 0
    };
  });
}

/**
 * groupByClass(unifiedUnits[])
 * Groups units by class; sorts each group by votes desc, then name asc.
 */
function groupByClass(items) {
  const groups = {};
  for (const u of items) {
    (groups[u.class] ||= []).push(u);
  }
  for (const cls of Object.keys(groups)) {
    groups[cls].sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.name.localeCompare(b.name);
    });
  }
  return groups;
}

/* =========================================================================
   DOM rendering
   ========================================================================= */

/**
 * renderLeaderboards(groups)
 * Renders a card for each class, showing top 5 units.
 */
function renderLeaderboards(groups) {
  const container = document.getElementById("leaderboards");
  container.innerHTML = "";

  const classes = Object.keys(groups).sort((a, b) => a.localeCompare(b));

  for (const cls of classes) {
    const panel = document.createElement("article");
    panel.className = "card";

    panel.innerHTML = `
      <header class="card-header">
        <h3 class="card-title">${escapeHtml(cls)}</h3>
        <span class="card-badge">${groups[cls].length} units</span>
      </header>
      <div class="card-body">
        <table class="table" role="table" aria-label="${escapeHtml(cls)} leaderboard">
          <thead>
            <tr><th class="rank">#</th><th>Unit</th><th class="votes">Votes</th></tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    `;

    const tbody = panel.querySelector("tbody");
    const top = groups[cls].slice(0, 5);
    top.forEach((u, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="rank">${i + 1}</td>
        <td class="name">${escapeHtml(u.name)}</td>
        <td class="votes">${u.votes.toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });

    container.appendChild(panel);
  }
}

/**
 * populateDropdown()
 * Fills the select menu with all unit names, alphabetical.
 */
function populateDropdown() {
  const select = document.getElementById("unitSelect");
  select.innerHTML = "";

  const unique = uniqueUnitsByName(units)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const u of unique) {
    const opt = document.createElement("option");
    opt.value = u.name;
    opt.textContent = u.name;
    select.appendChild(opt);
  }
}

/**
 * escapeHtml(str) – small sanitizer to avoid accidental HTML injection.
 */
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================================================================
   Data flow with Supabase
   ========================================================================= */

/**
 * fetchAllVotes()
 * Grabs all vote rows from `units`. If your table contains additional rows,
 * they’ll be safely ignored/merged by name.
 */
async function fetchAllVotes() {
  if (!supabase) {
    console.warn("Supabase client not initialized.");
    return [];
  }

  const { data, error } = await supabase
    .from("units")
    .select("name, class, votes");

  if (error) {
    console.error(error);
    showToast("⚠️ Failed to fetch votes.");
    return [];
  }
  return data || [];
}

/**
 * submitVote(unitName)
 * Calls your Postgres RPC: increment_vote(unit_name text).
 */
async function submitVote(unitName) {
  if (!supabase) {
    showToast("Supabase is not configured.");
    return { ok: false };
  }

  const { data, error } = await supabase.rpc("increment_vote", {
    unit_name: unitName
  });

  if (error) {
    console.error(error);
    return { ok: false, error };
  }
  return { ok: true, data };
}

/* =========================================================================
   Modal controls & event wiring
   ========================================================================= */

function openModal() {
  const dialog = document.getElementById("voteModal");
  const overlay = document.getElementById("modalOverlay");
  overlay.hidden = false;
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    // Fallback for older browsers
    dialog.setAttribute("open", "");
  }
}

function closeModal() {
  const dialog = document.getElementById("voteModal");
  const overlay = document.getElementById("modalOverlay");
  overlay.hidden = true;
  if (typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}

/* Close modal on overlay click or Esc */
function wireModalClose() {
  const overlay = document.getElementById("modalOverlay");
  const closeBtn = document.getElementById("closeVote");
  overlay.addEventListener("click", closeModal);
  closeBtn.addEventListener("click", closeModal);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

/* =========================================================================
   Page init
   ========================================================================= */

async function refreshLeaderboards() {
  const rows = await fetchAllVotes();
  const unified = mergeUnitsWithVotes(uniqueUnitsByName(units), rows);
  const groups = groupByClass(unified);
  renderLeaderboards(groups);
}

function wireVoting() {
  document.getElementById("openVote").addEventListener("click", () => {
    populateDropdown();
    openModal();
    document.getElementById("unitSelect").focus();
  });

  document.getElementById("submitVote").addEventListener("click", async () => {
    const btn = document.getElementById("submitVote");
    const select = document.getElementById("unitSelect");
    const chosen = select.value;

    if (!chosen) {
      showToast("Pick a unit to vote for.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Submitting…";

    const res = await submitVote(chosen);

    btn.disabled = false;
    btn.textContent = "Submit Vote";

    if (res.ok) {
      closeModal();
      showToast(`✅ Vote recorded for “${chosen}”.`);
      await refreshLeaderboards();
    } else {
      showToast("⚠️ Could not submit your vote.");
    }
  });
}

/* Kickoff */
document.addEventListener("DOMContentLoaded", async () => {
  wireModalClose();
  wireVoting();
  await refreshLeaderboards();
});