import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const {loadEnvConfig}=nextEnv;loadEnvConfig(process.cwd());
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SECRET_KEY;
if(!url||!key?.startsWith("sb_secret_"))throw new Error("Supabase Admin no está configurado.");
const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
const now=new Date().toISOString();
const count=async(table,configure=query=>query)=>{const {count,error}=await configure(db.from(table).select("*",{count:"exact",head:true}));if(error)throw error;return count??0;};
const [{data:links,error:linksError},{data:activeCodeRows,error:codesError}]=await Promise.all([db.from("telegram_links").select("user_id"),db.from("telegram_link_codes").select("user_id").is("used_at",null).gt("expires_at",now)]);if(linksError)throw linksError;if(codesError)throw codesError;
const linkedUsers=new Set((links??[]).map(row=>row.user_id));
const result={
  project:new URL(url).hostname,
  profiles:await count("profiles"),
  householdMemberships:await count("household_members"),
  activeCodes:await count("telegram_link_codes",query=>query.is("used_at",null).gt("expires_at",now)),
  expiredUnusedCodes:await count("telegram_link_codes",query=>query.is("used_at",null).lte("expires_at",now)),
  usedCodes:await count("telegram_link_codes",query=>query.not("used_at","is",null)),
  telegramLinks:await count("telegram_links"),
  activeCodesForLinkedUsers:(activeCodeRows??[]).filter(row=>linkedUsers.has(row.user_id)).length,
  activeCodesForUnlinkedUsers:(activeCodeRows??[]).filter(row=>!linkedUsers.has(row.user_id)).length,
};
console.log(JSON.stringify(result,null,2));
