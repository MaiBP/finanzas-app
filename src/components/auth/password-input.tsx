"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordInput({ id, name = "password", autoComplete, minLength }: { id: string; name?: string; autoComplete: "current-password" | "new-password"; minLength?: number }) {
  const [visible,setVisible]=useState(false);
  const label=visible?"Ocultar contraseña":"Mostrar contraseña";
  return <div className="relative"><input id={id} className="field pr-14" required minLength={minLength} type={visible?"text":"password"} name={name} autoComplete={autoComplete}/><button type="button" data-button-theme="custom" onClick={()=>setVisible(value=>!value)} aria-label={label} aria-pressed={visible} title={label} className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-[#3a3434] hover:bg-[#ffff50]">{visible?<EyeOff size={19}/>:<Eye size={19}/>}</button></div>;
}
