CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidateId` int NOT NULL,
	`requirementId` int,
	`name` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`uploadedBy` int NOT NULL,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `participantProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidateId` int NOT NULL,
	`programId` int NOT NULL,
	`currentStageId` int NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`status` enum('active','completed','withdrawn','on_hold') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `participantProgress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipelineStages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`programId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`order` int NOT NULL,
	`autoAdvance` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pipelineStages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `requirementCompletions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`participantProgressId` int NOT NULL,
	`requirementId` int NOT NULL,
	`documentId` int,
	`completedAt` timestamp,
	`completedBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `requirementCompletions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stageRequirements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stageId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('document','training','approval','task') NOT NULL,
	`isRequired` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stageRequirements_id` PRIMARY KEY(`id`)
);
