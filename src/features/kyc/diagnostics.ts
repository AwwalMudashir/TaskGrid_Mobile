type KycDiagnosticDetails = Record<string, string | number | boolean | null | undefined>;

function safeError(error: unknown) {
  if (!(error instanceof Error)) {
    return { errorType: typeof error };
  }

  return {
    errorName: error.name,
    errorMessage: error.message.slice(0, 300),
  };
}

export function kycReferenceTag(referenceId: string | null | undefined) {
  if (!referenceId) return 'none';
  return referenceId.slice(-8);
}

/**
 * Emits KYC lifecycle breadcrumbs to Metro and Android logcat. Never pass
 * identity numbers, email addresses, tokens, images, keys or provider payloads.
 */
export function traceKyc(event: string, details: KycDiagnosticDetails = {}) {
  console.info(
    `[TaskGrid KYC] ${JSON.stringify({
      at: new Date().toISOString(),
      event,
      ...details,
    })}`,
  );
}

export function traceKycError(
  event: string,
  error: unknown,
  details: KycDiagnosticDetails = {},
) {
  console.error(
    `[TaskGrid KYC] ${JSON.stringify({
      at: new Date().toISOString(),
      event,
      ...details,
      ...safeError(error),
    })}`,
  );
}
