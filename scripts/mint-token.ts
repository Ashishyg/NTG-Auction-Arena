/**
 * Dev helper: mint a handoff token the way the main site will.
 *   npm run mint -- <userId> [expiresIn]
 * Prints a token to paste as ?token=... on an auction URL.
 */
import jwt from "jsonwebtoken";

const userId = process.argv[2];
const expiresIn = process.argv[3] || "2h";
const secret = process.env.JWT_SECRET;

if (!userId || !secret) {
  console.error("Usage: npm run mint -- <userId>   (and JWT_SECRET must be set)");
  process.exit(1);
}

// ponytail: identity-only token — role is resolved server-side from the DB.
console.log(jwt.sign({ userId }, secret, { expiresIn } as jwt.SignOptions));
