CREATE TABLE `goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` enum('performance','development','project','okr') NOT NULL,
	`target_date` date,
	`status` enum('not_started','in_progress','completed','cancelled') DEFAULT 'not_started',
	`progress` int DEFAULT 0,
	`priority` enum('low','medium','high') DEFAULT 'medium',
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peer_review_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`review_id` int NOT NULL,
	`requester_id` int NOT NULL,
	`reviewer_id` int NOT NULL,
	`status` enum('pending','accepted','declined','completed') DEFAULT 'pending',
	`requested_at` timestamp DEFAULT (now()),
	`responded_at` timestamp,
	`completed_at` timestamp,
	CONSTRAINT `peer_review_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `performance_improvement_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`manager_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`status` enum('active','completed','cancelled') DEFAULT 'active',
	`goals` json,
	`progress` text,
	`outcome` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `performance_improvement_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `performance_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`reviewer_id` int NOT NULL,
	`review_cycle_id` int,
	`review_type` enum('self','manager','peer','360') NOT NULL,
	`status` enum('draft','submitted','completed') DEFAULT 'draft',
	`overall_rating` int,
	`strengths` text,
	`areas_for_improvement` text,
	`goals` json,
	`comments` text,
	`submitted_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `performance_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `review_cycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`status` enum('planned','active','completed') DEFAULT 'planned',
	`review_type` enum('annual','quarterly','probation','custom') NOT NULL,
	`description` text,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `review_cycles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `goals` ADD CONSTRAINT `goals_employee_id_users_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `goals` ADD CONSTRAINT `goals_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `peer_review_requests` ADD CONSTRAINT `peer_review_requests_review_id_performance_reviews_id_fk` FOREIGN KEY (`review_id`) REFERENCES `performance_reviews`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `peer_review_requests` ADD CONSTRAINT `peer_review_requests_requester_id_users_id_fk` FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `peer_review_requests` ADD CONSTRAINT `peer_review_requests_reviewer_id_users_id_fk` FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `performance_improvement_plans` ADD CONSTRAINT `performance_improvement_plans_employee_id_users_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `performance_improvement_plans` ADD CONSTRAINT `performance_improvement_plans_manager_id_users_id_fk` FOREIGN KEY (`manager_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `performance_reviews` ADD CONSTRAINT `performance_reviews_employee_id_users_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `performance_reviews` ADD CONSTRAINT `performance_reviews_reviewer_id_users_id_fk` FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `performance_reviews` ADD CONSTRAINT `performance_reviews_review_cycle_id_review_cycles_id_fk` FOREIGN KEY (`review_cycle_id`) REFERENCES `review_cycles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `review_cycles` ADD CONSTRAINT `review_cycles_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;