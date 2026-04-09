export type ChatRequestResult<T> =
  | { status: "success"; statusCode: number; data: T }
  | { status: "http-error"; statusCode: number }
  | { status: "network-error" }
  | { status: "aborted" }
  | { status: "unexpected-error" };

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}

async function runChatRequest<T>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  parse: (response: Response) => Promise<T>,
): Promise<ChatRequestResult<T>> {
  try {
    const response = await fetch(input, init);
    if (!response.ok) {
      return { status: "http-error", statusCode: response.status };
    }

    return {
      status: "success",
      statusCode: response.status,
      data: await parse(response),
    };
  } catch (error) {
    if (isAbortError(error)) {
      return { status: "aborted" };
    }

    if (isNetworkError(error)) {
      return { status: "network-error" };
    }

    return { status: "unexpected-error" };
  }
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ChatRequestResult<T>> {
  return runChatRequest(input, init, async (response) => (await response.json()) as T);
}

export async function requestStatus(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ChatRequestResult<null>> {
  return runChatRequest(input, init, async () => null);
}

export async function requestText(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ChatRequestResult<string>> {
  return runChatRequest(input, init, async (response) => response.text());
}