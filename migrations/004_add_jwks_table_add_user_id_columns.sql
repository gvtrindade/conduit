CREATE TABLE IF NOT EXISTS jwks (
	"id" text NOT NULL PRIMARY KEY,
	"publicKey" text NOT NULL,
	"privateKey" text NOT NULL,
	"createdAt" timestamptz NOT NULL,
	"expiresAt" timestamptz
);


items
manifests
merchants
receipts
