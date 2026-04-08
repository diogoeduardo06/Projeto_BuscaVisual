from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import psycopg2
import os

app = Flask(__name__)
CORS(app)

# conexão com banco (Render injeta DATABASE_URL automaticamente)
DATABASE_URL = os.getenv("DATABASE_URL")

def get_conn():
    return psycopg2.connect(DATABASE_URL)

# criar tabela automaticamente (caso não exista)
def create_table():
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS resultados (
        id TEXT,
        idade INT,
        sexo TEXT,
        sono INT,
        cafeina TEXT,
        jogos TEXT,
        oculos TEXT,
        block INT,
        trial INT,
        size INT,
        difficulty TEXT,
        distraction BOOLEAN,
        target BOOLEAN,
        response TEXT,
        correct BOOLEAN,
        rt FLOAT,
        timestamp BIGINT
    )
    """)

    conn.commit()
    cur.close()
    conn.close()

create_table()

# salvar dados
@app.route("/save", methods=["POST"])
def save():
    data = request.json

    conn = get_conn()
    cur = conn.cursor()

    for row in data:
        cur.execute("""
        INSERT INTO resultados VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            row["id"],
            row["idade"],
            row["sexo"],
            row["sono"],
            row["cafeina"],
            row["jogos"],
            row["oculos"],
            row["block"],
            row["trial"],
            row["size"],
            row["difficulty"],
            row["distraction"],
            row["target"],
            row["response"],
            row["correct"],
            row["rt"],
            row["timestamp"]
        ))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"status": "ok"})


# visualizar dados
@app.route("/data", methods=["GET"])
def data():
    conn = get_conn()
    df = pd.read_sql("SELECT * FROM resultados", conn)
    conn.close()
    return df.to_dict(orient="records")


# resetar dados (cuidado!)
@app.route("/reset", methods=["POST"])
def reset():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM resultados")
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"status": "resetado"})


# exportar CSV
@app.route("/download", methods=["GET"])
def download():
    conn = get_conn()
    df = pd.read_sql("SELECT * FROM resultados", conn)
    conn.close()

    file_path = "export.csv"
    df.to_csv(file_path, index=False)

    return jsonify({
        "status": "ok",
        "message": "Arquivo gerado como export.csv no servidor"
    })


if __name__ == "__main__":
    app.run()