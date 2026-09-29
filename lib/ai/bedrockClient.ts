import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

let client: BedrockRuntimeClient | null = null;

function getClient(): BedrockRuntimeClient {
  if (client) return client;

  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error("AWS_REGION is not set — required for Bedrock calls.");
  }

  client = new BedrockRuntimeClient({ region });
  return client;
}

export interface BedrockCallResult {
  text: string;
  modelId: string;
}

/**
 * Calls the configured Bedrock model via the Converse API — chosen over
 * the older per-provider InvokeModel body format specifically so this
 * code doesn't need to change if the model behind BEDROCK_MODEL_ID is
 * swapped (Anthropic Claude, Amazon Nova, etc. all use the same shape here).
 *
 * `systemPrompt` MUST contain the grounding instruction and the real,
 * pre-computed numbers — see promptBuilder.ts. This function does not
 * validate that; the caller is responsible for never sending an ungrounded
 * prompt to this function.
 */
export async function callBedrock(params: {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
}): Promise<BedrockCallResult> {
  const modelId = process.env.BEDROCK_MODEL_ID;
  if (!modelId) {
    throw new Error(
      "BEDROCK_MODEL_ID is not set. Confirm the exact model ID from the AWS Bedrock console's " +
        "'Model access' page — the call will fail with AccessDeniedException if the model isn't enabled."
    );
  }

  const bedrock = getClient();

  try {
    const response = await bedrock.send(
      new ConverseCommand({
        modelId,
        system: [{ text: params.systemPrompt }],
        messages: [
          {
            role: "user",
            content: [{ text: params.userMessage }],
          },
        ],
        inferenceConfig: {
          maxTokens: params.maxTokens ?? 512,
          temperature: 0.2, // low temperature — this is an explainer, not a creative writer
        },
      })
    );

    const text = response.output?.message?.content?.[0]?.text;
    if (!text) {
      throw new Error("Bedrock returned an empty response.");
    }

    return { text, modelId };
  } catch (err) {
    // Surface a specific, actionable message for the two most common
    // Bedrock setup failures, per the build prompt's explicit error
    // handling requirement.
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("AccessDenied")) {
      throw new Error(
        `Bedrock access denied for model "${modelId}". Enable this model under ` +
          `AWS Console → Bedrock → Model access, in region ${process.env.AWS_REGION}.`
      );
    }
    if (message.includes("Throttling")) {
      throw new Error("Bedrock is throttling requests. Please retry in a moment.");
    }

    throw new Error(`Bedrock call failed: ${message}`);
  }
}