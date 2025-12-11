CREATE TABLE `calendarEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`providerId` int NOT NULL,
	`externalEventId` varchar(255) NOT NULL,
	`eventType` enum('appointment','training','deadline','meeting','other') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`location` text,
	`attendees` text,
	`participantId` int,
	`programId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendarEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendarProviders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`providerType` enum('google','outlook') NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text,
	`expiresAt` timestamp,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendarProviders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `calendarEvents_userId_idx` ON `calendarEvents` (`userId`);--> statement-breakpoint
CREATE INDEX `calendarEvents_providerId_idx` ON `calendarEvents` (`providerId`);--> statement-breakpoint
CREATE INDEX `calendarEvents_eventType_idx` ON `calendarEvents` (`eventType`);--> statement-breakpoint
CREATE INDEX `calendarEvents_startTime_idx` ON `calendarEvents` (`startTime`);--> statement-breakpoint
CREATE INDEX `calendarEvents_participantId_idx` ON `calendarEvents` (`participantId`);--> statement-breakpoint
CREATE INDEX `calendarEvents_programId_idx` ON `calendarEvents` (`programId`);--> statement-breakpoint
CREATE INDEX `calendarProviders_userId_idx` ON `calendarProviders` (`userId`);--> statement-breakpoint
CREATE INDEX `calendarProviders_providerType_idx` ON `calendarProviders` (`providerType`);