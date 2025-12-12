CREATE TABLE `candidate_portal_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidate_id` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `candidate_portal_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `candidate_portal_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `dashboard_layouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`layoutData` text NOT NULL,
	`widgetVisibility` text NOT NULL,
	`dateRangePreset` varchar(50) NOT NULL DEFAULT 'last30days',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dashboard_layouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `dashboardLayouts`;--> statement-breakpoint
CREATE INDEX `dashboardLayouts_userId_idx` ON `dashboard_layouts` (`userId`);