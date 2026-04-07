const urlParams = new URLSearchParams(window.location.search);
let participant_id = urlParams.get("id");

if (!participant_id) {
  participant_id = "P" + Math.floor(Math.random() * 1000000);
}

const inicio = Date.now();
let total_trials = 0;

// jsPsych INIT (CORRETO)
const jsPsych = initJsPsych({
  display_element: "jspsych-target",

  on_trial_finish: function() {
    updateProgress();
  },

  on_finish: function() {
    const fim = Date.now();
    const duracao = fim - inicio;

    let dados = jsPsych.data.get().values();

    dados = dados.map(d => ({
      ...d,
      total_time: duracao
    }));

    fetch("https://buscavisual.onrender.com/save", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(dados)
    });

    document.body.innerHTML = "<h2>Obrigado pela participação!</h2>";
  }
});

// Barra de progresso
function updateProgress() {
  const current = jsPsych.data.get().count();
  const percent = Math.min((current / total_trials) * 100, 100);
  document.getElementById("progress").style.width = percent + "%";
}

// 🔥 GRID RESPONSIVO (SEM SCROLL)
function generateStimuli(size, targetPresent, difficulty) {
  let elements = [];

  const cols = Math.ceil(Math.sqrt(size));

  for (let i = 0; i < size; i++) {
    const isDistractor = Math.random() < 0.2;

    elements.push(`
      <div style="
        font-size:clamp(14px, 2vw, 24px);
        color:${isDistractor ? "#ef4444" : "#e2e8f0"};
        animation:${isDistractor ? "blink 0.6s infinite" : "none"};
      ">
        ${difficulty === "hard" ? "I" : "L"}
      </div>
    `);
  }

  if (targetPresent) {
    const index = Math.floor(Math.random() * size);
    elements[index] = `<div style="color:#22c55e; font-size:clamp(16px, 2.5vw, 28px);">T</div>`;
  }

  return `
  <style>
    @keyframes blink {
      50% { opacity: 0.3; }
    }
  </style>

  <div style="
    display:grid;
    grid-template-columns: repeat(${cols}, 1fr);
    gap:6px;
    width:90vw;
    max-width:500px;
    height:60vh;
    margin:auto;
    overflow:hidden;
  ">
    ${elements.join("")}
  </div>`;
}

// Trial
function createTrial(setSize, target, difficulty) {

  const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `<div style="font-size:40px;">+</div>`,
    choices: "NO_KEYS",
    trial_duration: 700
  };

  const stimulus = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: generateStimuli(setSize, target, difficulty),
    choices: ["f", "j"],
    trial_duration: 3000,
    data: {
      participant: participant_id,
      set_size: setSize,
      target: target,
      difficulty: difficulty
    },
    on_finish: function(data) {
      data.correct = (data.response === "j" && target) ||
                     (data.response === "f" && !target);
    }
  };

  const feedback = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function() {
      const last = jsPsych.data.get().last(1).values()[0];
      return `<div style="font-size:22px; color:${last.correct ? "#22c55e" : "#ef4444"};">
                ${last.correct ? "✔ Correto" : "✖ Errado"}
              </div>`;
    },
    choices: "NO_KEYS",
    trial_duration: 500
  };

  return [fixation, stimulus, feedback];
}

// Timeline
let timeline = [];

// ✅ BOTÃO FUNCIONANDO + CENTRALIZADO
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div style="text-align:center; max-width:500px; margin:auto;">
      <h1>Experimento de Busca Visual</h1>
      <p>Encontre a letra <b>T</b></p>
      <p><b>J</b> = TEM | <b>F</b> = NÃO TEM</p>
      <p>Responda o mais rápido possível</p>
    </div>
  `,
  choices: ["Iniciar Experimento"],
  button_html: `
    <button style="
      padding:15px 30px;
      font-size:18px;
      border:none;
      border-radius:12px;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color:white;
      cursor:pointer;
      margin-top:20px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    ">
      %choice%
    </button>
  `
});

// ⏳ Contagem
const countdown = [
  "Prepare-se...",
  "3",
  "2",
  "1"
];

countdown.forEach(text => {
  timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `<h1>${text}</h1>`,
    choices: "NO_KEYS",
    trial_duration: 800
  });
});

// Treino
timeline.push(...createTrial(10, true, "easy"));
timeline.push(...createTrial(10, false, "easy"));

// Trials
const setSizes = [10, 30, 60];
const difficulties = ["easy", "hard"];
const repeticoes = 5;

let trials = [];

setSizes.forEach(size => {
  difficulties.forEach(diff => {
    for (let i = 0; i < repeticoes; i++) {
      trials.push(...createTrial(size, true, diff));
      trials.push(...createTrial(size, false, diff));
    }
  });
});

trials = trials.sort(() => Math.random() - 0.5);

total_trials = trials.length;

timeline = timeline.concat(trials);

// Rodando
jsPsych.run(timeline);