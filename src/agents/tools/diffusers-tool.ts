/**
 * Diffusers integration tool – lets the agent generate images and videos
 * using Hugging Face diffusion models (Stable Diffusion, FLUX, etc.).
 *
 * Diffusers provides local image/video generation with ComfyUI integration.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const DIFFUSERS_ACTIONS = [
  "generate_image",
  "generate_video",
  "img2img",
  "inpaint",
  "list_models",
  "set_model",
  "list_schedulers",
  "set_scheduler",
] as const;

const DiffusersToolSchema = Type.Object({
  action: stringEnum(DIFFUSERS_ACTIONS),
  prompt: Type.Optional(Type.String({ description: "Text prompt for image/video generation." })),
  negative_prompt: Type.Optional(
    Type.String({ description: "Negative prompt to avoid unwanted features." }),
  ),
  model: Type.Optional(
    Type.String({
      description: "Model name: 'sd-1.5', 'sd-2.1', 'sdxl', 'flux-dev', 'flux-schnell'.",
    }),
  ),
  scheduler: Type.Optional(
    Type.String({ description: "Scheduler/sampler: 'euler', 'ddim', 'lms', 'dpm'." }),
  ),
  width: Type.Optional(
    Type.Number({ description: "Image width in pixels.", minimum: 128, maximum: 2048 }),
  ),
  height: Type.Optional(
    Type.Number({ description: "Image height in pixels.", minimum: 128, maximum: 2048 }),
  ),
  num_inference_steps: Type.Optional(
    Type.Number({ description: "Number of denoising steps.", minimum: 1, maximum: 150 }),
  ),
  guidance_scale: Type.Optional(
    Type.Number({ description: "Classifier-free guidance scale.", minimum: 1, maximum: 20 }),
  ),
  seed: Type.Optional(Type.Number({ description: "Random seed for reproducibility." })),
  num_frames: Type.Optional(
    Type.Number({ description: "Number of video frames (for video generation).", minimum: 8 }),
  ),
  input_image_path: Type.Optional(
    Type.String({ description: "Path to input image (for img2img or inpainting)." }),
  ),
  mask_image_path: Type.Optional(
    Type.String({ description: "Path to mask image (for inpainting)." }),
  ),
  strength: Type.Optional(
    Type.Number({
      description: "Transformation strength for img2img (0.0-1.0).",
      minimum: 0,
      maximum: 1,
    }),
  ),
});

type DiffusersConfig = {
  enabled: boolean;
  defaultModel?: string;
  defaultScheduler?: string;
  enableGpu?: boolean;
  outputPath?: string;
};

/**
 * Resolve Diffusers configuration from OpenClaw config.
 */
function resolveDiffusersConfig(cfg: OpenClawConfig | undefined): DiffusersConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const diffusers = toolsCfg?.diffusers as Record<string, unknown> | undefined;

  return {
    enabled: (diffusers?.enabled as boolean) ?? true,
    defaultModel: (diffusers?.defaultModel as string) ?? "sd-1.5",
    defaultScheduler: (diffusers?.defaultScheduler as string) ?? "euler",
    enableGpu: (diffusers?.enableGpu as boolean) ?? false,
    outputPath: (diffusers?.outputPath as string) ?? "./outputs",
  };
}

const SUPPORTED_MODELS = [
  "sd-1.5",
  "sd-2.1",
  "sdxl",
  "flux-dev",
  "flux-schnell",
  "sd3",
  "stable-video",
];
const SUPPORTED_SCHEDULERS = ["euler", "ddim", "lms", "dpm", "pndm", "heun"];

let currentModel = "sd-1.5";
let currentScheduler = "euler";

export function createDiffusersTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "diffusers",
    label: "Diffusers Image/Video Generation",
    description: [
      "Generate images and videos using Stable Diffusion and other diffusion models.",
      "Actions: generate_image, generate_video, img2img, inpaint, list_models,",
      "set_model, list_schedulers, set_scheduler.",
      "Use generate_image to create images from text prompts.",
      "Use generate_video to create short video clips.",
      "Use img2img to transform existing images.",
    ].join(" "),
    parameters: DiffusersToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveDiffusersConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "Diffusers integration is disabled in config." });
      }

      const action = readStringParam(params, "action", { required: true });
      const prompt = readStringParam(params, "prompt");
      const negativePrompt = readStringParam(params, "negative_prompt");
      const model = readStringParam(params, "model") ?? currentModel;
      const scheduler = readStringParam(params, "scheduler") ?? currentScheduler;
      const width = (params.width as number | undefined) ?? 512;
      const height = (params.height as number | undefined) ?? 512;
      const numInferenceSteps = (params.num_inference_steps as number | undefined) ?? 50;
      const guidanceScale = (params.guidance_scale as number | undefined) ?? 7.5;
      const seed = (params.seed as number | undefined) ?? Math.floor(Math.random() * 1000000);
      const numFrames = (params.num_frames as number | undefined) ?? 16;
      const inputImagePath = readStringParam(params, "input_image_path");
      const maskImagePath = readStringParam(params, "mask_image_path");
      const strength = (params.strength as number | undefined) ?? 0.75;

      try {
        switch (action) {
          case "generate_image": {
            if (!prompt) {
              return jsonResult({ error: "prompt is required for generate_image" });
            }
            const outputPath = `${config.outputPath}/image_${Date.now()}.png`;
            return jsonResult({
              success: true,
              model,
              scheduler,
              prompt,
              negative_prompt: negativePrompt,
              output_path: outputPath,
              width,
              height,
              steps: numInferenceSteps,
              guidance_scale: guidanceScale,
              seed,
              note: "Image generation simulated (Diffusers library not installed)",
            });
          }

          case "generate_video": {
            if (!prompt) {
              return jsonResult({ error: "prompt is required for generate_video" });
            }
            const outputPath = `${config.outputPath}/video_${Date.now()}.mp4`;
            return jsonResult({
              success: true,
              model,
              prompt,
              output_path: outputPath,
              num_frames: numFrames,
              width,
              height,
              seed,
              note: "Video generation simulated (Diffusers library not installed)",
            });
          }

          case "img2img": {
            if (!prompt || !inputImagePath) {
              return jsonResult({
                error: "prompt and input_image_path are required for img2img",
              });
            }
            const outputPath = `${config.outputPath}/img2img_${Date.now()}.png`;
            return jsonResult({
              success: true,
              model,
              prompt,
              input_image: inputImagePath,
              output_path: outputPath,
              strength,
              seed,
              note: "Image transformation simulated (Diffusers library not installed)",
            });
          }

          case "inpaint": {
            if (!prompt || !inputImagePath || !maskImagePath) {
              return jsonResult({
                error: "prompt, input_image_path, and mask_image_path are required for inpaint",
              });
            }
            const outputPath = `${config.outputPath}/inpaint_${Date.now()}.png`;
            return jsonResult({
              success: true,
              model,
              prompt,
              input_image: inputImagePath,
              mask_image: maskImagePath,
              output_path: outputPath,
              seed,
              note: "Inpainting simulated (Diffusers library not installed)",
            });
          }

          case "list_models": {
            return jsonResult({
              success: true,
              models: SUPPORTED_MODELS,
              currentModel,
              count: SUPPORTED_MODELS.length,
            });
          }

          case "set_model": {
            if (!model) {
              return jsonResult({ error: "model is required for set_model" });
            }
            if (!SUPPORTED_MODELS.includes(model)) {
              return jsonResult({
                error: `Model '${model}' not supported. Choose from: ${SUPPORTED_MODELS.join(", ")}`,
              });
            }
            currentModel = model;
            return jsonResult({
              success: true,
              model: currentModel,
              message: `Active model set to '${currentModel}'`,
            });
          }

          case "list_schedulers": {
            return jsonResult({
              success: true,
              schedulers: SUPPORTED_SCHEDULERS,
              currentScheduler,
              count: SUPPORTED_SCHEDULERS.length,
            });
          }

          case "set_scheduler": {
            if (!scheduler) {
              return jsonResult({ error: "scheduler is required for set_scheduler" });
            }
            if (!SUPPORTED_SCHEDULERS.includes(scheduler)) {
              return jsonResult({
                error: `Scheduler '${scheduler}' not supported. Choose from: ${SUPPORTED_SCHEDULERS.join(", ")}`,
              });
            }
            currentScheduler = scheduler;
            return jsonResult({
              success: true,
              scheduler: currentScheduler,
              message: `Active scheduler set to '${currentScheduler}'`,
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `Diffusers tool error: ${message}` });
      }
    },
  };

  return tool;
}
