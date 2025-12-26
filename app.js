const express = require("express");
const axios = require("axios");
const mysql = require("mysql2/promise");

const app = express();
const PORT = 3000;

async function initDB() {
    let connection;
    let retries = 10;

    while (retries) {
        try {
            connection = await mysql.createConnection({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
            });
            break; // Jika konek sukses, berhenti
        } catch (err) {
            console.log("MySQL belum siap, retry dalam 3 detik...");
            retries--;
            await new Promise(res => setTimeout(res, 3000));
        }
    }

    if (!connection) {
        throw new Error("Gagal konek ke MySQL setelah beberapa kali mencoba.");
    }

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    await connection.end();

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    await pool.query(`
        CREATE TABLE IF NOT EXISTS jokes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            joke TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log("Database & table ready.");
    return pool;
}

let db;

app.get("/", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM jokes ORDER BY id DESC");

        let html = `
            <h1>Chuck Norris Jokes</h1>
            <form action="/fetch" method="POST">
                <button type="submit">Ambil Joke Baru</button>
            </form>
            <hr>
            <h2>Riwayat Joke Tersimpan:</h2>
        `;

        rows.forEach(j => {
            html += `<p><b>#${j.id}</b> - ${j.joke}<br><i>${j.created_at}</i></p><hr>`;
        });

        res.send(html);

    } catch (err) {
        res.send("Terjadi kesalahan: " + err.message);
    }
});

app.post("/fetch", async (req, res) => {
    try {
        const response = await axios.get("https://api.chucknorris.io/jokes/random");
        const joke = response.data.value;

        await db.query("INSERT INTO jokes (joke) VALUES (?)", [joke]);

        res.redirect("/");

    } catch (err) {
        res.send("Gagal memanggil API: " + err.message);
    }
});

async function startServer() {
    db = await initDB();
    app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
}

startServer();
