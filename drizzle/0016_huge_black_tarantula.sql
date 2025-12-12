CREATE TABLE `import_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`import_type` enum('candidates','jobs') NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`total_rows` int NOT NULL,
	`successful_rows` int NOT NULL,
	`failed_rows` int NOT NULL,
	`errors` text,
	`rollback_id` varchar(100),
	`imported_by` int NOT NULL,
	`imported_at` timestamp NOT NULL DEFAULT (now()),
	`rolled_back_at` timestamp,
	CONSTRAINT `import_history_id` PRIMARY KEY(`id`),
	CONSTRAINT `import_history_rollback_id_unique` UNIQUE(`rollback_id`)
);
