CREATE TABLE `dashboardLayouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`layoutData` text NOT NULL,
	`widgetVisibility` text NOT NULL,
	`dateRangePreset` varchar(50) NOT NULL DEFAULT 'last30days',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dashboardLayouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `dashboardLayouts_userId_idx` ON `dashboardLayouts` (`userId`);