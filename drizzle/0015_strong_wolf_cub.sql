CREATE TABLE `job_syndications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`provider` varchar(50) NOT NULL,
	`external_job_id` varchar(255) NOT NULL,
	`post_url` text,
	`status` enum('active','closed','expired','error') NOT NULL DEFAULT 'active',
	`posted_at` timestamp NOT NULL DEFAULT (now()),
	`closed_at` timestamp,
	`last_synced_at` timestamp,
	CONSTRAINT `job_syndications_id` PRIMARY KEY(`id`)
);
