const fs = require('node:fs');
const mysql = require('mysql2/promise');

const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.trimStart().startsWith('#')).map((line) => {
    const index = line.indexOf('=');
    return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
  }));

async function main() {
  const db = await mysql.createConnection({ host: env.DB_HOST, port: Number(env.DB_PORT || 3306), user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME });
  const [columns] = await db.query('SHOW COLUMNS FROM conductor');
  console.log(columns.map((column) => `${column.Field}:${column.Type}`).join('\n'));
  await db.end();
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
