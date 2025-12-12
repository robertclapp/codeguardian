CREATE TABLE `background_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidate_id` int NOT NULL,
	`check_id` varchar(100) NOT NULL,
	`package_id` varchar(100) NOT NULL,
	`package_name` varchar(255) NOT NULL,
	`provider` varchar(50) NOT NULL,
	`status` enum('pending','in_progress','completed','disputed','cancelled') NOT NULL DEFAULT 'pending',
	`result` enum('clear','consider','suspended'),
	`price` int NOT NULL,
	`consent_given` int NOT NULL,
	`consent_date` timestamp NOT NULL,
	`initiated_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	`report_url` text,
	`details` text,
	CONSTRAINT `background_checks_id` PRIMARY KEY(`id`),
	CONSTRAINT `background_checks_check_id_unique` UNIQUE(`check_id`)
);
