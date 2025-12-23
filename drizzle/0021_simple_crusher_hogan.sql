CREATE TABLE `job_board_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_name` varchar(255) NOT NULL,
	`company_logo` text,
	`company_description` text,
	`primary_color` varchar(7) DEFAULT '#667eea',
	`custom_domain` varchar(255),
	`enable_applications` int DEFAULT 1,
	`require_resume` int DEFAULT 1,
	`require_cover_letter` int DEFAULT 0,
	`custom_questions` json,
	`footer_text` text,
	`privacy_policy_url` text,
	`terms_of_service_url` text,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_board_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `public_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`first_name` varchar(255) NOT NULL,
	`last_name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`resume_url` text,
	`cover_letter` text,
	`linkedin_url` text,
	`portfolio_url` text,
	`answers` json,
	`source` varchar(100),
	`status` enum('new','reviewing','shortlisted','rejected','hired') DEFAULT 'new',
	`submitted_at` timestamp DEFAULT (now()),
	`reviewed_at` timestamp,
	`reviewed_by` int,
	CONSTRAINT `public_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `public_job_listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`slug` varchar(255) NOT NULL,
	`is_published` int DEFAULT 0,
	`published_at` timestamp,
	`expires_at` timestamp,
	`views` int DEFAULT 0,
	`applications` int DEFAULT 0,
	`meta_title` varchar(255),
	`meta_description` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `public_job_listings_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_job_listings_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `public_applications` ADD CONSTRAINT `public_applications_job_id_jobs_id_fk` FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `public_applications` ADD CONSTRAINT `public_applications_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `public_job_listings` ADD CONSTRAINT `public_job_listings_job_id_jobs_id_fk` FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE no action ON UPDATE no action;