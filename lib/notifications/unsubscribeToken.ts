import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

function getTokenSecret() {
  const secret = process.env.UNSUBSCRIBE_SECRET;

  if (!secret) {
    throw new Error("UNSUBSCRIBE_SECRET env var is required. Add it to .env.local");
  }

  return secret;
}

function signProfileId(profileId: string) {
  return createHmac("sha256", getTokenSecret()).update(profileId).digest("base64url");
}

export function createUnsubscribeToken(profileId: string) {
  return `${profileId}.${signProfileId(profileId)}`;
}

export function verifyUnsubscribeToken(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const [profileId, signature] = token.split(".");

  if (!profileId || !signature) {
    return null;
  }

  const expected = signProfileId(profileId);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer) ? profileId : null;
}
