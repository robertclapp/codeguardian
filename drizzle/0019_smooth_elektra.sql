CREATE TABLE `offerLetters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidateId` int NOT NULL,
	`jobTitle` varchar(255) NOT NULL,
	`department` varchar(255) NOT NULL,
	`salary` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`startDate` timestamp NOT NULL,
	`benefits` text NOT NULL,
	`reportingTo` varchar(255) NOT NULL,
	`location` varchar(255) NOT NULL,
	`employmentType` enum('full-time','part-time','contract') NOT NULL,
	`status` enum('draft','sent','viewed','accepted','declined','expired') NOT NULL DEFAULT 'draft',
	`offerCode` varchar(50) NOT NULL,
	`expirationDate` timestamp NOT NULL,
	`customTerms` text,
	`sentAt` timestamp,
	`viewedAt` timestamp,
	`signedAt` timestamp,
	`signatureName` varchar(255),
	`declinedAt` timestamp,
	`declineReason` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `offerLetters_id` PRIMARY KEY(`id`),
	CONSTRAINT `offerLetters_offerCode_unique` UNIQUE(`offerCode`)
);
--> statement-breakpoint
ALTER TABLE `offerLetters` ADD CONSTRAINT `offerLetters_candidateId_candidates_id_fk` FOREIGN KEY (`candidateId`) REFERENCES `candidates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `offerLetters_candidateId_idx` ON `offerLetters` (`candidateId`);--> statement-breakpoint
CREATE INDEX `offerLetters_status_idx` ON `offerLetters` (`status`);--> statement-breakpoint
CREATE INDEX `offerLetters_code_idx` ON `offerLetters` (`offerCode`);