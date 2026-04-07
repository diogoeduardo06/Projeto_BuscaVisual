const urlParams = new URLSearchParams(window.location.search);
let participant_id = urlParams.get("id");

if (!participant_id) {
  participant_id = "P" + Math.floor(Math.random() * 1000000);
}

const inicio = Date.now();

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

// Progress bar
function updateProgress() {
  const total = jsPsych.timelineVariable("total_trials", true) || 1;
  const current = jsPsych.data.get().count();
  const percent = Math.min((current / total) * 100, 100);

  document.getElementById("progress").style.width = percent + "%";
}

// Grid de estímulos
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

// Trial com fixação + estímulo + feedback
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

// Instruções
timeline.push({
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <h2>Experimento de Busca Visual</h2>
    <p>Encontre a letra <b>T</b></p>
    <p>Responda o mais rápido possível</p>
    <p><b>Pressione qualquer tecla para começar</b></p>
  `
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

timeline = timeline.concat(trials);

// Rodar
jsPsych.run(timeline);