import { customAlphabet } from "nanoid";

const generate = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-",
  22,
);

export function generatePublicToken(): string {
  return generate();
}

