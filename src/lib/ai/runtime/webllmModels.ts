export const WEBLLM_MODELS = [
  { id: 'Qwen3-1.7B-q4f16_1-MLC', label: 'Qwen3 1.7B · 中文 / EN', free: true },
  { id: 'Qwen3-0.6B-q4f16_1-MLC', label: 'Qwen3 0.6B · 轻量 / Lite', free: true },
]
// Qwen tokens (estimateQwenTokens): the 4,096 context minus the answer and a margin.
export const WEBLLM_INPUT_BUDGET = 3200
export const WEBLLM_OUTPUT_BUDGET = 768
