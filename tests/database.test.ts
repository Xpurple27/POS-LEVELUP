import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("SQL: transaksi atomik, idempotensi, role, RLS, harga dan status dapur", async () => {
  const db = new PGlite();
  const cashier = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    barista = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    outsider = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;`,
    );
    await db.exec(
      await readFile(
        new URL("../database_schema.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(
      `insert into auth.users values ('${cashier}'),('${barista}'),('${outsider}');insert into public.staff_profiles values ('${cashier}','cashier'),('${barista}','barista');`,
    );
    const { rows: products } = await db.query<{ id: string; price: number }>(
      "select id,price from products order by price",
    );
    const item = [{ product_id: products[0].id, quantity: 2 }],
      id = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    await db.exec(
      `set role authenticated;set request.jwt.claim.sub='${cashier}';`,
    );
    await db.query("select checkout_order($1,$2,$3,$4)", [
      id,
      "Meja 01",
      JSON.stringify(item),
      false,
    ]);
    await db.query("select checkout_order($1,$2,$3,$4)", [
      id,
      "Meja 01",
      JSON.stringify(item),
      false,
    ]);
    const result = await db.query<{ total_amount: number }>(
      "select total_amount from orders",
    );
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].total_amount, products[0].price * 2);
    await assert.rejects(
      db.query("select checkout_order($1,$2,$3,$4)", [
        id,
        "Nama berbeda",
        JSON.stringify(item),
        false,
      ]),
    );
    await assert.rejects(db.exec("update orders set payment_status='paid'"));
    await assert.rejects(
      db.query("select checkout_order($1,$2,$3,$4)", [
        "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        "Gagal",
        JSON.stringify([{ product_id: products[0].id, quantity: 0 }]),
        true,
      ]),
    );
    assert.equal((await db.query("select * from orders")).rows.length, 1);
    await db.exec(`set request.jwt.claim.sub='${barista}';`);
    assert.equal((await db.query("select * from orders")).rows.length, 0);
    await assert.rejects(db.query("select pay_order($1)", [id]));
    await db.exec(`set request.jwt.claim.sub='${cashier}';`);
    await db.query("select pay_order($1)", [id]);
    await db.exec(`set request.jwt.claim.sub='${barista}';`);
    assert.equal((await db.query("select * from orders")).rows.length, 1);
    await assert.rejects(
      db.query("select set_order_status($1,$2)", [id, "completed"]),
    );
    await db.query("select set_order_status($1,$2)", [id, "cooking"]);
    await db.query("select set_order_status($1,$2)", [id, "completed"]);
    assert.equal(
      (await db.query<{ status: string }>("select status from orders")).rows[0]
        .status,
      "completed",
    );
    await db.exec(`set request.jwt.claim.sub='${outsider}';`);
    assert.equal((await db.query("select * from products")).rows.length, 0);
    await assert.rejects(
      db.query("select checkout_order($1,$2,$3,$4)", [
        "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        "Tanpa role",
        JSON.stringify(item),
        true,
      ]),
    );
  } finally {
    await db.close();
  }
});
