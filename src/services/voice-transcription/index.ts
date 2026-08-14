import OpenAI from "openai";
import { toFile } from "openai/uploads";

export async function transcribeVoiceMessage(bytes: Uint8Array, mimeType = "audio/ogg") {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY no está configurada");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const file = await toFile(bytes, "voice.ogg", { type: mimeType });
  const transcription = await client.audio.transcriptions.create({
    file,
    model: process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-mini-transcribe",
    language: "es",
  });
  const text = transcription.text.trim();
  if (!text) throw new Error("No pude entender el audio, prueba a grabarlo de nuevo");
  return text;
}
