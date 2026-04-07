const BACKEND_URL = "https://buscavisual.onrender.com";

// dados do form
const urlParams = new URLSearchParams(window.location.search);

const perfil = {
  id: urlParams.get("id") || ("P" + Math.floor(Math.random()*100000)),
  idade: urlParams.get("idade"),
  sexo: urlParams.get("sexo"),
};

// GERAR GRID
function generateStimuli(size, target, difficulty, distraction){

  let elements = [];
  const cols = Math.ceil(Math.sqrt(size));

  for(let i=0;i<size;i++){
    elements.push(`<div>${difficulty==="hard"?"I":"L"}</div>`);
  }

  if(target){
    const index = Math.floor(Math.random()*size);
    elements[index] = `<div>T</div>`;
  }

  let distractors = "";

  if(distraction){
    for(let i=0;i<5;i++){
      distractors += `
      <div style="
        position:absolute;
        width:50px;
        height:50px;
        border-radius:50%;
        background:rgba(255,0,0,0.2);
        top:${Math.random()*100}%;
        left:${Math.random()*100}%;
        animation:pulse 1s infinite;
      "></div>`;
    }
  }

  return `
  <style>
  @keyframes pulse {
    50% { transform:scale(1.5); opacity:0.2; }
  }
  </style>

  <div style="position:relative;height:100vh;display:flex;justify-content:center;align-items:center;">
    ${distractors}

    <div style="
      display:grid;
      grid-template-columns:repeat(${cols},1fr);
      gap:5px;
      width:90vw;
      max-width:500px;
      font-size:20px;
    ">
      ${elements.join("")}
    </div>
  </div>`;
}

// TRIAL
function createTrial(size, target, difficulty, distraction){

  return [

    // Fixação
    {
      type:"html-keyboard-response",
      stimulus:"<h2>+</h2>",
      choices: jsPsych.NO_KEYS,
      trial_duration:800
    },

    // Estímulo
    {
      type:"html-keyboard-response",
      stimulus:generateStimuli(size,target,difficulty,distraction),
      choices:["f","j"],

      // 🔥 IMPORTANTE
      response_ends_trial: true,
      trial_duration: 4000,

      data:{size,target,difficulty,distraction},

      on_finish:function(data){

        // 🔥 SEM RESPOSTA
        if(data.response === null){
          data.no_response = true;
          data.correct = null; // NÃO É ERRO
          return;
        }

        // RESPOSTA VÁLIDA
        data.correct =
          (data.response === "j" && target) ||
          (data.response === "f" && !target);
      }
    },

    // Feedback
    {
      type:"html-keyboard-response",
      stimulus:function(){

        const d = jsPsych.data.get().last(1).values()[0];

        if(d.no_response){
          return "<p style='color:orange'>Sem resposta</p>";
        }

        if(d.correct){
          return "<p style='color:green'>Correto</p>";
        }

        return "<p style='color:red'>Errado</p>";
      },
      choices: jsPsych.NO_KEYS,
      trial_duration:600
    }

  ];
}

// BLOCO
function createBlock(distraction,label){

  let block = [];

  block.push({
    type:"html-keyboard-response",
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

  // randomização REAL
  trials = trials.sort(()=>Math.random()-0.5);

  return block.concat(trials);
}

// TIMELINE
let timeline = [];

// botão início
timeline.push({
  type:"html-button-response",
  stimulus:"<h2>Preparado?</h2>",
  choices:["Começar"]
});

// countdown
["3","2","1"].forEach(t=>{
  timeline.push({
    type:"html-keyboard-response",
    stimulus:`<h1>${t}</h1>`,
    choices: jsPsych.NO_KEYS,
    trial_duration:700
  });
});

// ordem aleatória dos blocos
let blocos = Math.random()>0.5
  ? [createBlock(false,"Sem estímulo"), createBlock(true,"Com estímulo")]
  : [createBlock(true,"Com estímulo"), createBlock(false,"Sem estímulo")];

blocos.forEach((b,i)=>{
  timeline = timeline.concat(b);

  if(i===0){
    timeline.push({
      type:"html-keyboard-response",
      stimulus:"<h2>Pausa</h2>"
    });
  }
});

// SALVAR
function salvar(){

  let dados = jsPsych.data.get().values();

  dados = dados.map(d => ({
    ...d,
    ...perfil
  }));

  fetch(BACKEND_URL + "/save",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(dados)
  });

  document.body.innerHTML = "<h2>Obrigado!</h2>";
}

// INICIAR
jsPsych.init({
  display_element:"jspsych-target",
  timeline: timeline,
  on_finish: salvar
});