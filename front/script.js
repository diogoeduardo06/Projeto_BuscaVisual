const jsPsych = initJsPsych({
  display_element: "jspsych-target",
  on_trial_finish: updateProgress,
  on_finish: salvarDados
});

let total_trials = 0;

// progresso
function updateProgress() {
  const current = jsPsych.data.get().count();
  const percent = Math.min((current / total_trials) * 100, 100);
  document.getElementById("progress").style.width = percent + "%";
}

// estímulos
function generateStimuli(size, targetPresent, difficulty, withDistraction) {
  let elements = [];
  const cols = Math.ceil(Math.sqrt(size));

  for (let i = 0; i < size; i++) {
    elements.push(`
      <div style="font-size:clamp(14px,2vw,24px); color:#e2e8f0;">
        ${difficulty === "hard" ? "I" : "L"}
      </div>
    `);
  }

  if (targetPresent) {
    const index = Math.floor(Math.random() * size);
    elements[index] = `<div style="color:#22c55e;">T</div>`;
  }

  return `
  <div style="
    display:flex;
    justify-content:center;
    align-items:center;
    height:100vh;
    ${withDistraction ? "animation:pulse 1s infinite;" : ""}
  ">
    <div style="
      display:grid;
      grid-template-columns: repeat(${cols},1fr);
      gap:6px;
      width:90vw;
      max-width:500px;
    ">
      ${elements.join("")}
    </div>
  </div>

  <style>
    @keyframes pulse {
      50% { box-shadow: 0 0 30px red; }
    }
  </style>
  `;
}

// trial
function createTrial(setSize, target, difficulty, withDistraction) {

  return [
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: "<h2>+</h2>",
      choices: "NO_KEYS",
      trial_duration: 700
    },
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: generateStimuli(setSize, target, difficulty, withDistraction),
      choices: ["f", "j"],
      trial_duration: 3000,
      data: {
        set_size: setSize,
        target,
        difficulty,
        condition: withDistraction ? "com" : "sem"
      },
      on_finish: function(data) {

        if (data.response === null) {
          data.correct = null;
          data.no_response = true;
          return;
        }

        data.correct = (data.response === "j" && target) ||
                       (data.response === "f" && !target);
      }
    },
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function() {
        const d = jsPsych.data.get().last(1).values()[0];

        if (d.no_response) return "<p style='color:yellow'>Sem resposta</p>";
        if (d.correct) return "<p style='color:green'>Correto</p>";
        return "<p style='color:red'>Errado</p>";
      },
      choices: "NO_KEYS",
      trial_duration: 500
    }
  ];
}

// bloco
function createBlock(withDistraction, label) {

  let block = [];

  block.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `<h2>${label}</h2><p>Pressione qualquer tecla</p>`
  });

  const setSizes = [10, 30, 60];
  const difficulties = ["easy", "hard"];

  setSizes.forEach(size => {
    difficulties.forEach(diff => {
      for (let i = 0; i < 5; i++) {
        block.push(...createTrial(size, true, diff, withDistraction));
        block.push(...createTrial(size, false, diff, withDistraction));
      }
    });
  });

  return block;
}

// timeline
let timeline = [];

timeline.push({
  type: "survey-html-form",
  html: `
    <h2>Informações</h2>

    <p>Idade: <input name="idade" required></p>

    <p>Sexo:
      <select name="sexo">
        <option value="M">Masculino</option>
        <option value="F">Feminino</option>
        <option value="Outro">Outro</option>
      </select>
    </p>

    <p>Horas de sono:
      <input name="sono" type="number">
    </p>

    <p>Consumiu cafeína?
      <select name="cafeina">
        <option>Sim</option>
        <option>Não</option>
      </select>
    </p>

    <p>Joga videogame?
      <select name="jogos">
        <option>Sim</option>
        <option>Não</option>
      </select>
    </p>

    <p>Usa óculos?
      <select name="oculos">
        <option>Sim</option>
        <option>Não</option>
      </select>
    </p>
  `,
  button_label: "Continuar"
});

// botão iniciar
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: "<h2>Experimento de Busca Visual</h2>",
  choices: ["Iniciar"],
  button_html: '<button class="start-btn">%choice%</button>'
});

// countdown
["Prepare-se...", "3", "2", "1"].forEach(t => {
  timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `<h1>${t}</h1>`,
    choices: "NO_KEYS",
    trial_duration: 800
  });
});

// blocos
let blocos = Math.random() > 0.5
  ? [createBlock(false, "Sem estímulos"), createBlock(true, "Com estímulos")]
  : [createBlock(true, "Com estímulos"), createBlock(false, "Sem estímulos")];

blocos.forEach((b, i) => {
  timeline = timeline.concat(b);

  if (i === 0) {
    timeline.push({
      type: jsPsychHtmlKeyboardResponse,
      stimulus: "<h2>Pausa</h2><p>Pressione qualquer tecla</p>"
    });
  }
});

total_trials = timeline.length;

// salvar
function salvarDados() {
  fetch("https://buscavisual.onrender.com/save", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(jsPsych.data.get().values())
  });

  document.body.innerHTML = "<h2>Obrigado!</h2>";
}

// rodar
jsPsych.run(timeline);