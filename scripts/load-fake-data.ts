import { Client } from "pg";
import { faker } from "@faker-js/faker";
import { loadEnvConfig } from "@next/env";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function loadFakeData(numUsers: number = 10) {
  console.log(`executing load fake data, generating ${numUsers} users.`);

  const client = new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_NAME,
    port: parseInt(process.env.POSTGRES_PORT!),
  });

  await client.connect();
  try {
    await client.query("begin");

    for (let i = 0; i < numUsers; i++) {
      await client.query(
        "insert into users (username, password, avatar) values ($1,$2,$3)",
        [faker.internet.userName(), "password", faker.image.avatar()]
      );
    }

    const res = await client.query(
      "select id from public.users order by created_at desc limit $1",
      [numUsers]
    );
    console.log(res.rows);

    for (const row of res.rows) {
      for (let i = 0; i < Math.ceil(Math.random() * 50); i++) {
        await client.query(
          "insert into posts (user_id, content) values($1,$2)",
          [row.id, faker.lorem.sentence()]
        );
      }
    }

    for (const row1 of res.rows) {
      for (const row2 of res.rows) {
        if (row1.id != row2.id) {
          if (Math.random() > 0.5) {
            await client.query("insert into follows values ($1,$2)", [
              row1.id,
              row2.id,
            ]);
          }
        }
      }
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

const numUsers = parseInt(process.argv[2]) || 10;
console.log(`loading ${numUsers} fake users.`);
loadFakeData(numUsers);
