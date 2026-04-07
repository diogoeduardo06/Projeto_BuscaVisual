const BACKEND_URL = "https://buscavisual.onrender.com";

// dados do form
const urlParams = new URLSearchParams(window.location.search);

const perfil = {
  id: urlParams.get("id") || ("P" + Math.floor(Math.random()*100000)),
  idade: urlParams.get("idade"),
  sexo: urlParams.get("sexo"),
  sono: urlParams.get("sono"),
  cafeina: urlParams.get("cafeina"),
  jogos: urlParams.get("jogos"),
  oculos: urlParams.get("oculos"),
};

// GERAR GRID COM DIFICULDADE REAL
function generateStimuli(size, target, difficulty, distraction){
  const cols = Math.ceil(Math.sqrt(size));
  let elements = [];

  // Distratores por dificuldade
  const easyDistractors = ["L","I","F","E"];
  const hardDistractors = ["I","L","F"];

  for(let i=0;i<size;i++){
    if(difficulty === "easy"){
      elements.push(easyDistractors[Math.floor(Math.random()*easyDistractors.length)]);
    } else {
      elements.push(hardDistractors[Math.floor(Math.random()*hardDistractors.length)]);
    }
  }

  // Inserir alvo
  if(target){
    const index = Math.floor(Math.random()*size);
    elements[index] = "T"; // sem destaque
  }

  // Distratores visuais animados
  let visualDistractors = "";
  if(distraction){
    for(let i=0;i<10;i++){ // 10 distractores
      visualDistractors += `
      <div style="
        position:absolute;
        width:30px;
        height:30px;
        border-radius:50%;
        background:rgba(255,255,0,0.4); /* amarelo suave */
        top:${Math.random()*90}%;
        left:${Math.random()*90}%;
        animation:flash 0.6s infinite alternate;
      "></div>`;
    }
  }

  return `
  <style>
  @keyframes flash {
    0% { opacity:0.2; transform:scale(1); }
    50% { opacity:0.8; transform:scale(1.3); }
    100% { opacity:0.2; transform:scale(1); }
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

// CRIAR TRIAL
function createTrial(size, target, difficulty, distraction, blockIndex, trialIndex){
  return [
    // Estímulo (sem limite de tempo)
    {
      type:"html-keyboard-response",
      stimulus:generateStimuli(size,target,difficulty,distraction),
      choices:["f","j"],
      response_ends_trial: true,
      data:{size,target,difficulty,distraction,block:blockIndex,trial:trialIndex},

      on_finish:function(data){
        data.correct = (data.response === "j" && target) || (data.response === "f" && !target);
        data.timestamp = Date.now();
      }
    },

    // Feedback
    {
      type:"html-keyboard-response",
      stimulus:function(){
        const d = jsPsych.data.get().last(1).values()[0];
        if(d.correct === null || d.correct === undefined){
          return "<p style='color:orange'>Sem resposta</p>";
        }
        return d.correct ? "<p style='color:green'>Correto</p>" : "<p style='color:red'>Errado</p>";
      },
      choices: jsPsych.NO_KEYS,
      trial_duration:600
    }
  ];
}

// CRIAR BLOCO
function createBlock(distraction,label,blockIndex){
  let block = [];

  block.push({
    type:"html-keyboard-response",
    stimulus:`<h2>${label}</h2><p>Pressione qualquer tecla</p>`
  });

  let trials = [];
  [10,30,60].forEach(size=>{
    ["easy","hard"].forEach(diff=>{
      for(let i=0;i<5;i++){
        trials.push(...createTrial(size,true,diff,distraction,blockIndex,trials.length));
        trials.push(...createTrial(size,false,diff,distraction,blockIndex,trials.length));
      }
    });
  });

  // randomização real
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
  ? [createBlock(false,"Sem estímulo",0), createBlock(true,"Com estímulo",1)]
  : [createBlock(true,"Com estímulo",0), createBlock(false,"Sem estímulo",1)];

blocos.forEach((b,i)=>{
  timeline = timeline.concat(b);

  if(i===0){
    timeline.push({
      type:"html-keyboard-response",
      stimulus:"<h2>Pausa</h2>"
    });
  }
});

// SALVAR DADOS
async function salvar(){
  let dados = jsPsych.data.get().values().map(d => ({...d, ...perfil}));
  try {
    await fetch(BACKEND_URL + "/save", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(dados)
    });
    document.body.innerHTML = "<h2>Obrigado!</h2>";
  } catch(e){
    console.error("Erro ao salvar dados:", e);
    document.body.innerHTML = "<h2>Erro ao enviar dados. Tente novamente.</h2>";
  }
}

// INICIAR JSPSYCH
jsPsych.init({
  display_element:"jspsych-target",
  timeline: timeline,
  on_finish: salvar
});