const urlParams = new URLSearchParams(window.location.search);

const perfil = {
  id: urlParams.get("id"),
  idade: urlParams.get("idade"),
  sexo: urlParams.get("sexo"),
  sono: urlParams.get("sono"),
  cafeina: urlParams.get("cafeina"),
  jogos: urlParams.get("jogos"),
  oculos: urlParams.get("oculos")
};

let total_trials = 0;

const jsPsych = initJsPsych({
  display_element: "jspsych-target",
  on_trial_finish: updateProgress,
  on_finish: salvar
});

function updateProgress() {
  const current = jsPsych.data.get().count();
  const percent = Math.min((current / total_trials) * 100, 100);
  document.getElementById("progress").style.width = percent + "%";
}

// 🔥 ESTÍMULOS MELHORADOS
function generateStimuli(size, target, difficulty, distraction) {

  let elements = [];
  const cols = Math.ceil(Math.sqrt(size));

  for (let i = 0; i < size; i++) {
    elements.push(`<div>${difficulty === "hard" ? "I" : "L"}</div>`);
  }

  if (target) {
    const i = Math.floor(Math.random() * size);
    elements[i] = `<div>T</div>`; // SEM COR ESPECIAL
  }

  // 🔥 estímulos periféricos
  let distractions = "";

  if (distraction) {
    for (let i = 0; i < 6; i++) {
      distractions += `
        <div style="
          position:absolute;
          width:60px;
          height:60px;
          border-radius:50%;
          background:rgba(255,0,0,0.2);
          top:${Math.random()*100}%;
          left:${Math.random()*100}%;
          animation: pulse 1s infinite;
        "></div>
      `;
    }
  }

  return `
  <style>
    @keyframes pulse {
      50% { transform: scale(1.5); opacity:0.2; }
    }
  </style>

  <div style="position:relative; height:100vh; display:flex; justify-content:center; align-items:center;">

    ${distractions}

    <div style="
      display:grid;
      grid-template-columns: repeat(${cols},1fr);
      gap:6px;
      width:90vw;
      max-width:500px;
      z-index:2;
    ">
      ${elements.join("")}
    </div>

  </div>
  `;
}

// trial
function createTrial(size, target, difficulty, distraction) {

  return [
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: "<h2>+</h2>",
      choices: "NO_KEYS",
      trial_duration: 700
    },
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: generateStimuli(size, target, difficulty, distraction),
      choices: ["f","j"],
      trial_duration: 3000,
      data: { size, target, difficulty, distraction },
      on_finish: function(data){

        if (data.response === null) {
          data.no_response = true;
          return;
        }

        data.correct =
          (data.response === "j" && target) ||
          (data.response === "f" && !target);
      }
    },
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function(){
        const d = jsPsych.data.get().last(1).values()[0];

        if (d.no_response) return "<p style='color:yellow'>Sem resposta</p>";
        if (d.correct) return "<p style='color:green'>Correto</p>";
        return "<p style='color:red'>Errado</p>";
      },
      choices:"NO_KEYS",
      trial_duration:500
    }
  ];
}

// 🔥 BLOCO COM RANDOMIZAÇÃO REAL
function createBlock(distraction, label){

  let block = [];

  block.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus:`<h2>${label}</h2><p>Pressione qualquer tecla</p>`
  });

  let trials = [];

  [10,30,60].forEach(size=>{
    ["easy","hard"].forEach(diff=>{
      for(let i=0;i<5;i++){
        trials.push(...createTrial(size,true,diff,distraction));
        trials.push(...createTrial(size,false,diff,distraction));
      }
    });
  });

  // 🔥 RANDOMIZA
  trials = trials.sort(() => Math.random() - 0.5);

  return block.concat(trials);
}

// timeline
let timeline = [];

// botão iniciar
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: "<h2>Preparado?</h2>",
  choices:["Começar"],
  button_html:'<button class="start-btn">%choice%</button>'
});

// countdown
["3","2","1"].forEach(t=>{
  timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus:`<h1>${t}</h1>`,
    choices:"NO_KEYS",
    trial_duration:700
  });
});

// blocos randomizados
let blocos = Math.random()>0.5
  ? [createBlock(false,"Sem estímulo"), createBlock(true,"Com estímulo")]
  : [createBlock(true,"Com estímulo"), createBlock(false,"Sem estímulo")];

blocos.forEach((b,i)=>{
  timeline = timeline.concat(b);

  if(i===0){
    timeline.push({
      type: jsPsychHtmlKeyboardResponse,
      stimulus:"<h2>Pausa</h2>"
    });
  }
});

total_trials = timeline.length;

// salvar
function salvar(){

  let dados = jsPsych.data.get().values();
  dados = dados.map(d => ({ ...d, ...perfil }));

  fetch("https://buscavisual.onrender.com/save",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(dados)
  });

  document.body.innerHTML = "<h2>Obrigado!</h2>";
}

jsPsych.run(timeline);