CREATE TABLE `interviewRecordings` (
	`id` varchar(36) NOT NULL,
	`candidateId` varchar(36) NOT NULL,
	`interviewId` varchar(36) NOT NULL,
	`videoUrl` text NOT NULL,
	`transcription` text NOT NULL,
	`sentiment` enum('positive','neutral','negative') NOT NULL,
	`keyMoments` text NOT NULL,
	`score` int NOT NULL,
	`strengths` text NOT NULL,
	`concerns` text NOT NULL,
	`processingTime` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `interviewRecordings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referralCode` varchar(20) NOT NULL,
	`referrerId` int NOT NULL,
	`candidateId` int,
	`candidateName` varchar(255) NOT NULL,
	`candidateEmail` varchar(320) NOT NULL,
	`candidatePhone` varchar(20),
	`jobId` int,
	`status` enum('pending','applied','screening','interview','offer','hired','rejected') NOT NULL DEFAULT 'pending',
	`bonusAmount` int DEFAULT 0,
	`bonusPaid` int DEFAULT 0,
	`bonusPaidAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`),
	CONSTRAINT `referrals_referralCode_unique` UNIQUE(`referralCode`)
);
--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referrerId_users_id_fk` FOREIGN KEY (`referrerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_candidateId_candidates_id_fk` FOREIGN KEY (`candidateId`) REFERENCES `candidates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_jobId_jobs_id_fk` FOREIGN KEY (`jobId`) REFERENCES `jobs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `interviewRecordings_candidateId_idx` ON `interviewRecordings` (`candidateId`);--> statement-breakpoint
CREATE INDEX `interviewRecordings_interviewId_idx` ON `interviewRecordings` (`interviewId`);--> statement-breakpoint
CREATE INDEX `referrals_referrerId_idx` ON `referrals` (`referrerId`);--> statement-breakpoint
CREATE INDEX `referrals_candidateId_idx` ON `referrals` (`candidateId`);--> statement-breakpoint
CREATE INDEX `referrals_status_idx` ON `referrals` (`status`);--> statement-breakpoint
CREATE INDEX `referrals_code_idx` ON `referrals` (`referralCode`);