/**
 * Senses faculty - multimodal input/output processing.
 *
 * This faculty handles audio (Whisper), video/image generation (Diffusers),
 * and text-to-speech (Piper TTS) for multimodal agent interactions.
 */

import type { FacultyConfig, FacultyResult } from "./types.js";
import { createDiffusersTool } from "../agents/tools/diffusers-tool.js";
import { createPiperTool } from "../agents/tools/piper-tts-tool.js";
import { createWhisperTool } from "../agents/tools/whisper-tool.js";

export type SensesRequest = {
  /** Type of sensory operation. */
  action: "transcribe" | "generate_image" | "generate_video" | "synthesize_speech";
  /** Audio file path (for transcription). */
  audioPath?: string;
  /** Audio URL (for transcription). */
  audioUrl?: string;
  /** Image generation prompt. */
  imagePrompt?: string;
  /** Video generation prompt. */
  videoPrompt?: string;
  /** Text to synthesize to speech. */
  text?: string;
  /** Voice ID for TTS. */
  voice?: string;
  /** Model to use. */
  model?: string;
  /** Language for transcription. */
  language?: string;
  /** Include timestamps in transcription. */
  includeTimestamps?: boolean;
};

export type SensesResult = {
  /** Transcription result. */
  transcription?: {
    text: string;
    language: string;
    duration: number;
    segments?: Array<{ start: number; end: number; text: string }>;
  };
  /** Generated image info. */
  image?: {
    path: string;
    prompt: string;
    model: string;
  };
  /** Generated video info. */
  video?: {
    path: string;
    prompt: string;
    numFrames: number;
  };
  /** Speech synthesis result. */
  speech?: {
    path: string;
    voice: string;
    duration: number;
  };
};

/**
 * Process multimodal inputs and generate multimodal outputs.
 */
export async function sense(
  request: SensesRequest,
  config: FacultyConfig,
): Promise<FacultyResult<SensesResult>> {
  try {
    switch (request.action) {
      case "transcribe":
        return await transcribeAudio(request, config);
      case "generate_image":
        return await generateImage(request, config);
      case "generate_video":
        return await generateVideo(request, config);
      case "synthesize_speech":
        return await synthesizeSpeech(request, config);
      default:
        return {
          success: false,
          error: `Unknown action: ${request.action}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function transcribeAudio(
  request: SensesRequest,
  config: FacultyConfig,
): Promise<FacultyResult<SensesResult>> {
  if (!request.audioPath && !request.audioUrl) {
    return {
      success: false,
      error: "audioPath or audioUrl is required for transcription",
    };
  }

  const whisperTool = createWhisperTool({ config: config.config });

  const result = await whisperTool.execute("transcribe", {
    action: "transcribe_file",
    audio_path: request.audioPath,
    audio_url: request.audioUrl,
    language: request.language ?? "auto",
    timestamp: request.includeTimestamps ?? true,
    model: request.model ?? "base",
  });

  if (!result || !result.details) {
    return {
      success: false,
      error: "Transcription failed",
    };
  }

  const data = result.details as Record<string, unknown>;

  return {
    success: true,
    data: {
      transcription: {
        text: (data.transcription as string) ?? "",
        language: (data.language as string) ?? "unknown",
        duration: (data.duration_seconds as number) ?? 0,
        segments: data.timestamp_segments as
          | Array<{ start: number; end: number; text: string }>
          | undefined,
      },
    },
  };
}

async function generateImage(
  request: SensesRequest,
  config: FacultyConfig,
): Promise<FacultyResult<SensesResult>> {
  if (!request.imagePrompt) {
    return {
      success: false,
      error: "imagePrompt is required for image generation",
    };
  }

  const diffusersTool = createDiffusersTool({ config: config.config });

  const result = await diffusersTool.execute("generate", {
    action: "generate_image",
    prompt: request.imagePrompt,
    model: request.model ?? "sd-1.5",
  });

  if (!result || !result.details) {
    return {
      success: false,
      error: "Image generation failed",
    };
  }

  const data = result.details as Record<string, unknown>;

  return {
    success: true,
    data: {
      image: {
        path: (data.output_path as string) ?? "",
        prompt: request.imagePrompt,
        model: (data.model as string) ?? "",
      },
    },
  };
}

async function generateVideo(
  request: SensesRequest,
  config: FacultyConfig,
): Promise<FacultyResult<SensesResult>> {
  if (!request.videoPrompt) {
    return {
      success: false,
      error: "videoPrompt is required for video generation",
    };
  }

  const diffusersTool = createDiffusersTool({ config: config.config });

  const result = await diffusersTool.execute("generate_video", {
    action: "generate_video",
    prompt: request.videoPrompt,
    model: request.model ?? "stable-video",
  });

  if (!result || !result.details) {
    return {
      success: false,
      error: "Video generation failed",
    };
  }

  const data = result.details as Record<string, unknown>;

  return {
    success: true,
    data: {
      video: {
        path: (data.output_path as string) ?? "",
        prompt: request.videoPrompt,
        numFrames: (data.num_frames as number) ?? 16,
      },
    },
  };
}

async function synthesizeSpeech(
  request: SensesRequest,
  config: FacultyConfig,
): Promise<FacultyResult<SensesResult>> {
  if (!request.text) {
    return {
      success: false,
      error: "text is required for speech synthesis",
    };
  }

  const piperTool = createPiperTool({ config: config.config });

  const result = await piperTool.execute("synthesize", {
    action: "synthesize_to_file",
    text: request.text,
    voice: request.voice ?? "en_US-lessac-medium",
  });

  if (!result || !result.details) {
    return {
      success: false,
      error: "Speech synthesis failed",
    };
  }

  const data = result.details as Record<string, unknown>;

  return {
    success: true,
    data: {
      speech: {
        path: (data.output_path as string) ?? "",
        voice: (data.voice as string) ?? "",
        duration: (data.audio_duration_seconds as number) ?? 0,
      },
    },
  };
}

/**
 * Detect if input involves multimodal processing.
 */
export function detectSensesIntent(input: string): boolean {
  const multimodalKeywords = [
    "transcribe",
    "audio",
    "speech",
    "voice",
    "generate image",
    "create image",
    "draw",
    "picture",
    "video",
    "speak",
    "say",
    "read aloud",
    "text to speech",
  ];

  const lowerInput = input.toLowerCase();
  return multimodalKeywords.some((keyword) => lowerInput.includes(keyword));
}
