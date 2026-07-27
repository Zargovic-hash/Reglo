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
      optionEl.addEventListener("click", () => {
        const value = optionEl.dataset.value;
        answers[questionId] = value;
        optionsEl.querySelectorAll(".option").forEach((o) => o.classList.remove("selected"));
        optionEl.classList.add("selected");
        optionEl.querySelector("input").checked = true;

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
  btnSubmit.textContent = "Envoi en cours...";

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

    const { leadId, emailSent } = await response.json();
    const { percent, niveau } = computeScore();
    document.getElementById("done-title").textContent = `Votre niveau de conformité : ${niveau}`;
    document.getElementById("done-score").textContent = `Score estimé : ${percent}%`;

    if (emailSent) {
      document.getElementById("done-email-msg").classList.remove("hidden");
    } else {
      const downloadLink = document.getElementById("done-download-link");
      downloadLink.href = `${API_BASE_URL}/api/leads/${leadId}/report.pdf`;
      document.getElementById("done-download").classList.remove("hidden");
    }

    stepGate.classList.add("hidden");
    stepDone.classList.remove("hidden");
  } catch (err) {
    submitErrorEl.textContent = err.message || "Impossible d'envoyer vos informations. Merci de réessayer.";
    submitErrorEl.classList.remove("hidden");
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = "Recevoir mon rapport de conformité";
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
