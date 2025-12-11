CREATE TABLE `documentTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` enum('tax-forms','employment','financial','legal','program-specific','other') NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` text NOT NULL,
	`fileSize` int,
	`mimeType` varchar(100),
	`isActive` int NOT NULL DEFAULT 1,
	`downloadCount` int NOT NULL DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documentTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `documentTemplates_category_idx` ON `documentTemplates` (`category`);--> statement-breakpoint
CREATE INDEX `documentTemplates_isActive_idx` ON `documentTemplates` (`isActive`);--> statement-breakpoint
CREATE INDEX `documentTemplates_createdBy_idx` ON `documentTemplates` (`createdBy`);