from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

FILE = "dados.csv"

@app.route("/save", methods=["POST"])
def save():
    data = request.json
    df = pd.DataFrame(data)

    if os.path.exists(FILE):
        df.to_csv(FILE, mode="a", header=False, index=False)
    else:
        df.to_csv(FILE, index=False)

    return jsonify({"status": "ok"})


@app.route("/data", methods=["GET"])
def data():
    if not os.path.exists(FILE):
        return jsonify([])
    return pd.read_csv(FILE).to_dict(orient="records")


@app.route("/reset", methods=["POST"])
def reset():
    if os.path.exists(FILE):
        os.remove(FILE)
    return jsonify({"status": "resetado"})


@app.route("/download", methods=["GET"])
def download():
    if not os.path.exists(FILE):
        return "Sem dados", 404
    return send_file(FILE, as_attachment=True)


if __name__ == "__main__":
    app.run() 