import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export async function saveContact({ name, phone, email }) {
  return await supabase.from("contacts").insert([{ name, phone, email }]);
}

export async function saveFeedback(message) {
  return await supabase.from("feedback").insert([{ message }]);
}
