(function () {
  const topics = window.TOPICS || [];
  const site = window.SITE || {};

  const nav = document.getElementById("nav");
  const search = document.getElementById("search");
  const topicTitle = document.getElementById("topic-title");
  const topicSummary = document.getElementById("topic-summary");
  const topicBody = document.getElementById("topic-body");
  const themeBtn = document.getElementById("theme-btn");

  document.getElementById("site-title").textContent = site.title || "Revision Hub";
  document.getElementById("site-tagline").textContent = site.tagline || "";
  document.getElementById("author").textContent = site.author || "Notes";
  document.title = site.title || "Revision Hub";

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("revision-hub-theme", theme);
    themeBtn.textContent = theme === "dark" ? "Light mode" : "Dark mode";
  }

  const saved = localStorage.getItem("revision-hub-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(saved || (prefersDark ? "dark" : "light"));

  themeBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "light" : "dark");
  });

  function renderNav(filter = "") {
    const q = filter.trim().toLowerCase();
    nav.innerHTML = "";

    const filtered = topics.filter((t) => {
      const hay = `${t.group} ${t.title} ${t.summary}`.toLowerCase();
      return !q || hay.includes(q);
    });

    let lastGroup = null;
    filtered.forEach((topic) => {
      if (topic.group !== lastGroup) {
        const label = document.createElement("div");
        label.className = "nav-group";
        label.textContent = topic.group;
        nav.appendChild(label);
        lastGroup = topic.group;
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = topic.title;
      btn.dataset.id = topic.id;
      btn.addEventListener("click", () => showTopic(topic.id));
      nav.appendChild(btn);
    });

    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "No topics matched.";
      nav.appendChild(empty);
    }
  }

  function enhanceCodeBlocks() {
    topicBody.querySelectorAll("pre").forEach((pre) => {
      if (pre.querySelector(".copy-btn")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.textContent = "Copy";
      btn.addEventListener("click", async () => {
        const code = pre.querySelector("code");
        const text = code ? code.textContent : pre.textContent;
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = "Copied";
          setTimeout(() => (btn.textContent = "Copy"), 1200);
        } catch {
          btn.textContent = "Failed";
          setTimeout(() => (btn.textContent = "Copy"), 1200);
        }
      });
      pre.appendChild(btn);
    });
  }

  function showTopic(id) {
    const topic = topics.find((t) => t.id === id) || topics[0];
    if (!topic) return;

    topicTitle.textContent = topic.title;
    topicSummary.textContent = topic.summary;
    topicBody.innerHTML = topic.body;
    enhanceCodeBlocks();

    nav.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.id === topic.id);
    });

    history.replaceState(null, "", `#${topic.id}`);
  }

  search.addEventListener("input", () => {
    renderNav(search.value);
    const first = nav.querySelector("button");
    if (first) showTopic(first.dataset.id);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== search) {
      e.preventDefault();
      search.focus();
    }
  });

  renderNav();

  if (!topics.length) {
    topicTitle.textContent = "No topics yet";
    topicSummary.textContent = "Revise a concept, then add it in topics.js.";
    topicBody.innerHTML = `
      <h3>How to add</h3>
      <ol>
        <li>Open <code>topics.js</code></li>
        <li>Copy the example object inside <code>window.TOPICS</code></li>
        <li>Fill your notes and save</li>
        <li>Refresh this page</li>
      </ol>
    `;
    return;
  }

  const initial = location.hash.replace("#", "") || topics[0].id;
  showTopic(initial);
})();
