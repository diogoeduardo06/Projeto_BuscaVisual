const BACKEND_URL = "https://buscavisual.onrender.com";

// dados do form
const urlParams = new URLSearchParams(window.location.search);

const perfil = {
  id: urlParams.get("id") || ("P" + Math.floor(Math.random() * 100000)),
  idade: Number(urlParams.get("idade")),
  sexo: urlParams.get("sexo"),
  sono: Number(urlParams.get("sono")),
  cafeina: urlParams.get("cafeina"),
  jogos: urlParams.get("jogos"),
  oculos: urlParams.get("oculos"),
};

// GERAR GRID
function generateStimuli(size, target, difficulty, distraction) {
  const cols = Math.ceil(Math.sqrt(size));
  let elements = [];

  const easyDistractors = ["L", "I", "F", "E"];
  const hardDistractors = ["I", "L", "F"];

  for (let i = 0; i < size; i++) {
    elements.push(
      difficulty === "easy"
        ? easyDistractors[Math.floor(Math.random() * easyDistractors.length)]
        : hardDistractors[Math.floor(Math.random() * hardDistractors.length)]
    );
  }

  if (target) {
    const index = Math.floor(Math.random() * size);
    elements[index] = "T";
  }

  let visualDistractors = "";
  if (distraction) {

    const n = difficulty === "easy" ? 8 : 18;

    for (let i = 0; i < n; i++) {

      const size = difficulty === "easy" ? 20 : 35;
      const duration = difficulty === "easy" ? 0.8 : 0.4;

      visualDistractors += `
    <div style="
      position:absolute;
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      background:rgba(255,255,0,0.6);
      top:${Math.random() * 95}%;
      left:${Math.random() * 95}%;
      animation:flashMove ${duration}s infinite alternate;
      filter: blur(${difficulty === "easy" ? 2 : 4}px);
    "></div>`;
    }
  }

  return `
  <style>
  @keyframes flashMove {
    0% {
      opacity:0.2;
      transform:scale(0.8) translate(0px,0px);
    }
    50% {
      opacity:1;
      transform:scale(1.5) translate(10px,-10px);
    }
    100% {
      opacity:0.3;
      transform:scale(1) translate(-10px,10px);
    }
  }
  </style>

  <div style="position:relative;height:100vh;display:flex;justify-content:center;align-items:center;">
    ${visualDistractors}
    <div style="
      display:grid;
      grid-template-columns:repeat(${cols},1fr);
      gap:5px;
      width:90vw;
      max-width:500px;
      font-size:20px;
      text-align:center;
    ">
      ${elements.map(e => `<div>${e}</div>`).join("")}
    </div>
  </div>`;
}

// TRIAL
function createTrial(size, target, difficulty, distraction, blockIndex, trialIndex) {

  return [
    {
      type: "html-keyboard-response",
      stimulus: generateStimuli(size, target, difficulty, distraction),
      choices: ["f", "j"],
      data: {
        task: true,
        size, target, difficulty, distraction,
        block: blockIndex, trial: trialIndex
      },
      on_finish: function (data) {

        if (data.response === null) {
          data.correct = null;
        } else {
          data.correct =
            (data.response === "j" && data.target) ||
            (data.response === "f" && !data.target);
        }

        data.timestamp = Date.now();
      }
    },
    {
      type: "html-keyboard-response",
      stimulus: function () {

        // pega o último trial REAL (task:true)
        let d = jsPsych.data.get().filter({ task: true }).last(1).values()[0];

        if (d.correct === null) {
          return "<h2 style='color:orange'>Sem resposta</h2>";
        }

        return d.correct
          ? "<h2 style='color:#22c55e'>Correto</h2>"
          : "<h2 style='color:#ef4444'>Errado</h2>";
      },
      choices: jsPsych.NO_KEYS,
      trial_duration: 500,
      data: { task: false } //
    }
  ];
}

// BLOCO
function createBlock(distraction, label, blockIndex) {

  let block = [
    {
      type: "html-keyboard-response",
      stimulus: `
      <div style="text-align:center">
        <h2>${label}</h2>
        <p>Pressione qualquer tecla para iniciar</p>
      </div>`
    }
  ];

  let sizes = [10, 20, 30];
  let difficulties = ["easy", "hard"];

  let trials = [];
  let trialCounter = 0;

  sizes.forEach(size => {
    difficulties.forEach(diff => {
      let conditions = jsPsych.randomization.shuffle([true, false]);

      conditions.forEach(target => {
        trials.push(
          createTrial(size, target, diff, distraction, blockIndex, trialCounter)
        );
        trialCounter++;
      });
    });
  });

  return block.concat(trials.flat());;
}

// TIMELINE
let timeline = [];

// INSTRUÇÕES
timeline.push({
  type: "html-button-response",
  stimulus: `
  <div style="max-width:600px;margin:auto;text-align:left">
    <h2>Instruções</h2>
    <p><b>Seu objetivo:</b> identificar se a letra <b>T</b> está presente.</p>
    <p><b>Teclas:</b></p>
    <ul>
      <li><b>J </b> → Se houver T</li>
      <li><b>F </b> → Se não houver T</li>
    </ul>
    <p>Responda o mais rápido e preciso possível.</p>
  </div>
  `,
  choices: ["Começar"]
});

// countdown
["3", "2", "1"].forEach(t => {
  timeline.push({
    type: "html-keyboard-response",
    stimulus: `<h1>${t}</h1>`,
    choices: jsPsych.NO_KEYS,
    trial_duration: 500
  });
});

// blocos
let blocos = Math.random() > 0.5
  ? [createBlock(false, "Sem estímulo", 0), createBlock(true, "Com estímulo", 1)]
  : [createBlock(true, "Com estímulo", 0), createBlock(false, "Sem estímulo", 1)];

blocos.forEach((b, i) => {
  timeline = timeline.concat(b);

  if (i === 0) {
    timeline.push({
      type: "html-keyboard-response",
      stimulus: `
      <div style="text-align:center">
        <h2>Pausa</h2>
        <p>Pressione qualquer tecla para continuar</p>
      </div>`
    });
  }
});

// SALVAR
async function salvar() {

  let dados = jsPsych.data.get().filter({ task: true }).values();

  // métricas
  let validos = dados.filter(d => d.rt !== null);

  let media = arr => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(0) : 0;

  let comEstimulo = validos.filter(d => d.distraction === true).map(d => d.rt);
  let semEstimulo = validos.filter(d => d.distraction === false).map(d => d.rt);

  let acertos = validos.filter(d => d.correct === true).length;
  let total = validos.length;

  let acc = total ? ((acertos/total)*100).toFixed(1) : 0;

  let dadosLimpos = dados.map(d => ({
    id: perfil.id,
    idade: perfil.idade,
    sexo: perfil.sexo,
    sono: perfil.sono,
    cafeina: perfil.cafeina,
    jogos: perfil.jogos,
    oculos: perfil.oculos,
    block: d.block,
    trial: d.trial,
    size: d.size,
    difficulty: d.difficulty,
    distraction: d.distraction,
    target: d.target,
    response: d.response,
    correct: d.correct,
    rt: d.rt,
    timestamp: d.timestamp
  }));

  try {
    await fetch(BACKEND_URL + "/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dadosLimpos)
    });

    // TELA FINAL BONITA
    document.body.innerHTML = `
    <div style="
      font-family:Arial;
      text-align:center;
      background:#0f172a;
      color:white;
      height:100vh;
      display:flex;
      justify-content:center;
      align-items:center;
    ">
      <div style="
        background:#1e293b;
        padding:30px;
        border-radius:12px;
        width:400px;
        box-shadow:0 0 20px rgba(0,0,0,0.4);
      ">
        <h2 style="margin-bottom:10px;">Obrigado pela participação!</h2>
        <p style="margin-bottom:20px;color:#94a3b8;">Seus resultados:</p>

        <div style="text-align:left;font-size:14px;line-height:1.8">

          <p><b>Tempo médio (sem estímulo):</b> ${media(semEstimulo)} ms</p>
          <p><b>Tempo médio (com estímulo):</b> ${media(comEstimulo)} ms</p>

          <p><b>Precisão:</b> ${acc}%</p>
          <p><b>Total de respostas:</b> ${total}</p>

        </div>

        <hr style="margin:20px 0;border:0;border-top:1px solid #334155">

        <p style="font-size:12px;color:#64748b;">
          Obrigado por contribuir com a pesquisa 🙌
        </p>
      </div>
    </div>
    `;

  } catch (e) {
    console.error(e);
    document.body.innerHTML = "<h2>Erro ao salvar</h2>";
  }
}

jsPsych.init({
  display_element: "jspsych-target",
  timeline: timeline,
  on_finish: salvar
});