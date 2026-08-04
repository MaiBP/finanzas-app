import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const {loadEnvConfig}=nextEnv;
loadEnvConfig(process.cwd());

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SECRET_KEY;
if(!url||!key?.startsWith("sb_secret_"))throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY válidas.");

const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
const count=async table=>{const {count,error}=await db.from(table).select("*",{count:"exact",head:true});if(error)throw error;return count??0;};
const {data:userPage,error:userError}=await db.auth.admin.listUsers({page:1,perPage:1});if(userError)throw userError;
const before={project:new URL(url).hostname,authUsers:userPage.total??userPage.users.length,households:await count("households"),accounts:await count("accounts"),transactions:await count("transactions"),categories:await count("categories")};
console.log(JSON.stringify({mode:process.argv.includes("--confirm-reset")?"reset":"dry-run",before},null,2));

if(!process.argv.includes("--confirm-reset"))process.exit(0);

// Delete transactions while their households still exist because the audit trigger
// records every transaction deletion and requires a valid household foreign key.
const {error:transactionsError}=await db.from("transactions").delete().not("id","is",null);if(transactionsError)throw transactionsError;
const {error:auditError}=await db.from("audit_logs").delete().not("id","is",null);if(auditError)throw auditError;
const {error:householdsError}=await db.from("households").delete().not("id","is",null);if(householdsError)throw householdsError;
const {error:categoryError}=await db.from("categories").update({created_by:null}).is("household_id",null);if(categoryError)throw categoryError;

while(true){
  const {data,error}=await db.auth.admin.listUsers({page:1,perPage:1000});if(error)throw error;
  if(!data.users.length)break;
  for(const user of data.users){const {error:deleteError}=await db.auth.admin.deleteUser(user.id);if(deleteError)throw deleteError;}
}

const {data:remainingUsers,error:remainingError}=await db.auth.admin.listUsers({page:1,perPage:1});if(remainingError)throw remainingError;
const after={authUsers:remainingUsers.users.length,households:await count("households"),accounts:await count("accounts"),transactions:await count("transactions"),categories:await count("categories")};
console.log(JSON.stringify({completed:true,after},null,2));
