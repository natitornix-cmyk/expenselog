# Expense Log: From Street to Strait 🌏

บันทึกค่าใช้จ่ายกลุ่ม — เปิดใช้งานได้บนมือถือผ่าน browser

---

## วิธีตั้งค่า (ทำครั้งเดียว ทำบนมือถือได้เลย)

### ขั้นตอนที่ 1 — ตั้งค่าฐานข้อมูล (Supabase)

1. เปิด **[supabase.com](https://supabase.com)** → สมัครบัญชีฟรี
2. กด **New project** → ตั้งชื่อ `expenselog` → เลือก region ที่ใกล้ที่สุด → **Create project**
3. รอสักครู่จนโปรเจกต์พร้อม แล้วไปที่เมนู **SQL Editor**
4. วาง SQL ด้านล่างแล้วกด **Run**:

```sql
CREATE TABLE members (
  id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE expenses (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date        TEXT NOT NULL,
  description TEXT NOT NULL,
  paid_by     BIGINT NOT NULL REFERENCES members(id),
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expense_splits (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  expense_id BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id  BIGINT NOT NULL REFERENCES members(id),
  amount     FLOAT NOT NULL DEFAULT 0
);

-- เพิ่มสมาชิกเริ่มต้น (แก้ชื่อได้ในแอป)
INSERT INTO members (name) VALUES ('บูม'), ('หนึ่ง'), ('โอม'), ('ติณห์');

-- เปิดสิทธิ์ให้แอปอ่าน/เขียนข้อมูลได้
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON expense_splits FOR ALL USING (true) WITH CHECK (true);
```

5. ไปที่ **Settings → API** แล้วคัดลอก 2 ค่านี้ไว้:
   - **Project URL** (เช่น `https://abcdefghij.supabase.co`)
   - **anon public** key (สตริงยาวมาก เริ่มด้วย `eyJ...`)

---

### ขั้นตอนที่ 2 — Deploy แอป (Vercel)

1. เปิด **[vercel.com](https://vercel.com)** → สมัครด้วย GitHub
2. กด **Add New → Project** → Import `natitornix-cmyk/expenselog`
3. ก่อนกด Deploy ให้เปิด **Environment Variables** แล้วเพิ่ม:

   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | Project URL ที่คัดลอกมา |
   | `VITE_SUPABASE_ANON_KEY` | anon key ที่คัดลอกมา |

4. กด **Deploy** — รอแป๊บเดียว

Vercel จะให้ URL เช่น `https://expenselog-xxx.vercel.app` — แชร์ให้เพื่อนเปิดได้เลย!

---

## วิธีรันในเครื่อง (สำหรับ dev)

```bash
cp frontend/.env.example frontend/.env
# แก้ค่าใน frontend/.env ให้ตรงกับ Supabase ของตัวเอง

npm run dev
# เปิด http://localhost:5173
```
