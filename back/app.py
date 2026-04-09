from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import os
from flask import Response
import csv
import io

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.getenv("DATABASE_URL")

def get_conn():
    return psycopg2.connect(DATABASE_URL)

def create_table():
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS resultados (
            id TEXT,
            idade INT,
            sexo TEXT,
            sono FLOAT,
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

@app.route("/")
def home():
    return "API ONLINE"

@app.route("/save", methods=["POST"])
def save():
    try:
        create_table()

        conn = get_conn()
        cur = conn.cursor()

        data = request.json

        for d in data:
            cur.execute("""
                INSERT INTO resultados VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                d["id"], d["idade"], d["sexo"], d["sono"],
                d["cafeina"], d["jogos"], d["oculos"],
                d["block"], d["trial"], d["size"],
                d["difficulty"], d["distraction"], d["target"],
                d["response"], d["correct"], d["rt"], d["timestamp"]
            ))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "ok"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/data", methods=["GET"])
def data():
    try:
        create_table()

        conn = get_conn()
        cur = conn.cursor()

        cur.execute("SELECT * FROM resultados")
        rows = cur.fetchall()

        cols = [
            "id","idade","sexo","sono","cafeina","jogos","oculos",
            "block","trial","size","difficulty","distraction",
            "target","response","correct","rt","timestamp"
        ]

        result = [dict(zip(cols, r)) for r in rows]

        cur.close()
        conn.close()

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/download", methods=["GET"])
def download_csv():
    try:
        create_table()

        conn = get_conn()
        cur = conn.cursor()

        cur.execute("SELECT * FROM resultados")
        rows = cur.fetchall()

        cols = [
            "id","idade","sexo","sono","cafeina","jogos","oculos",
            "block","trial","size","difficulty","distraction",
            "target","response","correct","rt","timestamp"
        ]

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(cols)
        writer.writerows(rows)

        cur.close()
        conn.close()

        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment;filename=dados.csv"}
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route("/reset", methods=["POST"])
def reset():
    try:
        conn = get_conn()
        cur = conn.cursor()

        cur.execute("DELETE FROM resultados")

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "resetado"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run()