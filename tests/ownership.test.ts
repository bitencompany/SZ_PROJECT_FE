import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("실제 PostgreSQL RLS: 타인 조회·주문 조작 차단, 본인 결제 완료 결과만 공개", async () => {
  const db = new PGlite();
  const owner = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  const request = "33333333-3333-4333-8333-333333333333";
  const order = "44444444-4444-4444-8444-444444444444";
  try {
    // Supabase 환경의 역할과 auth.uid()만 재현하며, 실제 프로젝트 키는 사용하지 않습니다.
    await db.exec(`create schema auth; create table auth.users(id uuid primary key);
      create role anon; create role authenticated; create role service_role bypassrls;
      grant usage on schema public, auth to anon, authenticated, service_role;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      insert into auth.users values ('${owner}'), ('${other}');`);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610300001_readings.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${owner}', false);
      insert into public.reading_requests (id,user_id,input,catalog_status,catalog_version,consent_version)
      values ('${request}','${owner}','{"name":"김서준"}','preview','test','test');`);
    await assert.rejects(
      db.exec(
        `update public.reading_requests set input = '{}' where id='${request}'`,
      ),
    );
    await assert.rejects(
      db.exec(
        `insert into public.orders (user_id,request_id,amount) values ('${owner}','${request}',1)`,
      ),
    );
    await db.exec(`reset role; insert into public.orders(id,user_id,request_id,amount) values ('${order}','${owner}','${request}',1000);
      insert into public.readings(user_id,order_id,subject_name,content) values ('${owner}','${order}','김서준','{"title":"테스트"}');
      set role authenticated;`);
    assert.equal(
      (await db.query("select * from public.readings")).rows.length,
      0,
      "미결제 결과는 숨겨야 함",
    );
    await db.exec(
      `reset role; update public.orders set status='paid', paid_at=now(), provider_payment_id='test-payment' where id='${order}'; set role authenticated;`,
    );
    assert.equal(
      (await db.query("select * from public.readings")).rows.length,
      1,
      "결제한 본인은 조회 가능",
    );
    await db.exec(
      `select set_config('request.jwt.claim.sub','${other}',false)`,
    );
    for (const table of ["reading_requests", "orders", "readings"])
      assert.equal(
        (await db.query(`select * from public.${table}`)).rows.length,
        0,
        `${table} 타인 조회 차단`,
      );
    await assert.rejects(
      db.exec(
        `insert into public.reading_requests(id,user_id,input,catalog_status,catalog_version,consent_version) values (gen_random_uuid(),'${owner}','{}','preview','test','test')`,
      ),
    );
    await db.exec(
      `reset role; update public.orders set status='refunded' where id='${order}'; set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false);`,
    );
    assert.equal(
      (await db.query("select * from public.readings")).rows.length,
      0,
      "환불 후 접근 회수",
    );
    await db.exec("reset role; set role anon;");
    await assert.rejects(db.query("select * from public.readings"));
  } finally {
    await db.close();
  }
});
