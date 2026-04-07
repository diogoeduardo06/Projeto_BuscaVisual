from flask import Flask, request, jsonify
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


if __name__ == "__main__":
    app.run()