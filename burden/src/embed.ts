import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

// Local embeddings — no API key, runs on the laptop. 384-dim MiniLM.
// The model (~25MB) downloads to ~/.cache on first run.
let _extractor: FeatureExtractionPipeline | null = null;

async function extractor(): Promise<FeatureExtractionPipeline> {
  if (!_extractor) {
    _extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return _extractor;
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const ex = await extractor();
  const out = await ex(texts, { pooling: "mean", normalize: true });
  return out.tolist() as number[][];
}
