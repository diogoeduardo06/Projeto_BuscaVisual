from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import psycopg2
import os

app = Flask(__name__)
CORS(app)

# pega a URL do banco do Render
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL não encontrada. Configure no Render.")

# conexão segura com PostgreSQL
def get_conn():
    return psycopg2.connect(DATABASE_URL, sslmode='require')


# SALVAR DADOS
@app.route("/save", methods=["POST"])
def save():
    data = request.json

    conn = get_conn()
    cur = conn.cursor()

    # cria tabela automaticamente se não existir
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

    # insere os dados
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


# VER DADOS
@app.route("/data", methods=["GET"])
def data():
    conn = get_conn()
    df = pd.read_sql("SELECT * FROM resultados", conn)
    conn.close()
    return df.to_dict(orient="records")


# RESETAR BANCO
@app.route("/reset", methods=["POST"])
def reset():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM resultados")
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"status": "resetado"})


if __name__ == "__main__":
    app.run()