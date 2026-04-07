// Captura ID do participante (via URL)
const urlParams = new URLSearchParams(window.location.search);
let participant_id = urlParams.get("id");

// Se não tiver ID, cria um automático
if (!participant_id) {
  participant_id = "P" + Math.floor(Math.random() * 1000000);
}

// Função para gerar estímulos
function generateStimuli(size, targetPresent = true) {
  let letters = [];

  for (let i = 0; i < size; i++) {
    letters.push("L");
  }

  if (targetPresent) {
    const index = Math.floor(Math.random() * size);
    letters[index] = "T";
  }

  return `<div style="font-size:30px; text-align:center;">
            ${letters.join(" ")}
          </div>`;
}

// Criar trials
function createTrial(setSize, target) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: generateStimuli(setSize, target),
    choices: ["f", "j"], // f = não tem alvo | j = tem alvo
    trial_duration: 4000,
    data: {
      participant: participant_id,
      set_size: setSize,
      target: target
    },
    on_finish: function(data) {
      data.correct = (data.response === "j" && target) ||
                     (data.response === "f" && !target);
    }
  };
}

// Timeline
let timeline = [];

// Tela inicial
timeline.push({
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "<p>Pressione qualquer tecla para iniciar</p>"
});

// Trials com diferentes condições
const setSizes = [10, 30, 60];

setSizes.forEach(size => {
  timeline.push(createTrial(size, true));
  timeline.push(createTrial(size, false));
});

// Randomizar
timeline = jsPsych.randomization.shuffle(timeline);

// Inicializar experimento
jsPsych.init({
  timeline: timeline,

  on_finish: function() {
    const dados = jsPsych.data.get().values();

    fetch("https://buscavisual.onrender.com/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dados)
    })
    .then(() => {
      document.body.innerHTML = "<h2>Obrigado pela participação!</h2>";
    })
    .catch(() => {
      document.body.innerHTML = "<h2>Erro ao salvar os dados</h2>";
    });
  }
});
