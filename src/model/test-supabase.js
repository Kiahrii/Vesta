import { useEffect } from "react";
import { supabase } from "model/supabaseClient";

export default function Default() {

  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase.from("rooms").select("*");

      if (error) {
        console.error("Supabase error:", error.message);
        return;
      }

      console.log("Data:", data);
    }

    testConnection();
  }, []);

  return (
    <div>
      Dashboard
    </div>
  );
}