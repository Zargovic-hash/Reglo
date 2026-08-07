// Config: adapter selon l'environnement de déploiement du Backend
const API_BASE_URL = window.REGLO_API_BASE_URL || "http://localhost:3001";
const QUESTIONS_ENDPOINT = `${API_BASE_URL}/api/leads/questions-audit-environnement`;
const API_ENDPOINT = `${API_BASE_URL}/api/leads/audit-environnement`;

// Les exigences sont chargées dynamiquement depuis reglementation_all
// (domaine "Autorisations et gouvernance Environnementales", Titres "Taxes
// et frais environnementaux" et "Autorisation d exploitation") via l'API
// Backend, pour rester synchronisées avec l'app Reglo+.
let QUESTIONS = [];

const SCORE_VALUES = { oui: 1, non: 0 };

let currentIndex = 0;
const answers = {};

const questionGroupsEl = document.getElementById("question-groups");
const progressFillEl = document.getElementById("progress-fill");
const progressLabelEl = document.getElementById("progress-label");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");

const stepQuiz = document.getElementById("step-quiz");
const stepGate = document.getElementById("step-gate");
const stepDone = document.getElementById("step-done");

const leadForm = document.getElementById("lead-form");
const btnSubmit = document.getElementById("btn-submit");
const submitErrorEl = document.getElementById("submit-error");

function renderQuestions() {
  questionGroupsEl.innerHTML = QUESTIONS.map((q, index) => `
    <div class="question-block ${index === 0 ? "active" : ""}" data-index="${index}">
      <div class="question-group-title">${q.groupe}</div>
      <p class="question-text">${q.texte}</p>
      <p class="question-ref">${q.ref}</p>
      <div class="options" data-question-id="${q.id}">
        <label class="option" data-value="oui">
          <input type="radio" name="${q.id}" value="oui" />
          Oui
        </label>
        <label class="option" data-value="non">
          <input type="radio" name="${q.id}" value="non" />
          Non
        </label>
        <label class="option" data-value="non_applicable">
          <input type="radio" name="${q.id}" value="non_applicable" />
          Non applicable
        </label>
      </div>
    </div>
  `).join("");

  questionGroupsEl.querySelectorAll(".options").forEach((optionsEl) => {
    const questionId = optionsEl.dataset.questionId;
    optionsEl.querySelectorAll(".option").forEach((optionEl) => {
      const input = optionEl.querySelector("input");
      // Écoute "change" sur l'input (et non "click" sur le label) : cliquer sur un
      // <label> déclenche un click natif sur le label ET un click forwardé sur son
      // <input> associé, ce qui ferait avancer le quiz de 2 questions d'un coup.
      input.addEventListener("change", () => {
        const value = optionEl.dataset.value;
        answers[questionId] = value;
        optionsEl.querySelectorAll(".option").forEach((o) => o.classList.remove("selected"));
        optionEl.classList.add("selected");

        if (currentIndex < QUESTIONS.length - 1) {
          setTimeout(() => goToQuestion(currentIndex + 1), 200);
        } else {
          updateNavButtons();
        }
      });
    });
  });
}

function goToQuestion(index) {
  currentIndex = Math.max(0, Math.min(index, QUESTIONS.length - 1));
  questionGroupsEl.querySelectorAll(".question-block").forEach((block) => {
    block.classList.toggle("active", Number(block.dataset.index) === currentIndex);
  });
  updateProgress();
  updateNavButtons();
}

function updateProgress() {
  const percent = ((currentIndex + 1) / QUESTIONS.length) * 100;
  progressFillEl.style.width = `${percent}%`;
  progressLabelEl.textContent = `Question ${currentIndex + 1} / ${QUESTIONS.length}`;
}

function updateNavButtons() {
  btnPrev.disabled = currentIndex === 0;
  const isLast = currentIndex === QUESTIONS.length - 1;
  btnNext.textContent = isLast ? "Voir mon résultat" : "Suivant";
}

btnPrev.addEventListener("click", () => goToQuestion(currentIndex - 1));

btnNext.addEventListener("click", () => {
  const currentQuestion = QUESTIONS[currentIndex];
  if (!answers[currentQuestion.id]) {
    const block = questionGroupsEl.querySelector(`.question-block[data-index="${currentIndex}"]`);
    block.style.animation = "none";
    // Petite relance forcée du navigateur pour rejouer l'effet visuel si besoin
    void block.offsetWidth;
    return;
  }

  if (currentIndex < QUESTIONS.length - 1) {
    goToQuestion(currentIndex + 1);
  } else {
    showGate();
  }
});

function showGate() {
  stepQuiz.classList.add("hidden");
  stepGate.classList.remove("hidden");
}

function computeScore() {
  let total = 0;
  let applicableCount = 0;
  QUESTIONS.forEach((q) => {
    const reponse = answers[q.id];
    if (reponse === "non_applicable") return;
    applicableCount++;
    total += SCORE_VALUES[reponse] ?? 0;
  });
  const percent = applicableCount > 0 ? Math.round((total / applicableCount) * 100) : 0;
  let niveau = "Non conforme";
  if (percent >= 80) niveau = "Conforme";
  else if (percent >= 50) niveau = "Partiellement conforme";
  return { percent, niveau };
}

function setFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`err-${fieldId}`);
  input.classList.toggle("invalid", Boolean(message));
  errorEl.textContent = message || "";
}

function validateForm(telephone, email) {
  let valid = true;

  if (!telephone.trim()) {
    setFieldError("telephone", "Le numéro de téléphone est obligatoire.");
    valid = false;
  } else if (!/^[0-9+()\s.-]{8,20}$/.test(telephone.trim())) {
    setFieldError("telephone", "Format de téléphone invalide.");
    valid = false;
  } else {
    setFieldError("telephone", "");
  }

  if (!email.trim()) {
    setFieldError("email", "L'email est obligatoire.");
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    setFieldError("email", "Format d'email invalide.");
    valid = false;
  } else {
    setFieldError("email", "");
  }

  return valid;
}

leadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitErrorEl.classList.add("hidden");

  const nom = document.getElementById("nom").value;
  const telephone = document.getElementById("telephone").value;
  const email = document.getElementById("email").value;

  if (!validateForm(telephone, email)) return;

  const payload = {
    nom: nom.trim(),
    telephone: telephone.trim(),
    email: email.trim(),
    reponses: QUESTIONS.map((q) => ({ questionId: q.id, reponse: answers[q.id] })),
  };

  btnSubmit.disabled = true;
  btnSubmit.textContent = "Calcul en cours...";

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || "Une erreur est survenue, merci de réessayer.");
    }

    const { leadId } = await response.json();
    const { percent, niveau } = computeScore();
    document.getElementById("done-title").textContent = `Votre niveau de conformité : ${niveau}`;
    document.getElementById("done-score").textContent = `Score estimé : ${percent}%`;
    document.getElementById("done-download-link").href = `${API_BASE_URL}/api/leads/${leadId}/report.pdf`;

    stepGate.classList.add("hidden");
    stepDone.classList.remove("hidden");
  } catch (err) {
    submitErrorEl.textContent = err.message || "Impossible d'envoyer vos informations. Merci de réessayer.";
    submitErrorEl.classList.remove("hidden");
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = "Voir mon rapport de conformité";
  }
});

async function loadQuestions() {
  questionGroupsEl.innerHTML = `<p class="loading-msg">Chargement du questionnaire...</p>`;
  btnNext.disabled = true;

  try {
    const response = await fetch(QUESTIONS_ENDPOINT);
    if (!response.ok) throw new Error("Réponse invalide du serveur.");
    const { questions } = await response.json();
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Aucune question disponible.");
    }
    QUESTIONS = questions;
    btnNext.disabled = false;
    renderQuestions();
    updateProgress();
    updateNavButtons();
  } catch (err) {
    questionGroupsEl.innerHTML = `<p class="loading-msg">Impossible de charger le questionnaire pour le moment. Merci de réessayer dans quelques instants.</p>`;
  }
}

loadQuestions();

// ============================
// Scroll-reveal : les sections marquées ".reveal" apparaissent en douceur
// à leur premier passage à l'écran (perf : on arrête d'observer après coup).
// ============================
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
} else {
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in-view"));
}

// ============================
// Barre CTA flottante (mobile) : visible une fois le hero dépassé, masquée
// dès que le quiz ou le footer entrent dans le viewport (pour ne pas superposer le CTA final).
// ============================
const stickyCtaEl = document.getElementById("sticky-cta");
if (stickyCtaEl) {
  const heroEl = document.querySelector(".hero");
  const quizSectionEl = document.getElementById("quiz");
  const footerEl = document.querySelector(".site-footer");

  let heroPassed = false;
  let blockedByQuizOrFooter = false;

  const syncStickyCta = () => {
    stickyCtaEl.classList.toggle("visible", heroPassed && !blockedByQuizOrFooter);
  };

  if ("IntersectionObserver" in window && heroEl) {
    new IntersectionObserver(
      (entries) => {
        heroPassed = !entries[0].isIntersecting;
        syncStickyCta();
      },
      { threshold: 0 }
    ).observe(heroEl);

    const blockingObserver = new IntersectionObserver(
      (entries) => {
        blockedByQuizOrFooter = entries.some((entry) => entry.isIntersecting);
        syncStickyCta();
      },
      { threshold: 0 }
    );
    if (quizSectionEl) blockingObserver.observe(quizSectionEl);
    if (footerEl) blockingObserver.observe(footerEl);
  }
}

// ============================
// Topbar : ombre discrète une fois la page défilée (profondeur visuelle).
// ============================
const topbarEl = document.querySelector(".topbar");
if (topbarEl) {
  const syncTopbarShadow = () => topbarEl.classList.toggle("scrolled", window.scrollY > 8);
  syncTopbarShadow();
  window.addEventListener("scroll", syncTopbarShadow, { passive: true });
}

// ============================
// Compteur animé : les éléments ".stat-count" comptent de 0 à leur
// data-target dès leur premier passage à l'écran.
// ============================
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function animateCount(el) {
  const target = Number(el.dataset.target || 0);
  if (prefersReducedMotion || !target) {
    el.textContent = target;
    return;
  }
  const duration = 1200;
  const start = performance.now();
  const easeOutQuad = (t) => t * (2 - t);

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(target * easeOutQuad(progress));
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const statCountEls = document.querySelectorAll(".stat-count");
if (statCountEls.length) {
  if ("IntersectionObserver" in window) {
    const countObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    statCountEls.forEach((el) => countObserver.observe(el));
  } else {
    statCountEls.forEach(animateCount);
  }
}
