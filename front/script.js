const urlParams = new URLSearchParams(window.location.search);

// perfil do participante
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

// estímulos
function generateStimuli(size, target, difficulty, distraction) {

  let elements = [];
  const cols = Math.ceil(Math.sqrt(size));

  for (let i = 0; i < size; i++) {
    elements.push(`<div>${difficulty === "hard" ? "I" : "L"}</div>`);
  }

  if (target) {
    const i = Math.floor(Math.random() * size);
    elements[i] = `<div style="color:#22c55e">T</div>`;
  }

  return `
  <div style="
    display:flex;
    justify-content:center;
    align-items:center;
    height:100vh;
    ${distraction ? "animation:pulse 1s infinite;" : ""}
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
      50% { box-shadow:0 0 30px red; }
    }
  </style>
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

// blocos
function createBlock(distraction, label){

  let block = [];

  block.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus:`<h2>${label}</h2><p>Pressione qualquer tecla</p>`
  });

  [10,30,60].forEach(size=>{
    ["easy","hard"].forEach(diff=>{
      for(let i=0;i<5;i++){
        block.push(...createTrial(size,true,diff,distraction));
        block.push(...createTrial(size,false,diff,distraction));
      }
    });
  });

  return block;
}

// timeline
let timeline = [];

// botão inicial
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: "<h2>Experimento de Busca Visual</h2>",
  choices:["Iniciar"],
  button_html:'<button class="start-btn">%choice%</button>'
});

// countdown
["Prepare-se...","3","2","1"].forEach(t=>{
  timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus:`<h1>${t}</h1>`,
    choices:"NO_KEYS",
    trial_duration:800
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
      stimulus:"<h2>Pausa</h2><p>Pressione qualquer tecla</p>"
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

  document.body.innerHTML = "<h2>Obrigado pela participação!</h2>";
}

// rodar
jsPsych.run(timeline);