import { supabase } from '../supabase';

// Phase 27 — AI Pitch Coach (Elite).

export interface PitchCritique {
  score: number;
  strengths: string[];
  weaknesses: string[];
  rewrite: string;
  model: string;
}

export const critiquePitch = async (
  pitch: string,
  audience: 'investor' | 'customer' | 'cofounder' = 'investor',
): Promise<PitchCritique> => {
  const { data, error } = await supabase.functions.invoke<PitchCritique>('pitch-coach', {
    body: { pitch, audience },
  });
  if (error) throw error;
  if (!data) throw new Error('Empty response from pitch-coach');
  return data;
};
