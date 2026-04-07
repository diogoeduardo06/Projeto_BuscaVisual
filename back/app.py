from flask import Flask, request, jsonify
import pandas as pd
import os

app = Flask(__name__)

FILE = "dados.csv"

# salvar dados
@app.route("/save", methods=["POST"])
def save():
    data = request.json

    df = pd.DataFrame(data)

    if os.path.exists(FILE):
        df.to_csv(FILE, mode="a", header=False, index=False)
    else:
        df.to_csv(FILE, index=False)

    return jsonify({"status": "ok"})


# ver dados
@app.route("/data", methods=["GET"])
def data():
    if not os.path.exists(FILE):
        return jsonify([])

    df = pd.read_csv(FILE)
    return df.to_dict(orient="records")


# limpar dados
@app.route("/clear", methods=["POST"])
def clear():
    open(FILE, "w").close()
    return jsonify({"status": "apagado"})


# filtrar só dados reais
@app.route("/data/clean", methods=["GET"])
def clean():
    if not os.path.exists(FILE):
        return jsonify([])

    df = pd.read_csv(FILE)

    if "teste" in df.columns:
        df = df[df["teste"] == False]

    return df.to_dict(orient="records")


if __name__ == "__main__":
    app.run()