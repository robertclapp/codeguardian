CREATE TABLE `referenceChecks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidateId` int NOT NULL,
	`referenceName` varchar(255) NOT NULL,
	`referenceEmail` varchar(255) NOT NULL,
	`referencePhone` varchar(50),
	`relationship` varchar(100),
	`company` varchar(255),
	`status` enum('pending','sent','completed','expired') NOT NULL DEFAULT 'pending',
	`questionnaireId` int,
	`responses` text,
	`overallRating` int,
	`comments` text,
	`sentAt` timestamp,
	`completedAt` timestamp,
	`expiresAt` timestamp,
	`reminderCount` int NOT NULL DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referenceChecks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referenceQuestionnaires` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`questions` text NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`isDefault` int NOT NULL DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referenceQuestionnaires_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `videoProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`videoId` int NOT NULL,
	`watchedSeconds` int NOT NULL DEFAULT 0,
	`completed` int NOT NULL DEFAULT 0,
	`lastWatchedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `videoProgress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `videoTutorials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` enum('getting-started','document-upload','progress-tracking','program-completion','troubleshooting','other') NOT NULL,
	`videoUrl` text NOT NULL,
	`thumbnailUrl` text,
	`duration` int,
	`order` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`viewCount` int NOT NULL DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `videoTutorials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `referenceChecks_candidateId_idx` ON `referenceChecks` (`candidateId`);--> statement-breakpoint
CREATE INDEX `referenceChecks_status_idx` ON `referenceChecks` (`status`);--> statement-breakpoint
CREATE INDEX `referenceChecks_referenceEmail_idx` ON `referenceChecks` (`referenceEmail`);--> statement-breakpoint
CREATE INDEX `referenceQuestionnaires_isActive_idx` ON `referenceQuestionnaires` (`isActive`);--> statement-breakpoint
CREATE INDEX `referenceQuestionnaires_isDefault_idx` ON `referenceQuestionnaires` (`isDefault`);--> statement-breakpoint
CREATE INDEX `videoProgress_userId_idx` ON `videoProgress` (`userId`);--> statement-breakpoint
CREATE INDEX `videoProgress_videoId_idx` ON `videoProgress` (`videoId`);--> statement-breakpoint
CREATE INDEX `videoProgress_userId_videoId_idx` ON `videoProgress` (`userId`,`videoId`);--> statement-breakpoint
CREATE INDEX `videoTutorials_category_idx` ON `videoTutorials` (`category`);--> statement-breakpoint
CREATE INDEX `videoTutorials_isActive_idx` ON `videoTutorials` (`isActive`);--> statement-breakpoint
CREATE INDEX `videoTutorials_order_idx` ON `videoTutorials` (`order`);