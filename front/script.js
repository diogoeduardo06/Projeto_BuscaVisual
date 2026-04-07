const urlParams = new URLSearchParams(window.location.search);
let participant_id = urlParams.get("id");

if (!participant_id) {
  participant_id = "P" + Math.floor(Math.random() * 1000000);
}

const inicio = Date.now();
let total_trials = 0;

// jsPsych init
const jsPsych = initJsPsych({
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

// Progress bar REAL
function updateProgress() {
  const current = jsPsych.data.get().count();
  const percent = Math.min((current / total_trials) * 100, 100);
  document.getElementById("progress").style.width = percent + "%";
}

// Estímulos
function generateStimuli(size, targetPresent, difficulty) {
  let elements = [];

  for (let i = 0; i < size; i++) {
    const isDistractor = Math.random() < 0.2;

    elements.push(`
      <div style="
        font-size:28px;
        color:${isDistractor ? "#ef4444" : "#e2e8f0"};
        animation:${isDistractor ? "blink 0.6s infinite" : "none"};
      ">
        ${difficulty === "hard" ? "I" : "L"}
      </div>
    `);
  }

  if (targetPresent) {
    const index = Math.floor(Math.random() * size);
    elements[index] = `<div style="color:#22c55e; font-size:32px;">T</div>`;
  }

  return `
  <style>
    @keyframes blink {
      50% { opacity: 0.3; }
    }
  </style>

  <div style="
    display:grid;
    grid-template-columns: repeat(${Math.ceil(Math.sqrt(size))}, 1fr);
    gap:10px;
    width:400px;
    margin:auto;
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
      return `<div style="font-size:24px; color:${last.correct ? "#22c55e" : "#ef4444"};">
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

// 🔥 Tela inicial com botão bonito
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <h1>Experimento de Busca Visual</h1>
    <p>Encontre a letra <b>T</b></p>
    <p><b>J</b> = TEM alvo</p>
    <p><b>F</b> = NÃO TEM</p>
    <p>Responda o mais rápido possível</p>
  `,
  choices: ["Iniciar Experimento"],
  button_html: `
    <button style="
      padding:15px 30px;
      font-size:18px;
      border:none;
      border-radius:10px;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color:white;
      cursor:pointer;
      margin-top:20px;
      transition: 0.3s;
    "
    onmouseover="this.style.transform='scale(1.05)'"
    onmouseout="this.style.transform='scale(1)'"
    >
      %choice%
    </button>
  `
});

// ⏳ Contagem regressiva
const countdown = [
  { stimulus: "<h2>Prepare-se...</h2>", duration: 1000 },
  { stimulus: "<h1>3</h1>", duration: 700 },
  { stimulus: "<h1>2</h1>", duration: 700 },
  { stimulus: "<h1>1</h1>", duration: 700 }
];

countdown.forEach(c => {
  timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: c.stimulus,
    choices: "NO_KEYS",
    trial_duration: c.duration
  });
});

// Treino
timeline.push(...createTrial(10, true, "easy"));
timeline.push(...createTrial(10, false, "easy"));

// Trials principais
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

// Randomizar
trials = trials.sort(() => Math.random() - 0.5);

// Contar trials reais
total_trials = trials.length;

// Adicionar ao timeline
timeline = timeline.concat(trials);

// Rodar
jsPsych.run(timeline);