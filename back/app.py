from flask import Flask, request, jsonify
from flask_cors import CORS
import csv
import os

app = Flask(__name__)
CORS(app)

if not os.path.exists('dados.csv'):
    with open('dados.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            "participant",
            "tempo_resposta",
            "acerto",
            "set_size",
            "target"
        ])

@app.route('/save', methods=['POST'])
def save_data():
    data = request.json

    with open('dados.csv', 'a', newline='') as f:
        writer = csv.writer(f)

        for trial in data:
            writer.writerow([
                trial.get("participant"),
                trial.get("rt"),
                trial.get("correct"),
                trial.get("set_size"),
                trial.get("target")
            ])

    return jsonify({"status": "success"})

@app.route('/')
def home():
    return "API funcionando!"