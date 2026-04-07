const BACKEND_URL = "https://buscavisual.onrender.com";

// pegar dados do form
const urlParams = new URLSearchParams(window.location.search);

const perfil = {
  id: urlParams.get("id") || ("P" + Math.floor(Math.random()*100000)),
  idade: urlParams.get("idade"),
  sexo: urlParams.get("sexo"),
};

// 🔥 TIMELINE (AGORA EXISTE)
let timeline = [];

// tela inicial
timeline.push({
  type: "html-button-response",
  stimulus: "<h2>Pronto para começar?</h2>",
  choices: ["Começar"]
});

// exemplo de trial simples (teste básico)
timeline.push({
  type: "html-keyboard-response",
  stimulus: "<h1>+</h1>",
  choices: jsPsych.NO_KEYS,
  trial_duration: 1000
});

timeline.push({
  type: "html-keyboard-response",
  stimulus: "<h2>Pressione qualquer tecla</h2>"
});

// salvar dados
function salvar(){
  const dados = jsPsych.data.get().values().map(d => ({
    ...d,
    ...perfil
  }));

  fetch(BACKEND_URL + "/save", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(dados)
  });

  document.body.innerHTML = "<h2>Obrigado!</h2>";
}

// iniciar experimento (jsPsych v6)
jsPsych.init({
  display_element: "jspsych-target",
  timeline: timeline,
  on_finish: salvar
});