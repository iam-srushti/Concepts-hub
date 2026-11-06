(function () {
  const STORAGE_KEY = "revision-hub-docs-v2";
  const OLD_KEY = "revision-hub-docs-v1";
  const site = window.SITE || {};

  const SECTIONS = [
    { id: "linux", label: "Linux", icon: "🐧" },
    { id: "containers", label: "Containers", icon: "📦" },
    { id: "openshift", label: "OpenShift", icon: "🔴" },
  ];

  const els = {
    nav: document.getElementById("nav"),
    search: document.getElementById("search"),
    themeBtn: document.getElementById("theme-btn"),
    newBtn: document.getElementById("new-btn"),
    exportBtn: document.getElementById("export-btn"),
    empty: document.getElementById("empty-state"),
    panel: document.getElementById("doc-panel"),
    viewMode: document.getElementById("view-mode"),
    editMode: document.getElementById("edit-mode"),
    editBtn: document.getElementById("edit-btn"),
    saveBtn: document.getElementById("save-btn"),
    cancelBtn: document.getElementById("cancel-btn"),
    deleteBtn: document.getElementById("delete-btn"),
    viewSection: document.getElementById("view-section"),
    viewIcon: document.getElementById("view-icon"),
    viewTitle: document.getElementById("view-title"),
    viewSummary: document.getElementById("view-summary"),
    viewBody: document.getElementById("view-body"),
    editSection: document.getElementById("edit-section"),
    editTitle: document.getElementById("edit-title"),
    editIcon: document.getElementById("edit-icon"),
    editSummary: document.getElementById("edit-summary"),
    editNotes: document.getElementById("edit-notes"),
    richToolbar: document.getElementById("rich-toolbar"),
    editComponents: document.getElementById("edit-components"),
    editSteps: document.getElementById("edit-steps"),
    editCommands: document.getElementById("edit-commands"),
    editDiagram: document.getElementById("edit-diagram"),
  };

  const activeSectionLabel = document.getElementById("active-section-label");

  document.getElementById("site-title").textContent = site.title || "Revision Hub";
  document.getElementById("site-tagline").textContent =
    site.tagline || "Linux → Containers → OpenShift";
  document.title = site.title || "Revision Hub";

  let docs = loadDocs();
  let currentId = null;
  let editing = false;
  let activeSection = localStorage.getItem("revision-hub-section") || "linux";
  if (!SECTIONS.some((s) => s.id === activeSection)) activeSection = "linux";

  function sectionMeta(id) {
    return SECTIONS.find((s) => s.id === id) || SECTIONS[0];
  }

  function updateNewButton() {
    const sec = sectionMeta(activeSection);
    els.newBtn.textContent = `+ New in ${sec.label}`;
    if (activeSectionLabel) {
      activeSectionLabel.textContent = `Selected: ${sec.icon} ${sec.label}`;
    }
  }

  function migrateOld(doc) {
    if (doc.notes != null || doc.components != null) return doc;
    // old v1 shape → plain fields
    let notes = doc.bodyText || "";
    if (/<[a-z]/i.test(notes)) {
      notes = notes
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();
    }
    return {
      ...doc,
      notes,
      components: "",
      steps: "",
      commands: "",
      diagram: "",
    };
  }

  function loadDocs() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) raw = localStorage.getItem(OLD_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((d) =>
        migrateOld({
          ...d,
          section: SECTIONS.some((s) => s.id === d.section) ? d.section : "linux",
        })
      );
    } catch {
      return [];
    }
  }

  function saveDocs() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  }

  function uid() {
    return "doc-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("revision-hub-theme", theme);
  }

  const savedTheme = localStorage.getItem("revision-hub-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(savedTheme || (prefersDark ? "dark" : "light"));
  els.themeBtn.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    setTheme(cur === "dark" ? "light" : "dark");
  });

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function lines(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }

  function plainToHtml(text) {
    return String(text || "")
      .split(/\n{2,}/)
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
      .join("\n");
  }

  function notesToHtml(doc) {
    const html = String(doc.notesHtml || "").trim();
    if (html) return html;
    const notes = String(doc.notes || "").trim();
    if (!notes) return "";
    if (/<[a-z][\s\S]*>/i.test(notes)) return notes;
    return plainToHtml(notes);
  }

  function buildHtml(doc) {
    const parts = [];

    const notesHtml = notesToHtml(doc);
    if (notesHtml) parts.push(`<div class="notes-block">${notesHtml}</div>`);

    const comps = lines(doc.components);
    if (comps.length) {
      const lis = comps
        .map((line) => {
          const m = line.split(/\s[-:–—]\s/);
          if (m.length >= 2) {
            return `<li><strong>${escapeHtml(m[0])}:</strong> ${escapeHtml(m.slice(1).join(" - "))}</li>`;
          }
          return `<li>${escapeHtml(line)}</li>`;
        })
        .join("");
      parts.push(`<div class="info-card"><h4>Key Components</h4><ul>${lis}</ul></div>`);
    }

    if (doc.diagram) {
      parts.push(
        `<img class="diagram" src="${escapeHtml(doc.diagram)}" alt="Diagram for ${escapeHtml(doc.title || "topic")}" />`
      );
    }

    const steps = lines(doc.steps);
    if (steps.length) {
      const lis = steps
        .map((s, i) => `<li><strong>Step ${i + 1}:</strong> ${escapeHtml(s)}</li>`)
        .join("");
      parts.push(`<div class="process-box"><h4>Process</h4><ol>${lis}</ol></div>`);
    }

    const cmds = lines(doc.commands);
    if (cmds.length) {
      parts.push(
        `<div class="cmd-box"><div class="cmd-box-head">Common Commands</div><pre><code>${escapeHtml(
          cmds.join("\n")
        )}</code></pre></div>`
      );
    }

    if (!parts.length) {
      return "<p><em>No notes yet. Click Edit to write.</em></p>";
    }
    return parts.join("\n");
  }

  function selectSection(sectionId) {
    activeSection = sectionId;
    localStorage.setItem("revision-hub-section", sectionId);
    updateNewButton();
    renderNav(els.search.value);
  }

  function renderNav(filter = "") {
    const q = filter.trim().toLowerCase();
    els.nav.innerHTML = "";

    SECTIONS.forEach((sec) => {
      const wrap = document.createElement("div");
      wrap.className = "nav-section" + (sec.id === activeSection ? " is-active-section" : "");

      const head = document.createElement("div");
      head.className = "nav-section-head";

      const selectBtn = document.createElement("button");
      selectBtn.type = "button";
      selectBtn.className = "section-select-btn";
      selectBtn.innerHTML = `<span>${sec.icon}</span><span>${sec.label}</span>`;
      selectBtn.addEventListener("click", () => selectSection(sec.id));

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "section-add-btn";
      addBtn.textContent = "+";
      addBtn.title = `New topic in ${sec.label}`;
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        createDoc(sec.id);
      });

      head.appendChild(selectBtn);
      head.appendChild(addBtn);
      wrap.appendChild(head);

      const items = docs
        .filter((d) => d.section === sec.id)
        .filter((d) => {
          const hay = `${d.title} ${d.summary || ""} ${d.notes || ""}`.toLowerCase();
          return !q || hay.includes(q);
        })
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

      if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "nav-section-empty";
        empty.textContent = q ? "No match" : "No concepts yet";
        wrap.appendChild(empty);
      } else {
        items.forEach((doc) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.dataset.id = doc.id;
          btn.innerHTML = `<span class="nav-ico">${doc.icon || "📄"}</span><span>${escapeHtml(
            doc.title || "Untitled"
          )}</span>`;
          btn.classList.toggle("active", doc.id === currentId);
          btn.addEventListener("click", () => openDoc(doc.id));
          wrap.appendChild(btn);
        });
      }

      els.nav.appendChild(wrap);
    });
  }

  function enhanceCodeBlocks(root) {
    root.querySelectorAll(".cmd-box").forEach((box) => {
      if (box.querySelector(".copy-btn")) return;
      const head = box.querySelector(".cmd-box-head");
      const pre = box.querySelector("pre");
      if (!head || !pre) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.textContent = "Copy";
      btn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(pre.textContent);
          btn.textContent = "Copied";
          setTimeout(() => (btn.textContent = "Copy"), 1200);
        } catch {
          btn.textContent = "Failed";
        }
      });
      head.appendChild(btn);
    });
  }

  function showEmpty() {
    currentId = null;
    editing = false;
    els.empty.classList.remove("hidden");
    els.panel.classList.add("hidden");
    renderNav(els.search.value);
    history.replaceState(null, "", location.pathname);
  }

  function setEditUI(on) {
    editing = on;
    els.viewMode.classList.toggle("hidden", on);
    els.editMode.classList.toggle("hidden", !on);
    els.editBtn.classList.toggle("hidden", on);
    els.saveBtn.classList.toggle("hidden", !on);
    els.cancelBtn.classList.toggle("hidden", !on);
  }

  function fillEditForm(doc) {
    els.editSection.value = doc.section || "linux";
    els.editTitle.value = doc.title || "";
    els.editIcon.value = doc.icon || "📘";
    els.editSummary.value = doc.summary || "";
    els.editNotes.innerHTML = notesToHtml(doc) || "";
    els.editComponents.value = doc.components || "";
    els.editSteps.value = doc.steps || "";
    els.editCommands.value = doc.commands || "";
    els.editDiagram.value = doc.diagram || "";
  }

  function runCmd(cmd, value) {
    els.editNotes.focus();
    try {
      document.execCommand(cmd, false, value || null);
    } catch (_) {
      /* ignore unsupported */
    }
  }

  if (els.richToolbar) {
    els.richToolbar.addEventListener("mousedown", (e) => {
      // keep selection inside editor
      if (e.target.closest("button")) e.preventDefault();
    });

    els.richToolbar.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      if (btn.dataset.color) {
        runCmd("foreColor", btn.dataset.color);
        return;
      }
      if (btn.dataset.highlight !== undefined) {
        const val = btn.dataset.highlight;
        if (val === "transparent") {
          runCmd("removeFormat");
        } else {
          runCmd("hiliteColor", val);
          // fallback for some browsers
          runCmd("backColor", val);
        }
        return;
      }
      if (btn.dataset.cmd === "formatBlock") {
        runCmd("formatBlock", btn.dataset.value || "h3");
        return;
      }
      if (btn.dataset.cmd) runCmd(btn.dataset.cmd);
    });
  }

  function openDoc(id, startEdit = false) {
    const doc = docs.find((d) => d.id === id);
    if (!doc) return showEmpty();

    currentId = id;
    els.empty.classList.add("hidden");
    els.panel.classList.remove("hidden");

    if (doc.section) selectSection(doc.section);

    const sec = sectionMeta(doc.section);
    els.viewSection.textContent = `${sec.icon} ${sec.label}`;
    els.viewIcon.textContent = doc.icon || "📘";
    els.viewTitle.textContent = doc.title || "Untitled";
    els.viewSummary.textContent = doc.summary || "";
    els.viewBody.innerHTML = buildHtml(doc);
    enhanceCodeBlocks(els.viewBody);

    fillEditForm(doc);
    setEditUI(startEdit);
    renderNav(els.search.value);
    history.replaceState(null, "", `#${id}`);
  }

  function createDoc(sectionId) {
    const section = sectionId || activeSection || "linux";
    selectSection(section);

    const doc = {
      id: uid(),
      section,
      title: "Untitled topic",
      icon: "📘",
      summary: "",
      notes: "",
      notesHtml: "",
      components: "",
      steps: "",
      commands: "",
      diagram: "",
      updatedAt: Date.now(),
    };
    docs.unshift(doc);
    saveDocs();
    openDoc(doc.id, true);
    els.editTitle.focus();
    els.editTitle.select();
  }

  function saveCurrent() {
    const doc = docs.find((d) => d.id === currentId);
    if (!doc) return;

    doc.section = els.editSection.value || "linux";
    doc.title = els.editTitle.value.trim() || "Untitled topic";
    doc.icon = els.editIcon.value.trim() || "📘";
    doc.summary = els.editSummary.value.trim();
    doc.notesHtml = els.editNotes.innerHTML.trim();
    doc.notes = els.editNotes.innerText.trim(); // for search
    doc.components = els.editComponents.value;
    doc.steps = els.editSteps.value;
    doc.commands = els.editCommands.value;
    doc.diagram = els.editDiagram.value.trim();
    doc.updatedAt = Date.now();

    saveDocs();
    openDoc(doc.id, false);
  }

  function cancelEdit() {
    if (!currentId) return showEmpty();
    openDoc(currentId, false);
  }

  function deleteCurrent() {
    if (!currentId) return;
    const doc = docs.find((d) => d.id === currentId);
    if (!confirm(`Delete "${doc ? doc.title : "this topic"}"?`)) return;
    docs = docs.filter((d) => d.id !== currentId);
    saveDocs();
    if (docs[0]) openDoc(docs[0].id);
    else showEmpty();
  }

  els.newBtn.addEventListener("click", () => createDoc(activeSection));
  els.editBtn.addEventListener("click", () => setEditUI(true));
  els.saveBtn.addEventListener("click", saveCurrent);
  els.cancelBtn.addEventListener("click", cancelEdit);
  els.deleteBtn.addEventListener("click", deleteCurrent);
  els.search.addEventListener("input", () => renderNav(els.search.value));

  els.exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(docs, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "revision-hub-backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  window.addEventListener("keydown", (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (e.key === "/" && tag !== "TEXTAREA" && tag !== "INPUT" && tag !== "SELECT") {
      e.preventDefault();
      els.search.focus();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && editing) {
      e.preventDefault();
      saveCurrent();
    }
  });

  updateNewButton();
  renderNav();
  const hash = location.hash.replace("#", "");
  if (hash && docs.some((d) => d.id === hash)) openDoc(hash);
  else if (docs.length) openDoc(docs[0].id);
  else showEmpty();
})();
