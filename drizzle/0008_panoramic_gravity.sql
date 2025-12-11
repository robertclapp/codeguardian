CREATE TABLE `auditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255) NOT NULL,
	`action` enum('create','update','delete') NOT NULL,
	`tableName` varchar(100) NOT NULL,
	`recordId` int NOT NULL,
	`beforeSnapshot` text,
	`afterSnapshot` text,
	`changes` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('notification','reminder','reference_check','compliance','custom') NOT NULL,
	`subject` varchar(500) NOT NULL,
	`htmlBody` text NOT NULL,
	`textBody` text,
	`variables` text,
	`isActive` int NOT NULL DEFAULT 1,
	`isDefault` int NOT NULL DEFAULT 0,
	`version` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smsTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('notification','reminder','reference_check','custom') NOT NULL,
	`body` varchar(1600) NOT NULL,
	`variables` text,
	`isActive` int NOT NULL DEFAULT 1,
	`isDefault` int NOT NULL DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `smsTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userActivityLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`resource` varchar(100),
	`resourceId` int,
	`ipAddress` varchar(45),
	`userAgent` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userActivityLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `auditLog_userId_idx` ON `auditLog` (`userId`);--> statement-breakpoint
CREATE INDEX `auditLog_action_idx` ON `auditLog` (`action`);--> statement-breakpoint
CREATE INDEX `auditLog_tableName_idx` ON `auditLog` (`tableName`);--> statement-breakpoint
CREATE INDEX `auditLog_recordId_idx` ON `auditLog` (`recordId`);--> statement-breakpoint
CREATE INDEX `auditLog_createdAt_idx` ON `auditLog` (`createdAt`);--> statement-breakpoint
CREATE INDEX `emailTemplates_type_idx` ON `emailTemplates` (`type`);--> statement-breakpoint
CREATE INDEX `emailTemplates_isActive_idx` ON `emailTemplates` (`isActive`);--> statement-breakpoint
CREATE INDEX `emailTemplates_isDefault_idx` ON `emailTemplates` (`isDefault`);--> statement-breakpoint
CREATE INDEX `smsTemplates_type_idx` ON `smsTemplates` (`type`);--> statement-breakpoint
CREATE INDEX `smsTemplates_isActive_idx` ON `smsTemplates` (`isActive`);--> statement-breakpoint
CREATE INDEX `smsTemplates_isDefault_idx` ON `smsTemplates` (`isDefault`);--> statement-breakpoint
CREATE INDEX `userActivityLog_userId_idx` ON `userActivityLog` (`userId`);--> statement-breakpoint
CREATE INDEX `userActivityLog_action_idx` ON `userActivityLog` (`action`);--> statement-breakpoint
CREATE INDEX `userActivityLog_resource_idx` ON `userActivityLog` (`resource`);--> statement-breakpoint
CREATE INDEX `userActivityLog_createdAt_idx` ON `userActivityLog` (`createdAt`);