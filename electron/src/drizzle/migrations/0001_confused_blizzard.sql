CREATE TABLE `UserVerification` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`macAddress` text NOT NULL,
	`verificationCode` text,
	`isVerified` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`verifiedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `UserVerification_email_unique` ON `UserVerification` (`email`);--> statement-breakpoint
CREATE INDEX `user_verification_email` ON `UserVerification` (`email`);--> statement-breakpoint
CREATE INDEX `user_verification_mac_address` ON `UserVerification` (`macAddress`);