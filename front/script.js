const BACKEND_URL = "https://buscavisual.onrender.com";

const urlParams = new URLSearchParams(window.location.search);

const perfil = {
  id: urlParams.get("id"),
  idade: urlParams.get("idade"),
  sexo: urlParams.get("sexo"),
};

const jsPsych = initJsPsych({
  display_element: "jspsych-target",
  on_finish: salvar
});

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

jsPsych.run([
  {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: "<h2>Pressione qualquer tecla para finalizar</h2>"
  }
]);