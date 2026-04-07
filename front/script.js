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

// GERAR GRID
function generateStimuli(size, target, difficulty, distraction){
  const cols = Math.ceil(Math.sqrt(size));
  let elements = [];

  const easyDistractors = ["L","I","F","E"];
  const hardDistractors = ["I","L","F"];

  for(let i=0;i<size;i++){
    if(difficulty === "easy"){
      elements.push(easyDistractors[Math.floor(Math.random()*easyDistractors.length)]);
    } else {
      elements.push(hardDistractors[Math.floor(Math.random()*hardDistractors.length)]);
    }
  }

  if(target){
    const index = Math.floor(Math.random()*size);
    elements[index] = "T";
  }

  let visualDistractors = "";
  if(distraction){
    const nDistractors = difficulty === "easy" ? 5 : 12;
    for(let i=0;i<nDistractors;i++){
      visualDistractors += `
      <div style="
        position:absolute;
        width:25px;
        height:25px;
        border-radius:50%;
        background:rgba(255,255,0,${difficulty==="easy"?0.2:0.4});
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
    {
      type:"html-keyboard-response",
      stimulus:generateStimuli(size,target,difficulty,distraction),
      choices:["f","j"],
      response_ends_trial: true,
      data:{
        size, target, difficulty, distraction, block:blockIndex, trial:trialIndex
      },
      on_finish:function(data){
        if(data.response === null){
          data.correct = null; // sem resposta
        } else {
          data.correct = (data.response === "j" && data.target) || (data.response === "f" && !data.target);
        }
        data.timestamp = Date.now();
      }
    },
    {
      type:"html-keyboard-response",
      stimulus:function(){
        const d = jsPsych.data.get().last(1).values()[0];
        if(d.correct === null){
          return "<p style='color:orange'>Sem resposta</p>";
        }
        return d.correct ? "<p style='color:green'>Correto</p>" : "<p style='color:red'>Errado</p>";
      },
      choices: jsPsych.NO_KEYS,
      trial_duration:400
    }
  ];
}

// CRIAR BLOCO COM DIFICULDADE GRADATIVA E RANDOMIZAÇÃO CONTROLADA
function createBlock(distraction,label,blockIndex){
  let block = [{
    type:"html-keyboard-response",
    stimulus:`<h2>${label}</h2><p>Pressione qualquer tecla</p>`
  }];

  let sizes = [10,20,30]; // pequeno -> grande
  let difficulties = ["easy","hard"]; // fácil -> difícil

  let trials = [];

  // gerar trials por dificuldade e tamanho
  sizes.forEach(size=>{
    difficulties.forEach(diff=>{
      [true,false].forEach(target=>{
        trials.push(createTrial(size,target,diff,distraction,blockIndex,trials.length));
      });
    });
  });

  // embaralhar dentro de cada nível de dificuldade
  let shuffled = [];
  trials.forEach(trialGroup=>{
    shuffled.push(...trialGroup.sort(()=>Math.random()-0.5));
  });

  return block.concat(shuffled);
}

// TIMELINE
let timeline = [];

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
    trial_duration:500
  });
});

// ordem aleatória dos blocos (com e sem estímulos)
let blocos = Math.random()>0.5
  ? [createBlock(false,"Sem estímulo",0), createBlock(true,"Com estímulo",1)]
  : [createBlock(true,"Com estímulo",0), createBlock(false,"Sem estímulo",1)];

blocos.forEach((b,i)=>{
  timeline = timeline.concat(b);
  if(i===0){
    timeline.push({type:"html-keyboard-response", stimulus:"<h2>Pausa</h2>"});
  }
});

// SALVAR
async function salvar(){
  // salva apenas os campos relevantes
  let dados = jsPsych.data.get().values().map(d => ({
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
    correct: d.correct === undefined ? null : d.correct,
    rt: d.rt,
    timestamp: d.timestamp
  }));

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

// INICIAR
jsPsych.init({
  display_element:"jspsych-target",
  timeline: timeline,
  on_finish: salvar
});