const projects = [
  {
    id: "floodline",
    title: "Floodline Commons",
    creator: "Ari Ramos",
    category: "engineering",
    type: "Product thinking",
    outcome: "Used by 3 neighborhood groups during a flood drill",
    shape: "shape-map",
    description:
      "Interactive map comparing flood reports, cooling centers, and transit access. Ari owned the front-end prototype and translated interviews into route-planning flows.",
    skills: ["React", "GIS", "Civic Data", "User Testing"],
    link: "https://example.com/floodline-commons",
  },
  {
    id: "carekit",
    title: "CareKit Textline",
    creator: "Mina Okafor",
    category: "research",
    type: "Service design",
    outcome: "Reduced coordinator handoffs in a volunteer simulation",
    shape: "shape-phone",
    description:
      "SMS prototype for student volunteers coordinating medicine delivery with clinics. The proof is the operating model, not just the interface.",
    skills: ["Research", "Twilio", "Service Design", "Ops"],
    link: "https://example.com/carekit-textline",
  },
  {
    id: "soil",
    title: "Soil Notes Field Book",
    creator: "Theo Nguyen",
    category: "research",
    type: "Data storytelling",
    outcome: "Six-month study converted into a public field guide",
    shape: "shape-book",
    description:
      "Field-study log and visualization project tracking school garden soil health. Strong evidence of careful collection and clear communication.",
    skills: ["Data Collection", "Python", "Writing", "Charts"],
    link: "https://example.com/soil-notes",
  },
  {
    id: "studio",
    title: "After School Studio Board",
    creator: "Lena Patel",
    category: "design",
    type: "Design execution",
    outcome: "Matched 12 student artists with mural briefs",
    shape: "shape-board",
    description:
      "Collaborative board for matching student artists with community mural briefs and mentor feedback. The artifact shows product judgment and facilitation.",
    skills: ["Figma", "Facilitation", "Product Thinking"],
    link: "https://example.com/studio-board",
  },
  {
    id: "sensor",
    title: "Low-Cost Air Sensor",
    creator: "Sam Brooks",
    category: "engineering",
    type: "Technical depth",
    outcome: "Prototype compared readings near 4 bus stops",
    shape: "shape-chip",
    description:
      "Hardware and dashboard experiment comparing air quality readings near bus stops before school. Evidence spans hardware, analysis, and communication.",
    skills: ["Arduino", "Dashboards", "Statistics"],
    link: "https://example.com/air-sensor",
  },
  {
    id: "zine",
    title: "First-Gen Finance Zine",
    creator: "Nora Castillo",
    category: "design",
    type: "Clear communication",
    outcome: "Shared with 180 students during internship prep",
    shape: "shape-zine",
    description:
      "Printable and web zine explaining internship pay, taxes, and budgeting in plain student language. The proof is clarity under real student constraints.",
    skills: ["Editorial Design", "Copywriting", "HTML"],
    link: "https://example.com/finance-zine",
  },
];

const routeButtons = document.querySelectorAll("[data-route]");
const navPills = document.querySelectorAll(".nav-pill[data-route]");
const views = document.querySelectorAll(".view");
const artifactIndex = document.querySelector("#artifactIndex");
const exhibitStage = document.querySelector("#exhibitStage");
const exhibitRow = document.querySelector("#exhibitRow");
const timelineNote = document.querySelector("#timelineNote");
const passportProjects = document.querySelector("#passportProjects");
const modal = document.querySelector("#projectModal");
const closeModal = document.querySelector("#closeModal");
const modalArt = document.querySelector("#modalArt");
const modalCreator = document.querySelector("#modalCreator");
const modalTitle = document.querySelector("#modalTitle");
const modalType = document.querySelector("#modalType");
const modalOutcome = document.querySelector("#modalOutcome");
const modalDescription = document.querySelector("#modalDescription");
const modalSkills = document.querySelector("#modalSkills");
const modalLink = document.querySelector("#modalLink");
const detailList = document.querySelector("#detailList");
const fakeSuccess = document.querySelector("#fakeSuccess");

function shapeMarkup(project) {
  return `<span class="${project.shape}"></span>`;
}

function proofCard(project) {
  return `
    <button class="proof-card" data-project="${project.id}">
      <div class="proof-media">${shapeMarkup(project)}</div>
      <div class="proof-body">
        <span class="proof-label">Proves / ${project.type}</span>
        <h3>${project.title}</h3>
        <p>${project.description}</p>
        <div class="skill-row">${project.skills.slice(0, 3).map((skill) => `<span>${skill}</span>`).join("")}</div>
      </div>
    </button>
  `;
}

function exhibitCard(project) {
  return `
    <button class="exhibit-card" data-project="${project.id}">
      <span class="artifact-visual">${shapeMarkup(project)}</span>
      <strong>${project.title}</strong>
    </button>
  `;
}

function passportRow(project) {
  return `
    <button class="passport-row" data-project="${project.id}">
      <span class="mini-proof ${project.shape}"></span>
      <span>
        <strong>${project.title}</strong>
        <small>${project.type} / ${project.outcome}</small>
      </span>
      <span class="button">Inspect proof</span>
    </button>
  `;
}

function showRoute(route) {
  views.forEach((view) => view.classList.toggle("is-visible", view.id === route));
  navPills.forEach((pill) => pill.classList.toggle("is-active", pill.dataset.route === route));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setGalleryMode(mode) {
  document.querySelectorAll("[data-gallery-mode]").forEach((item) => {
    item.classList.toggle("is-selected", item.dataset.galleryMode === mode);
  });
  exhibitStage.hidden = mode !== "exhibits";
  artifactIndex.hidden = mode !== "index";
  timelineNote.hidden = mode !== "timeline";
}

function renderDetailRail(project) {
  const index = projects.findIndex((item) => item.id === project.id);
  const previous = projects[index - 1];
  const next = projects[index + 1];

  detailList.innerHTML = `
    ${previous ? `<p><strong>${String(index).padStart(2, "0")}</strong>${previous.title}</p>` : ""}
    <p>Current:</p>
    <p class="current"><strong>${String(index + 1).padStart(2, "0")}</strong>${project.title}</p>
    <p>Up next:</p>
    ${next ? `<p><strong>${String(index + 2).padStart(2, "0")}</strong>${next.title}</p>` : "<p>End of proof set</p>"}
  `;
}

function openProject(projectId) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return;

  modalArt.innerHTML = shapeMarkup(project);
  modalCreator.textContent = `${project.creator} / ${project.category}`;
  modalTitle.textContent = project.title;
  modalType.textContent = project.type;
  modalOutcome.textContent = project.outcome;
  modalDescription.textContent = project.description;
  modalSkills.innerHTML = project.skills.map((skill) => `<span>${skill}</span>`).join("");
  modalLink.href = project.link;
  renderDetailRail(project);
  modal.hidden = false;
  closeModal.focus();
}

routeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const route = button.dataset.route;
    if (route) showRoute(route);
  });
});

document.querySelectorAll("[data-gallery-mode]").forEach((button) => {
  button.addEventListener("click", () => setGalleryMode(button.dataset.galleryMode));
});

document.addEventListener("click", (event) => {
  const projectButton = event.target.closest("[data-project]");
  if (projectButton) openProject(projectButton.dataset.project);
});

closeModal.addEventListener("click", () => {
  modal.hidden = true;
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) modal.hidden = true;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") modal.hidden = true;
});

fakeSuccess.addEventListener("click", () => {
  document.querySelector(".success-note").hidden = false;
});

artifactIndex.innerHTML = projects.map(proofCard).join("");
exhibitRow.innerHTML = projects.slice(0, 4).map(exhibitCard).join("");
passportProjects.innerHTML = projects.slice(0, 3).map(passportRow).join("");
setGalleryMode("exhibits");
